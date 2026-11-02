// Formatea una marca de tiempo (UTC) en hora de Venezuela, sin importar la zona del dispositivo.
export function formatVET(value) {
  if (!value) return '';
  const iso = /Z$|[+-]\d{2}:?\d{2}$/.test(value) ? value : `${value}Z`;
  return new Intl.DateTimeFormat('es-VE', {
    timeZone: 'America/Caracas',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  }).format(new Date(iso));
}