import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw } from 'lucide-react';

/** Acciones rápidas para asignar el remanente de base a una bandeja de la Base Maestra pura. */
export default function RemnantActions({ baseName, remaining, canRefill, onAdd }) {
  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <Button type="button" variant="outline" size="sm" className="border-violet-300 text-violet-800 hover:bg-violet-50" onClick={() => onAdd('nueva')}>
        <Plus className="h-4 w-4" /> Crear bandeja con remanente ({remaining.toFixed(1)}g de {baseName})
      </Button>
      {canRefill && (
        <Button type="button" variant="outline" size="sm" className="border-blue-300 text-blue-800 hover:bg-blue-50" onClick={() => onAdd('relleno')}>
          <RefreshCw className="h-4 w-4" /> Rellenar bandeja de {baseName}
        </Button>
      )}
    </div>
  );
}