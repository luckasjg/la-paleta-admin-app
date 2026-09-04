import React, { useState, useEffect } from 'react';
import CategoryAccordion from '@/components/menu/CategoryAccordion';

/** Carta y precios agrupados por categoría, desplegables tipo acordeón. */
export default function ProductCatalog({ productsByCategory, onAdd }) {
  const categories = Object.keys(productsByCategory);
  const [openCategory, setOpenCategory] = useState(null);

  // Abre la primera categoría en cuanto hay datos, sin cerrar la elección del cliente.
  useEffect(() => {
    setOpenCategory((prev) => (prev && categories.includes(prev) ? prev : categories[0] || null));
  }, [categories.join('|')]);

  return (
    <div className="pt-[3px]">
      {categories.map((cat) => (
        <CategoryAccordion
          key={cat}
          category={cat}
          items={productsByCategory[cat]}
          isOpen={openCategory === cat}
          onToggle={() => setOpenCategory((prev) => (prev === cat ? null : cat))}
          onAdd={onAdd}
        />
      ))}
    </div>
  );
}