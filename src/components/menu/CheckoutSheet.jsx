import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Loader2 } from 'lucide-react';
import { formatUSD } from '@/lib/useExchangeRate';
import { useShopSetting } from '@/lib/useShopSetting';
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
 */
export default function CheckoutSheet({ items, total, channel, onChannelChange, onClose, onSent }) {
  const { value: whatsappNumber } = useShopSetting('whatsapp_number');

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [saveAccount, setSaveAccount] = useState(false);
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
      let finalCustomerId = null;

      if (saveAccount) {
        const res = await base44.functions.invoke('customerPortal', {
          action: 'save',
          full_name: name.trim(),
          phone: digitsPhone,
          address: address.trim(),
        });
        finalCustomerId = res?.data?.customer?.id || finalCustomerId;
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
        customer_id: finalCustomerId || undefined,
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
    'w-full bg-black/40 border border-amber-500/30 rounded-lg px-3 py-3 text-sm text-amber-50 placeholder:text-amber-200/30';

  return (
    <div className="fixed inset-0 z-50 bg-[#120805] overflow-y-auto">
      <div className="px-4 py-5 max-w-md mx-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-black text-amber-100">Finalizar pedido</h2>
          <button onClick={onClose} className="text-amber-300/70 p-1">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Modalidad */}
        <p className="text-[10px] uppercase tracking-[0.25em] text-amber-400/80 font-bold mb-2">
          ¿Cómo lo quieres?
        </p>
        <div className="grid grid-cols-1 gap-2 mb-5">
          {CHANNELS.map((c) => (
            <button
              key={c}
              onClick={() => onChannelChange(c)}
              className={
                channel === c
                  ? 'h-12 rounded-xl border-2 border-amber-400 bg-amber-500/20 text-amber-50 font-bold text-sm'
                  : 'h-12 rounded-xl border border-amber-500/25 bg-black/30 text-amber-200/70 font-medium text-sm'
              }
            >
              {CHANNEL_LABELS[c]}
            </button>
          ))}
        </div>

        {/* Datos */}
        <p className="text-[10px] uppercase tracking-[0.25em] text-amber-400/80 font-bold mb-2">
          Tus datos
        </p>
        <div className="space-y-3 mb-5">
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

          <label className="flex items-center gap-3 text-sm text-amber-100 py-1">
            <input
              type="checkbox"
              checked={saveAccount}
              onChange={(e) => setSaveAccount(e.target.checked)}
              className="h-5 w-5 accent-amber-500"
            />
            Guardar mis datos para próximos pedidos
          </label>
        </div>

        {/* Resumen */}
        <div className="rounded-xl border border-amber-500/25 bg-black/30 p-4 mb-4">
          <p className="text-[10px] uppercase tracking-[0.25em] text-amber-400/80 font-bold mb-2">
            Resumen
          </p>
          {items.map((it) => (
            <div key={it.key} className="flex justify-between text-sm text-amber-50 py-0.5">
              <span>
                {it.quantity} x {it.product_name}
                {it.flavor && <span className="text-amber-300/60"> ({it.flavor})</span>}
                {it.vessel && (
                  <span className="text-amber-300/60">
                    {' '}· {it.vessel === 'taza' ? 'taza' : 'vaso'}
                  </span>
                )}
              </span>
              <span className="font-mono">{formatUSD(it.subtotal)}</span>
            </div>
          ))}
          <div className="flex justify-between mt-2 pt-2 border-t border-amber-500/20 font-black text-amber-200">
            <span>TOTAL</span>
            <span className="font-mono">{formatUSD(total)}</span>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 mb-3">
            {error}
          </p>
        )}

        <button
          onClick={handleSend}
          disabled={isSending}
          className="w-full h-14 rounded-xl bg-gradient-to-r from-green-500 to-green-600 text-black font-black text-base shadow-lg flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
          Enviar por WhatsApp
        </button>
        <p className="text-[11px] text-amber-300/50 text-center mt-3 pb-6">
          Te confirmamos por WhatsApp el pago y el tiempo de preparación.
        </p>
      </div>
    </div>
  );
}