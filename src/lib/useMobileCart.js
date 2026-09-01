import { useCallback, useMemo, useState } from 'react';

/**
 * Carrito del menú móvil del cliente. Solo vive en memoria del navegador:
 * no toca inventario — el descuento ocurre cuando el operador cobra en el POS.
 */
const buildKey = (productId, flavors, vessel) => {
  const flavorPart = (flavors || []).map((f) => `${f.tray_id}:${f.grams}`).join('+');
  return `${productId}|${flavorPart}|${vessel || ''}`;
};

export function useMobileCart() {
  const [items, setItems] = useState([]);

  /**
   * @param product producto del catálogo
   * @param options { flavors: [{tray_id, recipe_name, grams}], surcharge, vessel }
   */
  const addProduct = useCallback((product, options = {}) => {
    const flavors = options.flavors || [];
    const vessel = options.vessel || null;
    const surcharge = +(options.surcharge || 0).toFixed(2);
    const basePrice = product.price || 0;
    const unitPrice = +(basePrice + surcharge).toFixed(2);
    const key = buildKey(product.id, flavors, vessel);

    setItems((prev) => {
      const existing = prev.find((it) => it.key === key);
      if (existing) {
        return prev.map((it) =>
          it.key === key
            ? { ...it, quantity: it.quantity + 1, subtotal: +((it.quantity + 1) * it.unit_price).toFixed(2) }
            : it
        );
      }
      return [
        ...prev,
        {
          key,
          product_id: product.id,
          product_name: product.size_label
            ? `${product.name} ${product.size_label}`
            : product.name,
          base_price: basePrice,
          flavor_surcharge: surcharge,
          unit_price: unitPrice,
          quantity: 1,
          subtotal: unitPrice,
          flavors,
          flavor: flavors.map((f) => f.recipe_name).filter(Boolean).join(' + '),
          vessel,
          grams: product.grams_per_serving || 0,
        },
      ];
    });
  }, []);

  const setQuantity = useCallback((key, quantity) => {
    setItems((prev) =>
      quantity <= 0
        ? prev.filter((it) => it.key !== key)
        : prev.map((it) =>
            it.key === key
              ? { ...it, quantity, subtotal: +(quantity * it.unit_price).toFixed(2) }
              : it
          )
    );
  }, []);

  const removeItem = useCallback((key) => {
    setItems((prev) => prev.filter((it) => it.key !== key));
  }, []);

  /** Elimina los ítems cuyo product_id ya no está permitido y devuelve cuántos quitó. */
  const removeUnavailable = useCallback((allowedProductIds) => {
    let removed = 0;
    setItems((prev) => {
      const next = prev.filter((it) => allowedProductIds.includes(it.product_id));
      removed = prev.length - next.length;
      return next;
    });
    return removed;
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const total = useMemo(
    () => +items.reduce((sum, it) => sum + it.subtotal, 0).toFixed(2),
    [items]
  );
  const count = useMemo(() => items.reduce((sum, it) => sum + it.quantity, 0), [items]);

  return { items, total, count, addProduct, setQuantity, removeItem, removeUnavailable, clear };
}