import React, { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import TVHeader from '@/components/tv/TVHeader';
import FlavorCard from '@/components/tv/FlavorCard';

const POLL_MS = 30000;

/**
 * Pantalla TV vertical (9:16) — Sabores en vitrina.
 * Muestra bandejas activas ordenadas por fecha de producción (más nueva arriba).
 */
export default function TVSabores() {
  const [trays, setTrays] = useState([]);
  const [recipes, setRecipes] = useState([]);

  const fetchData = useCallback(async () => {
    try {
      const [traysData, recipesData] = await Promise.all([
        base44.entities.Tray.list('-production_date', 200),
        base44.entities.Recipe.list(),
      ]);
      setTrays(
        (traysData || []).filter(
          (t) => t.status === 'activa' && (t.remaining_grams || 0) > 0 && t.in_vitrine === true
        )
      );
      setRecipes(recipesData || []);
    } catch {
      // Fallo de red puntual: se mantiene lo último cargado y se reintenta en el próximo ciclo.
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, POLL_MS);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Dedupe por nombre de receta, conservando la bandeja más reciente
  const uniqueFlavors = Array.from(
    new Map(trays.map((t) => [t.recipe_name, t])).values()
  ).sort((a, b) =>
    (a.recipe_name || '').localeCompare(b.recipe_name || '', 'es', { sensitivity: 'base' })
  );

  // Enriquecer con datos de la receta (imagen y tag)
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
    <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-gradient-to-br from-[#1a0e0a] via-[#2a1410] to-[#0f0806] text-white flex flex-col">
      <TVHeader title="Vitrina del día" subtitle="Sabores Disponibles" />

      <section className="flex-1 px-8 py-6 overflow-hidden">
        <h2 className="text-3xl font-black mb-5 text-amber-100 flex items-center gap-3">
          <span className="w-2 h-9 bg-amber-400 rounded-full" />
          Sabores Disponibles Hoy
        </h2>

        {flavors.length === 0 ? (
          <div className="flex items-center justify-center h-2/3">
            <p className="text-2xl text-amber-200/40">Preparando sabores...</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {flavors.map((f) => (
              <FlavorCard key={f.id} name={f.name} imageUrl={f.imageUrl} tag={f.tag} />
            ))}
          </div>
        )}
      </section>

      <footer className="px-8 py-3 border-t border-amber-500/20 bg-black/40 text-center flex-shrink-0">
        <p className="text-[10px] text-amber-300/50 uppercase tracking-[0.4em]">
          Síguenos en instagram · @lapaletacafe
        </p>
      </footer>
    </div>
  );
}