import { useCallback, useMemo, useState } from 'react';

/**
 * Carrito del menú móvil del cliente. Solo vive en memoria del navegador:
 * no toca inventario — el descuento ocurre cuando el operador cobra en el POS.
 */
export function useMobileCart() {
  const [items, setItems] = useState([]);

  const addProduct = useCallback((product) => {
    setItems((prev) => {
      const key = product.id;
      const existing = prev.find((it) => it.key === key);
      if (existing) {
        return prev.map((it) =>
          it.key === key
            ? { ...it, quantity: it.quantity + 1, subtotal: (it.quantity + 1) * it.unit_price }
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
          unit_price: product.price || 0,
          quantity: 1,
          subtotal: product.price || 0,
          flavor: '',
          requires_flavor: product.requires_flavor === true,
        },
      ];
    });
  }, []);

  const setQuantity = useCallback((key, quantity) => {
    setItems((prev) =>
      quantity <= 0
        ? prev.filter((it) => it.key !== key)
        : prev.map((it) =>
            it.key === key ? { ...it, quantity, subtotal: quantity * it.unit_price } : it
          )
    );
  }, []);

  const setFlavor = useCallback((key, flavor) => {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, flavor } : it)));
  }, []);

  const removeItem = useCallback((key) => {
    setItems((prev) => prev.filter((it) => it.key !== key));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const total = useMemo(() => items.reduce((sum, it) => sum + it.subtotal, 0), [items]);
  const count = useMemo(() => items.reduce((sum, it) => sum + it.quantity, 0), [items]);

  return { items, total, count, addProduct, setQuantity, setFlavor, removeItem, clear };
}