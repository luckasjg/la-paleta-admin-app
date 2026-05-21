// Exporta el desglose de costos de las recetas a un archivo CSV
// compatible con Excel (incluye BOM UTF-8 y separador ';' para Excel ES).

const escapeCell = (val) => {
  if (val === null || val === undefined) return '';
  const s = String(val);
  if (/[";\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
};

const formatNum = (n, decimals = 4) => {
  if (n === null || n === undefined || isNaN(n)) return '0';
  // Excel ES usa coma como decimal
  return Number(n).toFixed(decimals).replace('.', ',');
};

export function exportRecipesToCSV(recipes, supplies) {
  const headers = [
    'Receta',
    'Tipo',
    'Rinde',
    'Unidad',
    'Ingrediente',
    'Cantidad',
    'Unidad Ing.',
    '% Receta',
    'Costo Unit. ($)',
    'Costo Ingrediente ($)',
    'Costo Total Receta ($)',
    'Costo por Unidad ($/g o $/ml)',
    'Precio Venta ($)',
  ];

  const rows = [headers];

  recipes.forEach((recipe) => {
    const ingredients = recipe.ingredients || [];
    const totalCost = ingredients.reduce((sum, ing) => {
      const supply = supplies.find((s) => s.id === ing.supply_id);
      return sum + (supply?.cost_per_unit || 0) * (ing.quantity || 0);
    }, 0);
    const totalBase = ingredients.reduce((sum, ing) => sum + (ing.quantity || 0), 0);
    const costPerUnit = recipe.yield_amount > 0 ? totalCost / recipe.yield_amount : 0;

    if (ingredients.length === 0) {
      rows.push([
        recipe.name, recipe.type || '', recipe.yield_amount || '', recipe.yield_unit || '',
        '(sin ingredientes)', '', '', '', '', '',
        formatNum(totalCost, 2), formatNum(costPerUnit, 6), formatNum(recipe.sale_price || 0, 2),
      ]);
      return;
    }

    ingredients.forEach((ing, idx) => {
      const supply = supplies.find((s) => s.id === ing.supply_id);
      const costUnit = supply?.cost_per_unit || 0;
      const ingCost = costUnit * (ing.quantity || 0);
      const pct = totalBase > 0 ? ((ing.quantity || 0) / totalBase) * 100 : 0;

      rows.push([
        idx === 0 ? recipe.name : '',
        idx === 0 ? (recipe.type || '') : '',
        idx === 0 ? (recipe.yield_amount || '') : '',
        idx === 0 ? (recipe.yield_unit || '') : '',
        ing.supply_name || '',
        formatNum(ing.quantity || 0, 4),
        ing.unit || '',
        formatNum(pct, 2),
        formatNum(costUnit, 6),
        formatNum(ingCost, 4),
        idx === 0 ? formatNum(totalCost, 2) : '',
        idx === 0 ? formatNum(costPerUnit, 6) : '',
        idx === 0 ? formatNum(recipe.sale_price || 0, 2) : '',
      ]);
    });
  });

  const csv = rows.map((r) => r.map(escapeCell).join(';')).join('\n');
  // BOM para que Excel detecte UTF-8 correctamente con acentos
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `recetas_costos_${date}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}