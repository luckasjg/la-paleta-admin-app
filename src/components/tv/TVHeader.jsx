import React, { useEffect, useState } from 'react';

/**
 * Header compartido para las pantallas verticales 9:16.
 * Logo + título + reloj.
 */
export default function TVHeader({ title, subtitle }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  return (
    <header className="flex items-center justify-between px-8 py-5 border-b border-amber-500/20 bg-black/40 backdrop-blur-sm flex-shrink-0">
      <div className="flex items-center gap-3">
        <img
          src="https://media.base44.com/images/public/69e078117e2725c0776d724e/649909b33_logoPaletaMesadetrabajo8-111.png"
          alt="Logo"
          className="h-14 w-auto drop-shadow-lg"
        />
        <div>
          <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-amber-200 to-amber-500 bg-clip-text text-transparent leading-none">
            LA PALETA CAFE
          </h1>
          <p className="text-amber-300/70 text-[10px] uppercase tracking-[0.3em] mt-1">
            {subtitle || 'Helados artesanales'}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-2xl font-mono font-light text-amber-200 leading-none">
          {now.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}
        </p>
        <p className="text-[10px] text-amber-300/60 uppercase tracking-wider mt-1">
          {title}
        </p>
      </div>
    </header>
  );
}