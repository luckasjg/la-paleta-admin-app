// Persistencia local del orden manual de categorías del POS.
// Se guarda en localStorage como array de nombres en minúsculas (case-insensitive).
// Las categorías no presentes en el orden guardado se anexan al final
// preservando su orden original (estable).
const STORAGE_KEY = 'pos_category_order';

export function readCategoryOrder() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(raw) ? raw.map(c => String(c).toLowerCase()) : [];
  } catch {
    return [];
  }
}

export function writeCategoryOrder(orderedNames) {
  try {
    const arr = (orderedNames || []).map(c => String(c).toLowerCase());
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  } catch {
    // ignore
  }
}

// Reordena `categories` según el orden guardado. Estable para los que no aparecen.
export function applyCategoryOrder(categories) {
  const order = readCategoryOrder();
  if (order.length === 0) return categories;
  const indexOf = (c) => {
    const i = order.indexOf(c.toLowerCase());
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };
  return [...categories].sort((a, b) => {
    const ia = indexOf(a);
    const ib = indexOf(b);
    if (ia !== ib) return ia - ib;
    return 0; // estable: conserva orden original cuando ninguno está en la lista
  });
}