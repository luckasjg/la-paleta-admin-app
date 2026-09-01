import { formatUSD } from '@/lib/useExchangeRate';

export const CHANNEL_LABELS = {
  local: 'Consumir en el local',
  pickup: 'Retiro en tienda (Pickup)',
  delivery: 'Delivery a domicilio',
};

/** Código legible del pedido: P-AAMMDD-XXXX */
export function buildOrderNumber() {
  const d = new Date();
  const stamp = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `P-${stamp}-${rand}`;
}

/** Mensaje estructurado que el cliente envía por WhatsApp */
export function buildWhatsAppMessage({ orderNumber, items, total, channel, customer, notes }) {
  const lines = [
    '*NUEVO PEDIDO — LA PALETA CAFE*',
    `Pedido: ${orderNumber}`,
    '',
    `*Cliente:* ${customer.name}`,
    `*Teléfono:* ${customer.phone}`,
  ];

  if (channel === 'delivery' && customer.address) {
    lines.push(`*Dirección:* ${customer.address}`);
  }

  lines.push(`*Modalidad:* ${CHANNEL_LABELS[channel] || channel}`, '', '*Pedido:*');

  items.forEach((it) => {
    lines.push(`• ${it.quantity} x ${it.product_name} — ${formatUSD(it.subtotal)}`);
    if (Array.isArray(it.flavors) && it.flavors.length > 0) {
      const detail = it.flavors
        .map((f) => `${f.recipe_name} ${f.grams}g`)
        .join(' + ');
      lines.push(`   Sabores: ${detail}`);
    } else if (it.flavor) {
      lines.push(`   Sabor: ${it.flavor}`);
    }
    if (it.flavor_surcharge > 0) {
      lines.push(`   Recargo sabor premium: +${formatUSD(it.flavor_surcharge)}`);
    }
    if (it.vessel) {
      lines.push(`   Servir en: ${it.vessel === 'taza' ? 'Taza (cerámica)' : 'Vaso desechable'}`);
    }
  });

  lines.push('', `*TOTAL: ${formatUSD(total)}*`);

  if (notes) lines.push('', `*Nota:* ${notes}`);
  lines.push('', 'Enviado desde el menú digital 🍦');

  return lines.join('\n');
}

/** Link wa.me listo para abrir */
export function buildWhatsAppLink(phoneNumber, message) {
  const clean = String(phoneNumber || '').replace(/[^\d]/g, '');
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
}