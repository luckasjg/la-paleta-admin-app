// Nombre visible del usuario: el alias personal tiene prioridad sobre el nombre de la cuenta.
export const displayName = (u) => (u?.alias || '').trim() || u?.full_name || u?.email || '';