import { DollarSign, Banknote, Smartphone, CreditCard, Send, Wallet, Building2, Landmark } from 'lucide-react';

// Mapa nombre→componente. Si llega un valor desconocido, cae a CreditCard.
export const ICON_MAP = {
  DollarSign, Banknote, Smartphone, CreditCard, Send, Wallet, Building2, Landmark,
};

export const ICON_OPTIONS = Object.keys(ICON_MAP);

export function getIconComponent(name) {
  return ICON_MAP[name] || CreditCard;
}

// Definición de los 5 métodos legacy (mismos `value` que los enums originales
// en Sale.payments.method y Wallet.payment_methods, para no romper datos viejos).
export const LEGACY_METHODS = [
  { value: 'efectivo_usd', label: 'Efectivo Divisas', currency: 'USD', icon: 'DollarSign', sort_order: 1, is_legacy: true, is_active: true },
  { value: 'efectivo_ves', label: 'Efectivo VES',     currency: 'VES', icon: 'Banknote',   sort_order: 2, is_legacy: true, is_active: true },
  { value: 'pago_movil',   label: 'Pago Móvil',       currency: 'VES', icon: 'Smartphone', sort_order: 3, is_legacy: true, is_active: true },
  { value: 'punto_venta',  label: 'Punto de Venta',   currency: 'VES', icon: 'CreditCard', sort_order: 4, is_legacy: true, is_active: true },
  { value: 'zelle',        label: 'Zelle',            currency: 'USD', icon: 'Send',       sort_order: 5, is_legacy: true, is_active: true },
];

// Slugifica un label en un `value` válido y único.
export function slugifyValue(text, existing = []) {
  let base = (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (!base) base = 'metodo';
  let candidate = base;
  let i = 2;
  const set = new Set(existing);
  while (set.has(candidate)) {
    candidate = `${base}_${i++}`;
  }
  return candidate;
}