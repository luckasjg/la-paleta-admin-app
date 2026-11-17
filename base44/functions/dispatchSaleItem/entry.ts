import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

// Despacha un ítem pendiente de una venta por unidades: cada unidad trae sus
// bandejas; la línea se divide en ítems de cantidad 1 y cada bandeja se
// descuenta una sola vez con los gramos acumulados (se permite negativo).
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { sale_id, item_index } = body;
    const units = Array.isArray(body.units) ? body.units : (Array.isArray(body.tray_ids) ? null : undefined);
    if (!sale_id || !Number.isInteger(item_index) || units === undefined) {
      return Response.json({ error: 'Datos inválidos' }, { status: 400 });
    }

    const db = base44.asServiceRole.entities;
    const sale = await db.Sale.get(sale_id).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    if (!sale) return Response.json({ error: 'Venta no encontrada' }, { status: 404 });
    if (sale.status !== 'completed') return Response.json({ error: 'La venta fue anulada' }, { status: 400 });

    const items = [...(sale.items || [])];
    const item = items[item_index];
    if (!item || !item.pending_dispatch) return Response.json({ error: 'Este ítem ya fue despachado' }, { status: 400 });

    const qty = item.quantity || 1;
    // Compatibilidad: tray_ids (misma selección para todas las unidades)
    const unitList = units || Array.from({ length: qty }, () => body.tray_ids);
    if (unitList.length !== qty || unitList.some((u) => !Array.isArray(u) || u.length === 0 || u.length > 5)) {
      return Response.json({ error: 'Cada unidad necesita entre 1 y 5 sabores' }, { status: 400 });
    }

    const allIds = [...new Set(unitList.flat())];
    const trays = await db.Tray.filter({ id: { $in: allIds } });
    const list = Array.isArray(trays) ? trays : trays.items;
    if (list.length !== allIds.length) return Response.json({ error: 'Bandeja no encontrada' }, { status: 400 });

    const gramsPerUnit = item.grams || 80;
    const demand = {};
    // Recargo ya cobrado en caja por cada unidad (por unidad si existe, si no el promedio legado).
    const paidFor = (i) => (Array.isArray(item.unit_surcharges) && item.unit_surcharges[i] != null
      ? item.unit_surcharges[i] : (item.flavor_surcharge || 0));
    // Toppings de cada unidad viajan con ella (y su cupo pendiente, si queda).
    const unitToppingFields = (idx) => {
      if (!Array.isArray(item.unit_toppings)) return {};
      const ut = item.unit_toppings[idx] || [];
      const pend = Math.max(0, (item.included_toppings_count || 0) - ut.filter((t) => t.included).length);
      return { unit_toppings: [ut], unit_topping_extras: [item.unit_topping_extras?.[idx] || 0], pending_toppings: pend > 0, pending_included_toppings: pend };
    };
    const newItems = unitList.map((ids, idx) => {
      const g = +(gramsPerUnit / ids.length).toFixed(2);
      const ordered = ids.map((id) => list.find((t) => t.id === id));
      ordered.forEach((t) => { demand[t.id] = (demand[t.id] || 0) + g; });
      return {
        ...item,
        quantity: 1,
        subtotal: +((item.subtotal || 0) / qty).toFixed(2),
        ...(item.subtotal_eur != null ? { subtotal_eur: +(item.subtotal_eur / qty).toFixed(2) } : {}),
        ...(item.bonus_free_qty ? { bonus_free_qty: +(item.bonus_free_qty / qty).toFixed(4) } : {}),
        pending_dispatch: false,
        flavors: ordered.map((t) => ({ tray_id: t.id, recipe_name: t.recipe_name, grams: g })),
        unit_flavors: [ordered.map((t) => ({ tray_id: t.id, recipe_name: t.recipe_name, grams: g }))],
        unit_surcharges: [paidFor(idx)],
        tray_id: ordered[0].id,
        flavor: ordered.map((t) => t.recipe_name).join(' + '),
        ...unitToppingFields(idx),
        ...(item.toppings_cost ? { toppings_cost: +(item.toppings_cost / qty).toFixed(4) } : {}),
        ...(item.promo_discount ? { promo_discount: +(item.promo_discount / qty).toFixed(2) } : {}),
      };
    });

    // Marcar la venta primero evita doble descuento si se reintenta.
    items.splice(item_index, 1, ...newItems);
    const stillPending = items.some((i) => i.pending_dispatch === true || i.pending_toppings === true);
    await db.Sale.update(sale.id, { items, dispatch_status: stillPending ? 'pendiente' : 'despachado' });

    await Promise.all(list.map((tray) => {
      const newRemaining = (tray.remaining_grams || 0) - demand[tray.id];
      return db.Tray.update(tray.id, {
        remaining_grams: newRemaining,
        status: newRemaining <= 0 ? 'agotada' : 'activa',
        ...(newRemaining <= 0 ? { in_vitrine: false, closed_at: new Date().toISOString() } : {}),
      });
    }));

    // Recargo premium: diferencia entre lo servido y lo ya cobrado en caja.
    let surchargeDue = 0;
    const premiumNames = new Set();
    if (!item.is_courtesy) {
      const recipes = await db.Recipe.list();
      const rateOf = (t) => {
        const r = recipes.find((x) => (t.recipe_id && x.id === t.recipe_id) || x.name === t.recipe_name);
        if (!r || (r.flavor_tag || 'Regular') === 'Regular') return 0;
        return r.surcharge_per_gram || 0;
      };
      newItems.forEach((ni, idx) => {
        const paidPerUnit = paidFor(idx);
        const due = ni.flavors.reduce((s, f) => {
          const t = list.find((x) => x.id === f.tray_id);
          const rate = rateOf(t);
          if (rate > 0) premiumNames.add(t.recipe_name);
          return s + f.grams * rate;
        }, 0);
        surchargeDue += Math.max(0, due - paidPerUnit);
      });
      surchargeDue = +surchargeDue.toFixed(2);
      if (surchargeDue > 0.005) {
        await db.PremiumSurchargeCharge.create({
          sale_id: sale.id,
          ticket_number: sale.ticket_number,
          customer_id: sale.customer_id,
          customer_name: sale.customer_name,
          customer_cedula: sale.customer_cedula,
          product_name: item.product_name,
          flavors_detail: [...premiumNames].join(' + '),
          amount_usd: surchargeDue,
          status: 'pendiente',
          origin_cash_register_id: sale.cash_register_id,
          dispatched_by: user.full_name || user.email,
        });
      } else surchargeDue = 0;
    }

    return Response.json({ ok: true, dispatch_status: stillPending ? 'pendiente' : 'despachado', surcharge_due: surchargeDue });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}