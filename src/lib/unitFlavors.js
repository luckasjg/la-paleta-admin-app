/**
 * Sabores por unidad física de un ítem (`unit_flavors`).
 * Cada posición es una unidad con su propio array de sabores
 * ({ tray_id, recipe_name, grams }). Ítems antiguos sin `unit_flavors`
 * se interpretan con `flavors` como la Unidad 1 y el resto vacías.
 */
export function getUnitFlavors(item, qty = item?.quantity || 1) {
  const src = Array.isArray(item?.unit_flavors) ? item.unit_flavors : [item?.flavors || []];
  return Array.from({ length: qty }, (_, i) => (Array.isArray(src[i]) ? src[i] : []));
}

export function unitNames(flavors = []) {
  return flavors.map(f => f.recipe_name).filter(Boolean).join(' + ');
}

/** Etiqueta legible para comanda / despacho. */
export function unitsLabel(units = []) {
  if (units.length <= 1) return unitNames(units[0] || []);
  if (units.every(u => u.length === 0)) return '';
  return units.map((u, i) => `U${i + 1}: ${unitNames(u) || 'por elegir'}`).join(' · ');
}