import React from 'react';
import { fmtBs, fmtUsd, signed, diffClass } from '@/lib/cashCurrencyBreakdown';

const Row = ({ label, value, sub }) => (
  <div className="flex justify-between py-1 border-b border-border/60 last:border-0">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-mono font-semibold">{value}{sub && <span className="text-xs text-muted-foreground font-normal ml-1">{sub}</span>}</span>
  </div>
);

/** b = { cashUsd, cashVes, digitalUsd, digitalVes, digitalVesUsd } · diffs = { usd, ves, total } opcional */
export default function CurrencyBreakdownTable({ b, diffs, onlyDiffs }) {
  return (
    <div className="text-sm">
      {!onlyDiffs && (
        <>
          <Row label="Efectivo USD" value={fmtUsd(b.cashUsd)} sub={b.declaredUsd != null ? `contado ${fmtUsd(b.declaredUsd)}` : null} />
          <Row label="Efectivo Bs" value={fmtBs(b.cashVes)} sub={b.declaredVes != null ? `contado ${fmtBs(b.declaredVes)}` : null} />
          <Row label="Bs digital" value={fmtBs(b.digitalVes)} sub={b.digitalVesUsd != null ? `≈${fmtUsd(b.digitalVesUsd)}` : null} />
          <Row label="USD digital" value={fmtUsd(b.digitalUsd)} />
        </>
      )}
      {diffs && (
        <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-border text-center">
          {[['Dif. USD', signed(diffs.usd, fmtUsd), diffs.usd], ['Dif. Bs', signed(diffs.ves, fmtBs), diffs.ves], ['Dif. total', signed(diffs.total, fmtUsd), diffs.total]].map(([l, v, n]) => (
            <div key={l}>
              <div className="text-xs text-muted-foreground">{l}</div>
              <div className={`font-mono font-semibold text-xs ${diffClass(n)}`}>{v}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}