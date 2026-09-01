// Flujo de estados de los pedidos del menú móvil.
export const ORDER_STATUSES = [
  { value: 'pendiente', label: 'Pendiente', className: 'bg-yellow-100 text-yellow-700' },
  { value: 'confirmado', label: 'Confirmado', className: 'bg-blue-100 text-blue-700' },
  { value: 'en_preparacion', label: 'En preparación', className: 'bg-blue-100 text-blue-700' },
  { value: 'listo', label: 'Listo', className: 'bg-green-100 text-green-700' },
  { value: 'despachado', label: 'Despachado', className: 'bg-green-100 text-green-700' },
  { value: 'cancelado', label: 'Cancelado', className: 'bg-red-100 text-red-700' },
];

// Siguiente paso natural del flujo (null si es un estado final).
export const NEXT_STATUS = {
  pendiente: 'confirmado',
  confirmado: 'en_preparacion',
  en_preparacion: 'listo',
  listo: 'despachado',
};

export const statusMeta = (value) =>
  ORDER_STATUSES.find((s) => s.value === value) || ORDER_STATUSES[0];

export const CHANNEL_LABELS = {
  local: 'Consumo en local',
  pickup: 'Retiro en tienda',
  delivery: 'Delivery',
};