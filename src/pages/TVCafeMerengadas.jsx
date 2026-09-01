import React, { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import TVHeader from '@/components/tv/TVHeader';
import { formatUSD } from '@/lib/useExchangeRate';

const POLL_MS = 30000;

/**
 * Pantalla TV vertical (9:16) — Café, Merengadas y Presentaciones.
 * Muestra los productos del POS que NO son helados (o todos si no se puede distinguir).
 */
export default function TVCafeMerengadas() {
  const [products, setProducts] = useState([]);

  const fetchData = useCallback(async () => {
    try {
      const data = await base44.entities.Product.list('sort_order', 200);
      setProducts(
        (data || []).filter((p) => p.is_active !== false && (p.price || 0) > 0)
      );
    } catch {
      // Fallo de red puntual: se mantiene lo último cargado y se reintenta en el próximo ciclo.
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, POLL_MS);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Excluir categorías de helado para que esta pantalla sea solo bebidas/complementos
  const HELADO_KEYWORDS = ['helado', 'paleta', 'cono', 'copa', 'vaso'];
  const isHeladoCategory = (cat) => {
    const c = (cat || '').toLowerCase();
    return HELADO_KEYWORDS.some((k) => c.includes(k));
  };

  const filtered = products.filter((p) => !isHeladoCategory(p.category));

  const byCategory = filtered.reduce((acc, p) => {
    const cat = p.category || 'Otros';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-gradient-to-br from-[#1a0e0a] via-[#2a1410] to-[#0f0806] text-white flex flex-col">
      <TVHeader title="Carta" subtitle="Café · Merengadas · Más" />

      <section className="flex-1 px-8 py-6 overflow-y-auto">
        <h2 className="text-3xl font-black mb-5 text-amber-100 flex items-center gap-3">
          <span className="w-2 h-9 bg-amber-400 rounded-full" />
          Nuestra Carta
        </h2>

        {Object.keys(byCategory).length === 0 ? (
          <div className="flex items-center justify-center h-2/3">
            <p className="text-2xl text-amber-200/40">Carta no disponible</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(byCategory).map(([cat, items]) => (
              <div key={cat}>
                <h3 className="text-xs uppercase tracking-[0.3em] text-amber-400/80 font-bold mb-3 border-b border-amber-500/20 pb-2">
                  {cat}
                </h3>
                <div className="space-y-3">
                  {items.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-baseline justify-between gap-3 border-b border-dashed border-amber-500/10 pb-2"
                    >
                      <span className="text-lg font-medium text-amber-50">
                        {p.name}
                        {p.size_label ? (
                          <span className="text-amber-300/60 text-sm ml-2">
                            {p.size_label}
                          </span>
                        ) : null}
                      </span>
                      <span className="text-xl font-black font-mono text-amber-200 whitespace-nowrap">
                        {formatUSD(p.price)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <footer className="px-8 py-3 border-t border-amber-500/20 bg-black/40 text-center flex-shrink-0">
        <p className="text-[10px] text-amber-300/50 uppercase tracking-[0.4em]">
          ¡Síguenos en instagram! @lapaletacafe
        </p>
      </footer>
    </div>
  );
}