import React from 'react';

const sizeOf = (item) => {
  const n = `${item.product_name || ''} ${item.vessel || ''}`.toLowerCase();
  if (/peque|small|\bpq\b|\bs\b/.test(n)) return 'PEQUEÑO';
  if (/grande|large|\bxl\b|\bl\b/.test(n)) return 'GRANDE';
  if (/median|\bm\b/.test(n)) return 'MEDIANO';
  return null;
};

export default function ItemTags({ item }) {
  const size = sizeOf(item);
  const isTakeaway = /llevar/i.test(`${item.category || ''} ${item.vessel || ''}`);
  return (
    <div className="flex flex-wrap gap-1.5 mt-1">
      {size && <span className="rounded-md bg-primary text-primary-foreground px-2 py-0.5 text-xs font-bold tracking-wide">{size}</span>}
      {item.category && (
        <span className={`rounded-md px-2 py-0.5 text-xs font-bold uppercase tracking-wide ${isTakeaway ? 'bg-amber-400 text-amber-950' : 'bg-secondary text-secondary-foreground'}`}>
          {item.category}
        </span>
      )}
      {item.vessel && <span className="rounded-md border px-2 py-0.5 text-xs font-medium">{item.vessel}</span>}
      {item.grams > 0 && <span className="rounded-md border px-2 py-0.5 text-xs font-mono">{item.grams} g</span>}
    </div>
  );
}