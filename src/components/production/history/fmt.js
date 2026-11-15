export const fmtG = (n) => (n == null || Number.isNaN(n) ? '—' : `${Math.round(n)}g`);
export const fmtUsd = (n, d = 2) => (n == null || Number.isNaN(n) ? '—' : `$${Number(n).toFixed(d)}`);
export const lossLabel = (loss) => (loss < 0 ? 'Arrastre' : 'Merma');
export const lossCls = (loss) => (loss < 0 ? 'text-sky-700' : 'text-amber-700');