import React, { useState, useEffect, useRef, useCallback } from 'react';
import CategoryTabs from '@/components/menu/CategoryTabs';
import ProductCard from '@/components/menu/ProductCard';

/**
 * Carta y precios: barra sticky de categorías + tarjetas visuales por sección.
 * Al tocar una categoría salta suavemente a su sección; al scrollear se marca la activa.
 */
export default function ProductCatalog({ productsByCategory, onAdd }) {
  const categories = Object.keys(productsByCategory);
  const [activeCategory, setActiveCategory] = useState(categories[0] || null);
  const sectionRefs = useRef({});
  const isJumping = useRef(false);

  const catKey = categories.join('|');

  useEffect(() => {
    setActiveCategory((prev) => (prev && categories.includes(prev) ? prev : categories[0] || null));
  }, [catKey]);

  // Marca la categoría activa según la sección más cercana al tope visible.
  useEffect(() => {
    const onScroll = () => {
      if (isJumping.current) return;
      let current = categories[0];
      for (const cat of categories) {
        const el = sectionRefs.current[cat];
        if (el && el.getBoundingClientRect().top <= 110) current = cat;
      }
      setActiveCategory((prev) => (prev === current ? prev : current));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [catKey]);

  const handleSelect = useCallback((cat) => {
    const el = sectionRefs.current[cat];
    if (!el) return;
    setActiveCategory(cat);
    isJumping.current = true;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 72, behavior: 'smooth' });
    setTimeout(() => { isJumping.current = false; }, 700);
  }, []);

  if (categories.length === 0) return null;

  return (
    <div>
      <CategoryTabs
        categories={categories}
        activeCategory={activeCategory}
        onSelect={handleSelect}
      />

      {categories.map((cat) => (
        <section
          key={cat}
          ref={(el) => { sectionRefs.current[cat] = el; }}
          className="scroll-mt-20 pt-5"
        >
          <h3 className="mb-3 text-[17px] font-[950] leading-none tracking-[-0.03em] text-[#24252b]">
            {cat}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {productsByCategory[cat].map((p) => (
              <ProductCard key={p.id} product={p} onAdd={onAdd} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}