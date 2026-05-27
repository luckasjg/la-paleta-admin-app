import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Warehouse, FlaskConical } from 'lucide-react';
import { LOCATIONS } from '@/lib/stockHelpers';

/**
 * Selector reutilizable de "Origen de Materia Prima".
 * Por defecto: Laboratorio de Producción.
 */
export default function StockLocationSelector({
  value,
  onChange,
  label = 'Origen de Materia Prima',
  disabled = false,
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {LOCATIONS.map((loc) => (
            <SelectItem key={loc.value} value={loc.value}>
              <span className="flex items-center gap-2">
                {loc.value === 'production' ? (
                  <FlaskConical className="h-3.5 w-3.5 text-primary" />
                ) : (
                  <Warehouse className="h-3.5 w-3.5 text-primary" />
                )}
                {loc.label}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}