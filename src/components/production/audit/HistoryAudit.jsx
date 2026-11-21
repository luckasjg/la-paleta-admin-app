import React from 'react';
import DeductionAudit from '@/components/production/audit/DeductionAudit';
import { expectedForMaster, expectedForSingle, expectedFromLog } from '@/lib/deductionAudit';

/** Verificación de descuento de inventario para una tarjeta del historial. */
export default function HistoryAudit({ item, ctx }) {
  const { trays, recipes, suppliesById, movementsByRef } = ctx;
  if (item.kind === 'master') {
    return (
      <DeductionAudit refKey={item.id} label={`Lote Maestro: ${item.base_name}`}
        expected={expectedForMaster(item, trays, recipes, suppliesById)}
        movements={movementsByRef[item.id] || []} />
    );
  }
  if (item.kind === 'independent') {
    return (
      <DeductionAudit refKey={item.id} label={`Lote Independiente: ${item.recipe_name}`}
        expected={expectedFromLog(item.deduction_log, suppliesById)}
        movements={movementsByRef[item.id] || []} />
    );
  }
  const e = item.event;
  if (e.type === 'transferencia') return null;
  const refKey = e.production_ref || e.id;
  const label = `${e.type === 'relleno' ? 'Relleno' : 'Bandeja'}: ${e.recipe_name}`;
  return (
    <DeductionAudit refKey={refKey} label={label} bypass={e.inventory_bypass}
      expected={expectedForSingle(e, item.tray, recipes, suppliesById)}
      movements={movementsByRef[refKey] || []} />
  );
}