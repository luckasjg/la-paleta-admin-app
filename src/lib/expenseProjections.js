import moment from 'moment';

/**
 * Build the effective list of expenses for a given (year, month), including:
 *  - expenses created exactly in (year, month)
 *  - recurring expenses created BEFORE/AT that month, still active, not past end-date
 *
 * Returns an array of { expense, displayDate, isProjection }.
 */
export function buildMonthRows(expenses, year, month) {
  const monthStart = moment({ year, month }).startOf('month');
  const monthEnd = moment({ year, month }).endOf('month');

  const rows = [];
  expenses.forEach(e => {
    if (!e.date) return;
    const created = moment(e.date);

    if (created.year() === year && created.month() === month) {
      rows.push({ expense: e, displayDate: e.date, isProjection: false });
      return;
    }

    if (e.is_recurring && e.recurring_active !== false && created.isBefore(monthEnd)) {
      if (e.recurring_end_date) {
        const endDate = moment(e.recurring_end_date);
        if (monthStart.isAfter(endDate, 'month')) return;
      }
      rows.push({
        expense: e,
        displayDate: monthStart.format('YYYY-MM-DD'),
        isProjection: true,
      });
    }
  });

  rows.sort((a, b) => {
    if (a.isProjection !== b.isProjection) return a.isProjection ? 1 : -1;
    return moment(b.displayDate).valueOf() - moment(a.displayDate).valueOf();
  });
  return rows;
}

/** Sum of fixed expenses for a given month (real + active recurring). */
export function getFixedExpensesForMonth(expenses, year, month) {
  return buildMonthRows(expenses, year, month)
    .filter(r => r.expense.type === 'fijo')
    .reduce((s, r) => s + (r.expense.amount || 0), 0);
}