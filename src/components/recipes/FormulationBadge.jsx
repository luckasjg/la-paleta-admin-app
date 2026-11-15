import React from 'react';
import { Badge } from '@/components/ui/badge';

/** Clasificación estructural de un helado: Base Maestra, Derivado o Independiente. */
export default function FormulationBadge({ recipe, baseRecipe, derivedCount }) {
  if (recipe.type !== 'helado') return null;
  if (recipe.is_master_base) {
    return (
      <>
        <Badge className="bg-violet-100 text-violet-700 border-violet-300">Base Maestra</Badge>
        <span className="text-[11px] text-muted-foreground">{derivedCount} derivado{derivedCount === 1 ? '' : 's'}</span>
      </>
    );
  }
  if (recipe.base_recipe_id) {
    return <Badge variant="outline" className="text-violet-700 border-violet-300">Derivado · {baseRecipe?.name || 'base no encontrada'}</Badge>;
  }
  return <Badge variant="outline" className="text-muted-foreground">Independiente</Badge>;
}