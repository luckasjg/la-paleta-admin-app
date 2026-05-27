// stockHelpers.js
// Utilidades centralizadas para el sistema multi-almacén (warehouse / production).
//
// MODELO DE DATOS:
// - Cada Supply mantiene DOS columnas independientes: stock_warehouse y stock_production.
// - stock_current se conserva como ESPEJO de la suma (warehouse + production)
//   para no romper consultas legacy (dashboard, auditorías, alertas, etc.).
//
// REGLA DE ORO: nunca tocar stock_warehouse/stock_production sin actualizar también stock_current.
// Estas helpers garantizan ese invariante.

export const LOCATIONS = [
  { value: 'production', label: 'Laboratorio de Producción' },
  { value: 'warehouse', label: 'Almacén / Depósito Principal' },
];

export const LOCATION_LABEL = {
  warehouse: 'Almacén',
  production: 'Producción',
};

/**
 * Lee el stock disponible en una ubicación específica.
 * Si la ubicación no existe (datos legacy sin migrar), usa stock_current como fallback.
 */
export function getStockAt(supply, location) {
  if (!supply) return 0;
  if (location === 'warehouse') {
    return Number.isFinite(supply.stock_warehouse) ? supply.stock_warehouse : 0;
  }
  if (location === 'production') {
    return Number.isFinite(supply.stock_production) ? supply.stock_production : 0;
  }
  return 0;
}

/**
 * Devuelve el total (warehouse + production). Usa los campos nuevos cuando existen,
 * con fallback a stock_current para items aún no migrados.
 */
export function getStockTotal(supply) {
  if (!supply) return 0;
  const hasNew =
    Number.isFinite(supply.stock_warehouse) || Number.isFinite(supply.stock_production);
  if (hasNew) {
    return (supply.stock_warehouse || 0) + (supply.stock_production || 0);
  }
  return supply.stock_current || 0;
}

/**
 * Construye el payload de update para mover stock en una ubicación específica.
 * Mantiene el espejo stock_current sincronizado.
 *
 * @param {Object} supply - El insumo actual (con sus valores vigentes)
 * @param {'warehouse'|'production'} location - Ubicación a modificar
 * @param {number} delta - Cantidad a sumar (positivo) o restar (negativo)
 * @returns {Object} payload listo para Supply.update()
 */
export function buildStockDelta(supply, location, delta) {
  const wh = Number.isFinite(supply.stock_warehouse) ? supply.stock_warehouse : 0;
  const pr = Number.isFinite(supply.stock_production) ? supply.stock_production : 0;

  let newWh = wh;
  let newPr = pr;
  if (location === 'warehouse') newWh = wh + delta;
  else if (location === 'production') newPr = pr + delta;

  return {
    stock_warehouse: newWh,
    stock_production: newPr,
    stock_current: newWh + newPr,
  };
}

/**
 * Payload para una transferencia interna (warehouse → production o viceversa).
 */
export function buildTransferDelta(supply, fromLocation, toLocation, quantity) {
  const wh = Number.isFinite(supply.stock_warehouse) ? supply.stock_warehouse : 0;
  const pr = Number.isFinite(supply.stock_production) ? supply.stock_production : 0;

  let newWh = wh;
  let newPr = pr;
  if (fromLocation === 'warehouse') newWh -= quantity;
  else if (fromLocation === 'production') newPr -= quantity;
  if (toLocation === 'warehouse') newWh += quantity;
  else if (toLocation === 'production') newPr += quantity;

  return {
    stock_warehouse: newWh,
    stock_production: newPr,
    stock_current: newWh + newPr,
  };
}

/**
 * Payload para SET absoluto del stock en una ubicación (usado por ajustes/edición manual).
 */
export function buildSetStockAt(supply, location, newValue) {
  const wh = Number.isFinite(supply.stock_warehouse) ? supply.stock_warehouse : 0;
  const pr = Number.isFinite(supply.stock_production) ? supply.stock_production : 0;

  const finalWh = location === 'warehouse' ? newValue : wh;
  const finalPr = location === 'production' ? newValue : pr;

  return {
    stock_warehouse: finalWh,
    stock_production: finalPr,
    stock_current: finalWh + finalPr,
  };
}