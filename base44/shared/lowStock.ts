// Lógica compartida de stock bajo: detección y formato de mensajes.

export const LOW_STOCK_CHANNEL = 'general';

// Total = almacén + producción (con respaldo en stock_current para insumos no migrados).
export const stockTotal = (s) => {
  const hasNew = Number.isFinite(s.stock_warehouse) || Number.isFinite(s.stock_production);
  return hasNew ? (Number(s.stock_warehouse) || 0) + (Number(s.stock_production) || 0) : (Number(s.stock_current) || 0);
};

export const isBelowMinimum = (supply) => {
  if (!supply || supply.is_infinite) return false;
  const min = Number(supply.stock_minimum) || 0;
  if (min <= 0) return false;
  return stockTotal(supply) <= min;
};

const fmt = (n) => {
  const v = Number(n) || 0;
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
};

export const supplyLine = (s) => {
  const min = Number(s.stock_minimum) || 0;
  const cur = stockTotal(s);
  const unit = s.unit || '';
  return `• *${s.name}* — quedan ${fmt(cur)} ${unit} (mínimo ${fmt(min)} ${unit}) · faltan *${fmt(min - cur)} ${unit}*`;
};

export const singleAlertText = (s) =>
  `⚠️ *Stock bajo el mínimo*\n${supplyLine(s)}`;

export const summaryText = (supplies) =>
  `📉 *Resumen diario de inventario bajo* — ${supplies.length} insumo(s) por debajo del mínimo\n` +
  supplies.map(supplyLine).join('\n');