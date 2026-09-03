import { base44 } from '@/api/base44Client';
import { cancelPendingRefundsForSale } from '@/lib/cancelRefund';

/**
 * Anula una venta y revierte todo el inventario asociado.
 *
 * Lógica simétrica a la deducción en POS:
 *  - Repone gramos a las bandejas (item.flavors[] o item.tray_id legacy)
 *  - Repone insumos de receta para items de café/merengada
 *  - Repone +1 al utensil_supply_id por cada unidad vendida
 *
 * Marca la venta como status='voided' y guarda auditoría (voided_at, voided_by, void_reason).
 */
export async function voidSale({ sale, reason = '', operatorEmail = '' }) {
  if (!sale) throw new Error('Venta no encontrada');
  if (sale.status === 'voided') throw new Error('Esta venta ya fue anulada');

  // Carga fresca de bandejas, recetas e insumos para no depender de caché obsoleta
  const [trays, recipes, supplies] = await Promise.all([
    base44.entities.Tray.list('-created_date', 200),
    base44.entities.Recipe.list(),
    base44.entities.Supply.list(),
  ]);

  for (const item of (sale.items || [])) {
    const qty = item.quantity || 1;

    // 1) Reponer gramos a bandejas
    const flavorList = (item.flavors && item.flavors.length > 0)
      ? item.flavors
      : (item.tray_id ? [{ tray_id: item.tray_id, grams: item.grams || 0 }] : []);

    for (const fl of flavorList) {
      if (!fl.tray_id) continue;
      const tray = trays.find(t => t.id === fl.tray_id);
      if (!tray) continue;
      const gramsToReturn = (fl.grams || 0) * qty;
      const newRemaining = (tray.remaining_grams || 0) + gramsToReturn;
      await base44.entities.Tray.update(tray.id, {
        remaining_grams: newRemaining,
        // Si estaba agotada y ahora tiene stock, reactivar
        status: newRemaining > 0 ? 'activa' : tray.status,
      });
    }

    // 2) Reponer insumos de receta (café/merengada)
    if ((item.category === 'cafe' || item.category === 'merengada') && item.recipe_id) {
      const recipe = recipes.find(r => r.id === item.recipe_id);
      if (recipe) {
        for (const ing of (recipe.ingredients || [])) {
          const supply = supplies.find(s => s.id === ing.supply_id);
          if (supply && !supply.is_infinite) {
            const amount = (ing.quantity || 0) * qty;
            await base44.entities.Supply.update(supply.id, {
              stock_current: (supply.stock_current || 0) + amount,
            });
          }
        }
      }
    }

    // 3) Reponer utensilio vinculado (+1 por unidad)
    if (item.utensil_supply_id) {
      const utensil = supplies.find(s => s.id === item.utensil_supply_id);
      if (utensil && !utensil.is_infinite) {
        await base44.entities.Supply.update(utensil.id, {
          stock_current: (utensil.stock_current || 0) + qty,
        });
      }
    }
  }

  // 4) Marcar la venta como anulada
  await base44.entities.Sale.update(sale.id, {
    status: 'voided',
    voided_at: new Date().toISOString(),
    voided_by: operatorEmail || '',
    void_reason: reason || '',
  });

  // 5) Eliminar las devoluciones pendientes de esta venta y avisar en #caja
  await cancelPendingRefundsForSale(sale.id, `Venta anulada${reason ? ` — ${reason}` : ''}`);
}