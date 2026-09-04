import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Loader2 } from 'lucide-react';
import { formatUSD } from '@/lib/useExchangeRate';
import { useShopSetting } from '@/lib/useShopSetting';
import CustomerRegisterCard from '@/components/menu/CustomerRegisterCard';
import {
  CHANNEL_LABELS,
  buildOrderNumber,
  buildWhatsAppMessage,
  buildWhatsAppLink,
} from '@/lib/orderMessage';

const CHANNELS = ['local', 'pickup', 'delivery'];

/**
 * Checkout del menú móvil: datos del cliente, modalidad de entrega y envío por WhatsApp.
 * Crea el registro de Order en estado "pendiente" y abre wa.me con el mensaje estructurado.
 * El registro de cliente es opcional y ocurre justo antes de enviar.
 */
export default function CheckoutSheet({
  items,
  total,
  channel,
  onChannelChange,
  onClose,
  onSent,
  profile,
  onRegister,
}) {
  const { value: whatsappNumber } = useShopSetting('whatsapp_number');

  const [name, setName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [address, setAddress] = useState(profile?.address || '');
  const [notes, setNotes] = useState('');
  const [wantsRegister, setWantsRegister] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');

  const digitsPhone = phone.replace(/[^\d]/g, '');

  const handleSend = async () => {
    setError('');
    if (!name.trim()) return setError('Escribe tu nombre.');
    if (digitsPhone.length < 7) return setError('Escribe un teléfono válido.');
    if (channel === 'delivery' && !address.trim()) return setError('El delivery necesita dirección.');
    if (items.length === 0) return setError('Tu pedido está vacío.');
    if (!whatsappNumber) return setError('La tienda aún no configuró su WhatsApp. Intenta más tarde.');

    setIsSending(true);
    try {
      let customerId = profile?.customer_id || '';
      if (wantsRegister || profile) {
        try {
          const saved = await onRegister({
            full_name: name.trim(),
            phone: digitsPhone,
            address: address.trim(),
          });
          customerId = saved?.customer_id || customerId;
        } catch {
          // El registro es opcional: si falla, el pedido sigue como invitado.
        }
      }

      const orderNumber = buildOrderNumber();
      const message = buildWhatsAppMessage({
        orderNumber,
        items,
        total,
        channel,
        customer: { name: name.trim(), phone: digitsPhone, address: address.trim() },
        notes: notes.trim(),
      });

      await base44.entities.Order.create({
        order_number: orderNumber,
        customer_id: customerId,
        customer_name: name.trim(),
        customer_phone: digitsPhone,
        customer_address: address.trim(),
        items: items.map((it) => ({
          product_id: it.product_id,
          product_name: it.product_name,
          quantity: it.quantity,
          unit_price: it.unit_price,
          subtotal: it.subtotal,
          flavor: it.flavor || '',
          flavors: it.flavors || [],
          base_price: it.base_price,
          flavor_surcharge: it.flavor_surcharge || 0,
          grams: it.grams || 0,
          vessel: it.vessel || '',
        })),
        total,
        channel,
        status: 'pendiente',
        whatsapp_message: message,
        notes: notes.trim(),
      });

      window.open(buildWhatsAppLink(whatsappNumber, message), '_blank');
      onSent();
    } catch {
      setError('No pudimos registrar el pedido. Revisa tu conexión e intenta de nuevo.');
      setIsSending(false);
    }
  };

  const inputClass =
    'w-full rounded-[13px] border-2 border-[#D6D7DD] bg-[#F7F7F8] px-3 py-3 text-[13px] font-extrabold text-[#24252b] placeholder:font-medium placeholder:text-[#9a9ba4] focus:border-[#F0A23B] focus:outline-none';
  const eyebrow = 'mb-2.5 text-[10px] font-[950] uppercase tracking-[0.17em] text-[#24252b]';

  return (
    <div className="menu-font fixed inset-0 z-50 overflow-y-auto bg-[#F4F4F6] text-[#24252b]">
      <div className="mx-auto max-w-md px-4 py-5">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="m-0 text-[22px] font-[950] leading-none tracking-[-0.04em]">
            Finalizar pedido
          </h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="menu-btn flex h-9 w-9 items-center justify-center rounded-full border-0 bg-white text-[#24252b] shadow-[0_5px_12px_#16161d12]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modalidad */}
        <div className="mb-4 rounded-[22px] border border-[#E1E1E6] bg-white p-4 shadow-[0_12px_25px_#16161d12]">
          <p className={eyebrow}>¿Cómo lo quieres?</p>
          <div className="grid grid-cols-1 gap-[7px]">
            {CHANNELS.map((c) => (
              <button
                key={c}
                onClick={() => onChannelChange(c)}
                className={
                  channel === c
                    ? 'menu-btn min-h-[45px] rounded-[13px] border-2 border-[#24252b] bg-[#24252b] text-[12px] font-[900] text-white shadow-[0_5px_12px_#24252b44]'
                    : 'menu-btn min-h-[45px] rounded-[13px] border-2 border-[#D6D7DD] bg-[#F7F7F8] text-[12px] font-[900] text-[#555762]'
                }
              >
                {CHANNEL_LABELS[c]}
              </button>
            ))}
          </div>
        </div>

        {/* Datos */}
        <div className="mb-4 rounded-[22px] border border-[#E1E1E6] bg-white p-4 shadow-[0_12px_25px_#16161d12]">
          <p className={eyebrow}>Tus datos</p>
          <div className="space-y-2.5">
            <input
              className={inputClass}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Teléfono (ej. 04121234567)"
              inputMode="numeric"
            />
            <input
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre y apellido"
            />
            {channel === 'delivery' && (
              <textarea
                className={inputClass}
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Dirección de entrega"
              />
            )}
            <textarea
              className={inputClass}
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Nota para la tienda (opcional)"
            />
          </div>
        </div>

        <CustomerRegisterCard
          profile={profile}
          wantsRegister={wantsRegister}
          onToggle={setWantsRegister}
        />

        {/* Resumen */}
        <div className="mb-4 rounded-[22px] border border-[#E1E1E6] bg-white p-4 shadow-[0_12px_25px_#16161d12]">
          <p className={eyebrow}>Resumen</p>
          {items.map((it) => (
            <div key={it.key} className="flex justify-between gap-2 py-1 text-[13px] font-[850]">
              <span>
                {it.quantity} x {it.product_name}
                {it.flavor && <span className="text-[#777984]"> ({it.flavor})</span>}
                {it.vessel && (
                  <span className="text-[#777984]">
                    {' '}· {it.vessel === 'taza' ? 'taza' : 'vaso'}
                  </span>
                )}
              </span>
              <span>{formatUSD(it.subtotal)}</span>
            </div>
          ))}
          <div className="mt-2 flex justify-between border-t border-[#24252b22] pt-2 text-[14px] font-[950]">
            <span>TOTAL</span>
            <span>{formatUSD(total)}</span>
          </div>
        </div>

        {error && (
          <p className="mb-3 rounded-[14px] bg-[#FFF3E8] px-3 py-2.5 text-[12px] font-extrabold text-[#c0492f]">
            {error}
          </p>
        )}

        <button
          onClick={handleSend}
          disabled={isSending}
          className="menu-btn flex h-[52px] w-full items-center justify-center gap-2 rounded-[13px] border-0 bg-[#F0A23B] text-[15px] font-[950] text-[#24252b] disabled:opacity-60"
        >
          {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
          Enviar por WhatsApp
        </button>
        <p className="mt-3 pb-6 text-center text-[11px] font-extrabold text-[#777984]">
          Te confirmamos por WhatsApp el pago y el tiempo de preparación.
        </p>
      </div>
    </div>
  );
}