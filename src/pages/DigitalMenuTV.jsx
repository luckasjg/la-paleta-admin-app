import React, { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { formatUSD } from '@/lib/useExchangeRate';


const POLL_MS = 30000; // 30 segundos

export default function DigitalMenuTV() {
  const [trays, setTrays] = useState([]);
  const [products, setProducts] = useState([]);
  const [now, setNow] = useState(new Date());

  const fetchData = useCallback(async () => {
    try {
      const [traysData, productsData] = await Promise.all([
        base44.entities.Tray.list('-production_date', 200),
        base44.entities.Product.list('sort_order', 200)]
      );
      // Sabores disponibles: bandejas activas en vitrina con gramos restantes > 0
      setTrays(
        (traysData || []).filter(
          (t) => t.status === 'activa' && (t.remaining_grams || 0) > 0 && t.in_vitrine === true
        )
      );
      // Presentaciones principales: productos activos con precio
      setProducts(
        (productsData || []).filter((p) => p.is_active !== false && (p.price || 0) > 0)
      );
    } catch {
      // Fallo de red puntual: se mantiene lo último cargado y se reintenta en el próximo ciclo.
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, POLL_MS);
    const clock = setInterval(() => setNow(new Date()), 30000);
    return () => {
      clearInterval(interval);
      clearInterval(clock);
    };
  }, [fetchData]);

  // Deduplicar sabores por nombre (puede haber varias bandejas del mismo sabor)
  const uniqueFlavors = Array.from(
    new Map(trays.map((t) => [t.recipe_name, t])).values()
  ).sort((a, b) =>
    (a.recipe_name || '').localeCompare(b.recipe_name || '', 'es', { sensitivity: 'base' })
  );

  // Agrupar productos por categoría
  const productsByCategory = products.reduce((acc, p) => {
    const cat = p.category || 'Otros';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-gradient-to-br from-[#1a0e0a] via-[#2a1410] to-[#0f0806] text-white flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-12 py-6 border-b border-amber-500/20 bg-black/30 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <img src="https://media.base44.com/images/public/69e078117e2725c0776d724e/649909b33_logoPaletaMesadetrabajo8-111.png" alt="Logo" className="h-16 w-auto drop-shadow-lg" />
          <div>
            <h1 className="text-5xl font-black tracking-tight bg-gradient-to-r from-amber-200 to-amber-500 bg-clip-text text-transparent">LA PALETA CAFE

            </h1>
            <p className="text-amber-300/70 text-sm uppercase tracking-[0.3em] font-light">Helados artesanales

            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-3xl font-mono font-light text-amber-200">
            {now.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}
          </p>
          <p className="text-xs text-amber-300/60 uppercase tracking-wider">
            {now.toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
      </header>

      {/* Cuerpo principal */}
      <div className="flex-1 flex overflow-hidden">
        {/* Panel sabores (2/3) */}
        <section className="flex-1 p-10 overflow-hidden">
          <h2 className="text-4xl font-black mb-8 text-amber-100 flex items-center gap-3">
            <span className="w-2 h-10 bg-amber-400 rounded-full"></span>
            Sabores Disponibles Hoy
          </h2>
          {uniqueFlavors.length === 0 ?
          <div className="flex items-center justify-center h-2/3">
              <p className="text-2xl text-amber-200/40">Preparando sabores...</p>
            </div> :

          <div className="grid grid-cols-3 gap-5 auto-rows-min">
              {uniqueFlavors.map((t) =>
            <div
              key={t.id}
              className="bg-gradient-to-br from-amber-500/15 to-amber-900/10 border-2 border-amber-400/30 rounded-2xl p-6 backdrop-blur-sm shadow-xl hover:scale-105 transition-transform">
              
                  <p className="text-2xl font-black text-amber-50 leading-tight">
                    {t.recipe_name}
                  </p>
                </div>
            )}
            </div>
          }
        </section>

        {/* Panel precios (1/3) */}
        <aside className="w-[420px] border-l border-amber-500/20 bg-black/40 backdrop-blur-md p-8 overflow-y-auto">
          <h2 className="text-3xl font-black mb-6 text-amber-100 flex items-center gap-3">
            <span className="w-2 h-8 bg-amber-400 rounded-full"></span>
            Presentaciones
          </h2>
          <div className="space-y-6">
            {Object.entries(productsByCategory).map(([cat, items]) =>
            <div key={cat}>
                <h3 className="text-sm uppercase tracking-[0.25em] text-amber-400/80 font-bold mb-3">
                  {cat}
                </h3>
                <div className="space-y-2">
                  {items.map((p) =>
                <div
                  key={p.id}
                  className="flex items-baseline justify-between gap-3 border-b border-dashed border-amber-500/15 pb-2">
                  
                      <span className="text-lg font-medium text-amber-50 truncate">
                        {p.name}
                        {p.size_label ?
                    <span className="text-amber-300/60 text-sm ml-1">
                            {p.size_label}
                          </span> :
                    null}
                      </span>
                      <span className="text-xl font-black font-mono text-amber-200 whitespace-nowrap">
                        {formatUSD(p.price)}
                      </span>
                    </div>
                )}
                </div>
              </div>
            )}
            {products.length === 0 &&
            <p className="text-amber-200/40 text-center py-8">Sin productos publicados</p>
            }
          </div>
        </aside>
      </div>

      {/* Footer sutil */}
      <footer className="px-12 py-3 border-t border-amber-500/20 bg-black/40 text-center">
        <p className="text-xs text-amber-300/50 uppercase tracking-[0.4em]">¡Siguenos en instagram! @lapaletacafe

        </p>
      </footer>
    </div>);

}