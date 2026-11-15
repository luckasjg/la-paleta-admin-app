const fmt = (n) => Number(n.toFixed(2)).toString();

export const packageLabel = (supply) => (supply?.package_type || 'Paquete').toLowerCase();

// "200 u. (2 paquetes de 100 u.)" o "200 unidad (sin empaque configurado)"
export function formatPackages(units, supply) {
  const per = Number(supply?.units_per_package) || 0;
  if (per <= 1) return `${fmt(units)} ${supply?.unit || 'unidad'} (sin empaque configurado)`;
  const pk = units / per;
  const name = packageLabel(supply);
  return `${fmt(units)} u. (${fmt(pk)} ${pk === 1 ? name : name + 's'} de ${per} u.)`;
}

export function shortPackages(units, per) {
  return per > 1 ? `${fmt(units)} u. (${fmt(units / per)} paq.)` : `${fmt(units)} u.`;
}