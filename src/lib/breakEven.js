/**
 * Cálculo maestro del punto de equilibrio.
 * % variable = gastos variables / ventas (0 si ventas = 0)
 * margen ajustado = margen promedio - % variable
 * equilibrio = gastos fijos / margen ajustado
 */
export function computeBreakEven({ fixedExpenses = 0, variableExpenses = 0, monthlySales = 0, marginPct = 0 }) {
  const variableRatio = monthlySales > 0 ? variableExpenses / monthlySales : 0;
  const marginRatio = Math.max(0.01, Math.min(0.99, (marginPct || 0) / 100 - variableRatio));
  const breakevenRevenue = fixedExpenses > 0 ? fixedExpenses / marginRatio : 0;
  return { variableRatio, marginRatio, breakevenRevenue };
}