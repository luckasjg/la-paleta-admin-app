/**
 * Fuente única de verdad para saber de QUÉ bandejas y CUÁNTOS gramos se mueve
 * inventario por un ítem de venta (descuento al cobrar, reposición al anular
 * y advertencias de stock en el carrito).
 *
 * Regla: si el ítem trae `flavors`, ese desglose manda — un helado de 2 o 3
 * sabores descuenta de cada bandeja su porción.
 * El campo legacy `tray_id` (una sola bandeja con TODOS los gramos) sólo se usa
 * para ítems genuinamente de un solo sabor; en un multi-sabor sin desglose
 * volcaría todo el peso sobre la primera bandeja, así que se omite.
 */

/** Detecta un ítem multi-sabor por su etiqueta ("Sabor A + Sabor B"). */
function looksMultiFlavor(item) {
  return typeof item?.flavor === 'string' && item.flavor.includes(' + ');
}

/**
 * @returns {Array<{tray_id: string, grams: number}>} gramos por bandeja (sin multiplicar por cantidad)
 */
export function getTrayPortions(item) {
  if (!item) return [];

  if (Array.isArray(item.flavors) && item.flavors.length > 0) {
    return item.flavors
      .filter(f => f?.tray_id)
      .map(f => ({ tray_id: f.tray_id, grams: parseFloat(f.grams) || 0 }));
  }

  if (!item.tray_id) return [];

  if (looksMultiFlavor(item)) {
    console.warn(
      `[inventario] Ítem multi-sabor sin desglose por bandeja ("${item.flavor}"): se omite el movimiento de bandejas para no descontar todo de una sola.`
    );
    return [];
  }

  return [{ tray_id: item.tray_id, grams: parseFloat(item.grams) || 0 }];
}

/**
 * Suma los gramos demandados por bandeja en una lista de ítems,
 * multiplicando por la cantidad de cada ítem.
 * @returns {Record<string, number>} tray_id -> gramos totales
 */
export function aggregateTrayDemand(items = []) {
  const demand = {};
  for (const item of items) {
    const qty = item.quantity || 1;
    for (const p of getTrayPortions(item)) {
      demand[p.tray_id] = (demand[p.tray_id] || 0) + p.grams * qty;
    }
  }
  return demand;
}