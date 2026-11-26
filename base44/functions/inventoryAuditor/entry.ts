import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { secrets } from 'base44:runtime';
import { buildFindings, shouldNotify, slackText, stockAt, TYPE_LABEL } from '../../shared/inventoryAuditRules.ts';

const MASTER_ADMINS = ['luckasjimenez@gmail.com'];
const DAY = 864e5;
const canManage = (u) => ['admin', 'gerente'].includes(u.role) || MASTER_ADMINS.includes((u.email || '').toLowerCase());

async function listAll(entity, query, sort, max = 3000) {
  const out = [];
  let cursor = null;
  do {
    const page = await entity.filter(query, { sort, limit: 500, ...(cursor ? { cursor } : {}) });
    out.push(...(page.items || []));
    cursor = page.has_more ? page.next_cursor : null;
  } while (cursor && out.length < max);
  return out;
}

async function loadData(db) {
  const since = new Date(Date.now() - 10 * DAY).toISOString();
  const [supplies, recipes, products, preparations, sales, adjustments] = await Promise.all([
    listAll(db.Supply, {}, 'name'),
    listAll(db.Recipe, {}, 'name'),
    listAll(db.Product, {}, 'name'),
    listAll(db.Preparation, {}, 'name'),
    listAll(db.Sale, { status: 'completed', sale_date: { $gte: since } }, '-sale_date'),
    listAll(db.InventoryAdjustment, { created_date: { $gte: since } }, '-created_date', 1500),
  ]);
  return { supplies, recipes, products, preparations, sales, adjustments };
}

function slackUrl() {
  try { return secrets.get('SLACK_WEBHOOK_URL') || ''; } catch (_) { return ''; }
}

