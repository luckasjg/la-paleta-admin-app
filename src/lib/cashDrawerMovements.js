import { saleCashChangeUsd } from '@/lib/changeTramos';
import { CASH_METHODS } from '@/lib/receivables';

const METHOD_LABELS = { efectivo: 'Efectivo', pago_movil: 'Pago móvil', transferencia: 'Transferencia' };

/**
 * Movimientos de efectivo de la sesión, en orden cronológico.
 * `drawer` = efecto en la gaveta (USD base); los vueltos digitales tienen drawer 0
 * pero se listan para ver por qué parte del cobro en efectivo quedó en el fondo.
 */
export function buildCashDrawerMovements({ register, openingUsd, sales, abonos }) {
  const rows = [];
  if (register) {
    rows.push({ key: 'open', date: register.opened_at || register.created_date, concept: 'Fondo inicial declarado', kind: 'fondo', method: 'Efectivo', drawer: openingUsd });
  }
  sales.forEach(s => {
    const cash = s.cash_amount || 0;
    if (cash > 0) {
      rows.push({ key: `${s.id}-cash`, date: s.sale_date, concept: `Cobro en efectivo · venta $${(s.total || 0).toFixed(2)}`, kind: 'venta', method: 'Efectivo', drawer: cash });
    }
    const tramos = s.change_breakdown?.length
      ? s.change_breakdown
      : (s.change_amount_usd_equivalent > 0 ? [{ method: s.change_method || 'efectivo', currency: s.change_currency, amount_usd_equivalent: s.change_amount_usd_equivalent }] : []);
    tramos.forEach((t, i) => {
      const usd = t.amount_usd_equivalent || 0;
      if (!(usd > 0)) return;
      const isCash = t.method === 'efectivo';
      rows.push({
        key: `${s.id}-ch-${i}`, date: s.sale_date,
        concept: isCash ? 'Vuelto entregado en efectivo' : 'Vuelto por vía digital (el efectivo queda en gaveta)',
        kind: isCash ? 'vuelto' : 'vuelto_digital',
        method: `${METHOD_LABELS[t.method] || t.method}${t.currency ? ` · ${t.currency}` : ''}`,
        drawer: isCash ? -usd : 0, usd,
      });
    });
  });
  abonos.filter(a => CASH_METHODS.includes(a.method)).forEach(a => {
    rows.push({ key: `ab-${a.id}`, date: a.payment_date || a.created_date, concept: `Abono en efectivo · ${a.customer_name || 'cliente'}`, kind: 'abono', method: 'Efectivo', drawer: a.amount_usd_equivalent || 0 });
  });
  rows.sort((a, b) => new Date(a.date) - new Date(b.date));
  return rows;
}

export const digitalChangeUsd = (sales) =>
  sales.reduce((sum, s) => sum + ((s.change_amount_usd_equivalent || 0) - saleCashChangeUsd(s)), 0);