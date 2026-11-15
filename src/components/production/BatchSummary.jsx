import React from 'react';

const Row = ({ label, value, strong }) => (
  <>
    <span className="text-muted-foreground">{label}</span>
    <span className={`font-mono text-right ${strong ? 'font-semibold text-foreground' : ''}`}>{value}</span>
  </>
);

/** Resumen previo a guardar: costo real, costo/g, peso esperado vs neto y merma. */
export default function BatchSummary({ summary, netGrams, refill }) {
  const weighted = refill
    ? (() => {
        const total = refill.before * refill.oldCpg + summary.totalCost;
        const after = refill.before + netGrams;
        return after > 0 ? total / after : 0;
      })()
    : null;

  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <p className="text-sm font-medium mb-2">Resumen del lote</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <Row label="Costo total real" value={`$${summary.totalCost.toFixed(2)}`} strong />
        <Row label="Costo real por gramo" value={`$${summary.costPerGram.toFixed(4)}`} />
        <Row label="Peso esperado (solo g)" value={`${summary.expected.toFixed(0)}g`} />
        <Row label="Peso neto" value={`${(netGrams || 0).toFixed(0)}g`} />

        {weighted !== null && <Row label="Costo/g ponderado bandeja" value={`$${weighted.toFixed(4)}`} strong />}
      </div>
    </div>
  );
}