async function sendSlack(text) {
  const url = slackUrl();
  if (!url) return false;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Slack respondió ${res.status}`);
  return true;
}

const counts = (findings) => findings.reduce((m, f) => ({ ...m, [f.type]: (m[f.type] || 0) + 1 }), {});

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const action = body.action || 'run';
    const manager = canManage(user);
    if (action !== 'notify' && !manager) return Response.json({ error: 'Solo administradores y gerentes' }, { status: 403 });

    const db = base44.asServiceRole.entities;
    const approver = user.full_name || user.email;

    if (action === 'correct') {
      const { supply_id, mode, location, value, reason, finding_key } = body;
      if (!supply_id || !['zero', 'physical'].includes(mode)) return Response.json({ error: 'supply_id y mode son requeridos' }, { status: 400 });
      const note = String(reason || '').trim().slice(0, 500);
      if (mode === 'physical' && (!['warehouse', 'production'].includes(location) || !Number.isFinite(Number(value)) || Number(value) < 0 || !note)) {
        return Response.json({ error: 'Ubicación, valor físico (≥ 0) y motivo son requeridos' }, { status: 400 });
      }
      const s = await db.Supply.get(supply_id).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
      if (!s) return Response.json({ error: 'Insumo no encontrado' }, { status: 404 });

      const before = { warehouse: stockAt(s, 'warehouse'), production: stockAt(s, 'production') };
      const after = mode === 'zero' ? { warehouse: 0, production: 0 } : { ...before, [location]: Number(value) };
      const changed = ['warehouse', 'production'].filter(l => Math.abs(after[l] - before[l]) > 1e-9);
      if (!changed.length) return Response.json({ ok: true, adjustments: 0 });

      await db.Supply.update(s.id, {
        stock_warehouse: after.warehouse,
        stock_production: after.production,
        stock_current: after.warehouse + after.production,
      });
      const detail = mode === 'zero'
        ? `Confirmado agotado desde el Auditor (residual de empaque).${note ? ' ' + note : ''}`
        : `Ajuste a stock físico desde el Auditor: ${note}`;
      await db.InventoryAdjustment.bulkCreate(changed.map(l => {
        const delta = after[l] - before[l];
        return {
          type: 'audit_correction', reference_id: s.id, reference_name: s.name,
          supply_id: s.id, supply_name: s.name, unit: s.unit, category: s.category || '',
          location: l, quantity_change: delta, stock_before: before[l], stock_after: after[l],
          reason: 'correccion_auditoria', notes: `${detail} · Aprobado por ${approver}`,
          reference_label: 'Auditor de Inventario', is_correction: true,
          unit_cost: s.cost_per_unit || 0, total_cost: +(delta * (s.cost_per_unit || 0)).toFixed(4),
          approved_by: approver, approved_by_email: user.email, audit_finding_key: finding_key || '',
        };
      }));
      return Response.json({ ok: true, adjustments: changed.length });
    }

    if (action === 'silence') {
      if (!body.supply_id) return Response.json({ error: 'supply_id es requerido' }, { status: 400 });
      await db.Supply.update(body.supply_id, { ignore_overstock_alert: body.value !== false });
      return Response.json({ ok: true });
    }

    const data = await loadData(db);
    const findings = buildFindings(data);

    if (action === 'run') {
      return Response.json({ findings, counts: counts(findings), generated_at: new Date().toISOString(), slack_configured: !!slackUrl() });
    }

    if (action === 'notify') {
      if (!slackUrl()) return Response.json({ sent: 0, slack_configured: false });
      const candidates = findings.filter(shouldNotify);
      if (!candidates.length) return Response.json({ sent: 0 });
      const logs = await db.AuditAlertLog.filter({ finding_key: { $in: candidates.map(f => f.key) } }, { limit: 500 });
      const byKey = new Map((logs.items || []).map(l => [l.finding_key, l]));
      const cutoff = Date.now() - DAY;
      const fresh = candidates.filter(f => !byKey.has(f.key) || new Date(byKey.get(f.key).last_notified_at).getTime() < cutoff);
      if (!fresh.length) return Response.json({ sent: 0 });
      await sendSlack(slackText(fresh, `🕵️ *Auditor de Inventario*: ${fresh.length} hallazgo(s) nuevo(s)`));
      const nowIso = new Date().toISOString();
      const toUpdate = fresh.filter(f => byKey.has(f.key)).map(f => ({ id: byKey.get(f.key).id, last_notified_at: nowIso, notify_count: (byKey.get(f.key).notify_count || 1) + 1 }));
      const toCreate = fresh.filter(f => !byKey.has(f.key)).map(f => ({ finding_key: f.key, finding_type: f.type, title: f.title, last_notified_at: nowIso, notify_count: 1 }));
      if (toUpdate.length) await db.AuditAlertLog.bulkUpdate(toUpdate);
      if (toCreate.length) await db.AuditAlertLog.bulkCreate(toCreate);
      return Response.json({ sent: fresh.length });
    }

    if (action === 'summary') {
      if (!slackUrl()) return Response.json({ error: 'Falta configurar SLACK_WEBHOOK_URL' }, { status: 400 });
      const text = findings.length
        ? slackText(findings, `📋 *Resumen de auditoría de inventario* (solicitado por ${approver}): ${findings.length} hallazgo(s)`)
        : `📋 *Resumen de auditoría de inventario*: sin hallazgos. Todo en orden.`;
      await sendSlack(text);
      return Response.json({ ok: true, total: findings.length });
    }

    if (action === 'ask') {
      const question = String(body.question || '').trim().slice(0, 1000);
      if (!question) return Response.json({ error: 'Escribe una pregunta' }, { status: 400 });
      const history = (Array.isArray(body.history) ? body.history : []).slice(-6)
        .map(m => `${m.role === 'user' ? 'Usuario' : 'Auditor'}: ${String(m.content || '').slice(0, 1500)}`).join('\n');
      const supplySummary = data.supplies.map(s => ({
        nombre: s.name, categoria: s.category || '', sector: s.sector, unidad: s.unit,
        almacen: +stockAt(s, 'warehouse').toFixed(2), produccion: +stockAt(s, 'production').toFixed(2),
        minimo: s.stock_minimum || 0, infinito: !!s.is_infinite, silenciado: !!s.ignore_overstock_alert,
      }));
      const recent = data.adjustments.slice(0, 60).map(a => ({
        fecha: a.created_date, tipo: a.type, origen: a.reference_label || a.reason, insumo: a.supply_name || a.reference_name,
        cambio: a.quantity_change, antes: a.stock_before, despues: a.stock_after, ubicacion: a.location,
      }));
      const context = {
        fecha_actual: new Date().toISOString(),
        hallazgos: findings.map(f => ({ tipo: TYPE_LABEL[f.type], gravedad: f.severity, titulo: f.title, detalle: f.detail })),
        catalogo_sin_insumos: findings.filter(f => f.type === 'unlinked_catalog_items').map(f => ({ nombre: f.name, ventas_7_dias: f.sold, topping: f.is_topping })),
        insumos: supplySummary,
        ultimos_movimientos: recent,
        nota: 'Las ventas del POS descuentan insumos directamente sin crear movimientos de ajuste; los movimientos listados son producción, ingresos, conteos y correcciones.',
      };
      const prompt = `Eres el Auditor de Inventario de una heladería artesanal (La Paleta). Responde en español, claro y concreto, usando ÚNICAMENTE los datos del contexto JSON. Si un dato no está en el contexto, dilo. No inventes cifras. No puedes modificar el inventario: si algo requiere corrección, sugiere qué acción tomar en el panel del Auditor (Confirmar agotado, Ajustar stock físico, Vincular receta/insumos o Silenciar insumo). Usa listas cortas y negritas para nombres. Unidades base: g, ml o unidad.

CONTEXTO:
${JSON.stringify(context)}

${history ? `CONVERSACIÓN PREVIA:\n${history}\n\n` : ''}PREGUNTA: ${question}`;
      const answer = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt });
      return Response.json({ answer: typeof answer === 'string' ? answer : JSON.stringify(answer) });
    }

    return Response.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}