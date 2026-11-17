// Clientes con actividad reciente en el POS (registro, selección, venta en espera),
// guardados en el dispositivo y filtrados por la sesión de caja actual.
const KEY = 'pos_recent_customers';
const MAX = 6;

const read = () => {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(list) ? list : [];
  } catch { return []; }
};

export function touchRecentCustomer(c, sessionId) {
  if (!c?.id || c.none) return;
  const entry = { id: c.id, full_name: c.full_name, cedula: c.cedula, phone: c.phone, session_id: sessionId || null, at: Date.now() };
  const next = [entry, ...read().filter(x => x.id !== c.id)].slice(0, 30);
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* almacenamiento lleno */ }
}

export function getRecentCustomers(sessionId) {
  return read().filter(x => !sessionId || x.session_id === sessionId).slice(0, MAX);
}