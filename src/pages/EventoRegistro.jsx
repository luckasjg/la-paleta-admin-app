import React, { useState } from 'react';
import { Check, Instagram, IceCream, ArrowRight, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import EventoHero from '@/components/evento/EventoHero';
import EventoField, { fieldInput } from '@/components/evento/EventoField';

const INSTAGRAM_URL = 'https://www.instagram.com/lapaletacafe';

export default function EventoRegistro() {
  const [f, setF] = useState({ full_name: '', tipo: 'V', cedula: '', phone: '', instagram: '' });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const set = (k, fmt = (v) => v) => (e) => setF({ ...f, [k]: fmt(e.target.value) });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await base44.functions.invoke('registerEventCustomer', {
        full_name: f.full_name, phone: f.phone, instagram: f.instagram,
        cedula: `${f.tipo}${f.cedula.replace(/\D/g, '')}`,
      });
      setDone(true);
    } catch (err) {
      setError(err?.response?.data?.error || 'No se pudo registrar. Intenta de nuevo.');
    }
    setBusy(false);
  };

  return (
    <div className="min-h-screen px-4 pb-8 text-[#2E1109] bg-[#FAF4EB] bg-[radial-gradient(rgba(90,18,26,0.05)_1.2px,transparent_1.2px)] [background-size:20px_20px]">
      <div className="w-full max-w-md mx-auto">
        <EventoHero />
        <div className="relative overflow-hidden rounded-3xl border border-[#F2E8D8] bg-[#FFFDF9] p-6 shadow-[0_25px_50px_-15px_rgba(90,18,26,0.18)]">
          {done ? (
            <div className="text-center space-y-3 animate-in fade-in zoom-in-95 duration-500">
              <div className="mx-auto h-16 w-16 rounded-full bg-[#F6BA18]/20 flex items-center justify-center"><Check className="h-8 w-8 text-[#5A121A]" /></div>
              <p className="font-heading font-bold text-2xl text-[#5A121A]">¡Listo, {f.full_name.split(' ')[0]}!</p>
              <p className="text-sm text-[#2E1109]/70">Muestra tu nombre en el stand para recibir tu helado.</p>
              <div className="pt-4 mt-2 border-t border-[#F2E8D8] space-y-3">
                <p className="text-sm font-bold text-[#5A121A]">Último paso: síguenos en Instagram</p>
                <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#5A121A] to-pink-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-xl transition">
                  <Instagram className="h-5 w-5 text-[#FFCE2A]" /> Seguir @lapaletacafe
                </a>
              </div>
            </div>
          ) : (
            <>
              <div className="text-center mb-5">
                <h1 className="font-heading font-extrabold text-3xl text-[#5A121A] tracking-tight">Tu helado te espera</h1>
                <p className="text-sm text-[#2E1109]/75 mt-1.5">Regístrate y reclama tu helado de regalo en el stand de La Paleta Café.</p>
              </div>
              <form onSubmit={submit} className="space-y-3.5">
                <EventoField label="Nombre y apellido" hint="requerido">
                  <input required className={`${fieldInput} rounded-xl`} placeholder="Ej. Valentina Rodríguez" value={f.full_name} onChange={set('full_name')} />
                </EventoField>
                <EventoField label="Cédula de identidad" hint="para validar en stand">
                  <select value={f.tipo} onChange={set('tipo')} className="rounded-l-xl border border-r-0 border-[#F2E8D8] bg-[#F2E8D8]/60 px-3 text-xs font-bold text-[#5A121A] focus:outline-none">
                    <option value="V">V-</option><option value="E">E-</option>
                  </select>
                  <input required inputMode="numeric" className={`${fieldInput} rounded-r-xl font-mono tracking-wider`} placeholder="24.891.302" value={f.cedula}
                    onChange={set('cedula', (v) => { const d = v.replace(/\D/g, '').slice(0, 8); return d ? new Intl.NumberFormat('de-DE').format(d) : ''; })} />
                </EventoField>
                <EventoField label="Teléfono / WhatsApp" hint="para tus puntos" prefix="+58">
                  <input required type="tel" inputMode="numeric" className={`${fieldInput} rounded-r-xl`} placeholder="0414 1234567" value={f.phone}
                    onChange={set('phone', (v) => { const d = v.replace(/\D/g, '').slice(0, 11); return d.length > 4 ? `${d.slice(0, 4)} ${d.slice(4)}` : d; })} />
                </EventoField>
                <EventoField label="Instagram" hint="para verificar seguimiento" prefix="@">
                  <input required className={`${fieldInput} rounded-r-xl`} placeholder="usuario" value={f.instagram}
                    onChange={set('instagram', (v) => v.replace(/^@/, '').replace(/[^a-zA-Z0-9._]/g, ''))} />
                </EventoField>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <button type="submit" disabled={busy} className="w-full mt-2 py-4 rounded-2xl bg-gradient-to-r from-[#430B12] via-[#5A121A] to-[#430B12] text-white font-bold flex items-center justify-center gap-2 border border-[#F6BA18]/50 shadow-[0_10px_25px_-5px_rgba(246,186,24,0.45)] hover:scale-[1.01] active:scale-[0.98] transition disabled:opacity-70">
                  {busy ? <><Loader2 className="h-5 w-5 animate-spin text-[#F6BA18]" /> Registrando…</> : <><IceCream className="h-5 w-5 text-[#FFCE2A]" /> Quiero mi helado <ArrowRight className="h-4 w-4 text-[#F6BA18]" /></>}
                </button>
                <p className="text-[10px] text-center text-[#2E1109]/60">1 helado gratuito por persona, verificable en el stand.</p>
              </form>
            </>
          )}
        </div>
        <p className="mt-6 text-center text-xs font-bold text-[#5A121A]">© La Paleta Café • Gelato & Café</p>
      </div>
    </div>
  );
}