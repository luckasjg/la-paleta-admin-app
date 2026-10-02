// Venta a crédito: tiene total pero no entró efectivo ni digital.
export const isCreditSale = (s) =>
  s.status !== 'voided' && (s.total || 0) > 0 && !(s.cash_amount > 0) && !(s.digital_amount > 0);

export const creditSummary = (sales = []) => {
  const credit = sales.filter(isCreditSale);
  return { count: credit.length, total: credit.reduce((a, s) => a + (s.total || 0), 0) };
};