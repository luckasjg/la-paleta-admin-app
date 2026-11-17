import React from 'react';
import { Label } from '@/components/ui/label';
import SearchableCombobox from '@/components/shared/SearchableCombobox';
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
      <SearchableCombobox
        value={value}
        onChange={onChange}
        disabled={disabled}
        keepOrder
        searchPlaceholder="Buscar ubicación..."
        options={LOCATIONS.map(loc => ({ value: loc.value, label: loc.label }))}
      />
    </div>
  );
}