import React from 'react';
import { Layers, GitBranch } from 'lucide-react';

/** Base Maestra → lista de derivados. Derivado → referencia a su base y gramos por bandeja. */
export default function FormulationLinks({ recipe, baseRecipe, derived }) {
  if (recipe.is_master_base) {
    return (
      <div className="rounded-lg border border-violet-200 bg-violet-50/50 p-3">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-violet-800 mb-1.5"><GitBranch className="h-3.5 w-3.5" /> Sabores derivados</p>
        {derived.length === 0
          ? <p className="text-xs text-muted-foreground">Aún no hay sabores vinculados a esta base.</p>
          : (
            <div className="flex flex-wrap gap-1.5">
              {derived.map(d => (
                <span key={d.id} className="rounded-full bg-background border px-2 py-0.5 text-xs">
                  {d.name}{d.base_quantity_grams ? <span className="text-muted-foreground"> · {d.base_quantity_grams}g</span> : null}
                </span>
              ))}
            </div>
          )}
      </div>
    );
  }
  if (!recipe.base_recipe_id) return null;
  return (
    <div className="rounded-lg border border-violet-200 bg-violet-50/50 p-3 flex items-center gap-2 text-xs">
      <Layers className="h-3.5 w-3.5 text-violet-700" />
      <span className="text-muted-foreground">Base Maestra:</span>
      <span className="font-semibold text-violet-800">{baseRecipe?.name || 'No encontrada'}</span>
      <span className="ml-auto font-mono">{recipe.base_quantity_grams || 0}g por bandeja</span>
    </div>
  );
}