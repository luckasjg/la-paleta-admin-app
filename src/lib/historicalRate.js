import { base44 } from '@/api/base44Client';

// Tasa EUR↔Bs vigente en una fecha, tomada de las ventas registradas ese día
// (cada venta guarda la tasa con la que se cobró). Busca hasta 3 días antes.
export async function findHistoricalEurRate(date) {
  if (!date) return null;
  const end = new Date(`${date}T23:59:59-04:00`);
  const start = new Date(end.getTime() - 4 * 864e5 + 1000);
  const sales = await base44.entities.Sale.filter(
    { sale_date: { $gte: start.toISOString(), $lte: end.toISOString() }, exchange_rate_eur_ves: { $gt: 0 } },
    '-sale_date', 1
  );
  const s = sales?.[0];
  return s ? { rate: s.exchange_rate_eur_ves, date: s.sale_date.slice(0, 10) } : null;
}