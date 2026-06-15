import React, { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import TVHeader from '@/components/tv/TVHeader';
import FlavorCard from '@/components/tv/FlavorCard';

const POLL_MS = 30000;

/**
 * Pantalla TV vertical (9:16) — Especiales / Premium / Sorbete.
 * Muestra solo bandejas activas cuya receta sea Premium o Sorbete,
 * ordenadas por fecha de producción.
 */
export default function TVEspeciales() {
  const [trays, setTrays] = useState([]);
  const [recipes, setRecipes] = useState([]);

  const fetchData = useCallback(async () => {
    const [traysData, recipesData] = await Promise.all([
      base44.entities.Tray.list('-production_date', 200),
      base44.entities.Recipe.list(),
    ]);
    setTrays(
      (traysData || []).filter(
        (t) => t.status === 'activa' && (t.remaining_grams || 0) > 0
      )
    );
    setRecipes(recipesData || []);
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, POLL_MS);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Solo recetas Premium o Sorbete
  const specialRecipeIds = new Set(
    recipes
      .filter((r) => r.flavor_tag === 'Premium' || r.flavor_tag === 'Sorbete')
      .map((r) => r.id)
  );

  const uniqueFlavors = Array.from(
    new Map(
      trays
        .filter((t) => specialRecipeIds.has(t.recipe_id))
        .map((t) => [t.recipe_name, t])
    ).values()
  );

  const flavors = uniqueFlavors.map((t) => {
    const recipe = recipes.find((r) => r.id === t.recipe_id);
    return {
      id: t.id,
      name: t.recipe_name,
      imageUrl: recipe?.image_url,
      tag: recipe?.flavor_tag,
    };
  });

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-gradient-to-br from-[#1a0805] via-[#3a1408] to-[#0f0402] text-white flex flex-col">
      <TVHeader title="Especiales" subtitle="Premium · Sorbete" />

      <section className="flex-1 px-8 py-6 overflow-hidden">
        <h2 className="text-3xl font-black mb-5 text-amber-100 flex items-center gap-3">
          <span className="w-2 h-9 bg-amber-400 rounded-full" />
          Sabores Especiales
        </h2>

        {flavors.length === 0 ? (
          <div className="flex items-center justify-center h-2/3">
            <p className="text-2xl text-amber-200/40">Hoy sin especiales</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5">
            {flavors.map((f) => (
              <FlavorCard key={f.id} name={f.name} imageUrl={f.imageUrl} tag={f.tag} />
            ))}
          </div>
        )}
      </section>

      <footer className="px-8 py-3 border-t border-amber-500/20 bg-black/40 text-center flex-shrink-0">
        <p className="text-[10px] text-amber-300/50 uppercase tracking-[0.4em]">
          Edición limitada · Pregunta por el sabor del día
        </p>
      </footer>
    </div>
  );
}