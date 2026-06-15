// Helpers locales para la sesión de caja activa.
// Persiste en localStorage el ID de la CashRegister 'abierta' y los datos
// del empleado que la abrió, para no depender de re-fetch en cada venta.

const KEY = 'pos_active_cash_session';

export function getActiveSession() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setActiveSession(session) {
  // session: { id, staff_id, staff_name, shift, date, opened_at }
  if (!session) return;
  localStorage.setItem(KEY, JSON.stringify(session));
}

export function clearActiveSession() {
  localStorage.removeItem(KEY);
}

export function getCurrentShift() {
  const h = new Date().getHours();
  if (h < 12) return 'manana';
  if (h < 18) return 'tarde';
  return 'noche';
}