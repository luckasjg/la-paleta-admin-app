import React, { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { formatUSD } from '@/lib/useExchangeRate';
import { Plus } from 'lucide-react';
import { useMobileCart } from '@/lib/useMobileCart';
import CartSheet from '@/components/menu/CartSheet';
import CheckoutSheet from '@/components/menu/CheckoutSheet';

const POLL_MS = 30000;
const FALLBACK_IMG =
  'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?w=400&q=70&auto=format&fit=crop';

/**
 * Menú móvil optimizado para QR — versión ligera y rápida.
 */
export default function MenuMovil() {
  const [trays, setTrays] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [products, setProducts] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const cart = useMobileCart();

  const fetchData = useCallback(async () => {
    try {
      const [traysData, recipesData, productsData] = await Promise.all([
        base44.entities.Tray.list('-production_date', 200),
        base44.entities.Recipe.list(),
        base44.entities.Product.list('sort_order', 200),
      ]);
      setTrays(
        (traysData || []).filter(
          (t) => t.status === 'activa' && (t.remaining_grams || 0) > 0 && t.in_vitrine === true
        )
      );
      setRecipes(recipesData || []);
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
    return () => clearInterval(interval);
  }, [fetchData]);

  const uniqueFlavors = Array.from(
    new Map(trays.map((t) => [t.recipe_name, t])).values()
  ).sort((a, b) =>
    (a.recipe_name || '').localeCompare(b.recipe_name || '', 'es', { sensitivity: 'base' })
  ).map((t) => {
    const recipe = recipes.find((r) => r.id === t.recipe_id);
    return {
      id: t.id,
      name: t.recipe_name,
      imageUrl: recipe?.image_url,
      tag: recipe?.flavor_tag,
    };
  });

  const productsByCategory = products.reduce((acc, p) => {
    const cat = p.category || 'Otros';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a0e0a] via-[#2a1410] to-[#0f0806] text-white pb-24">
      {/* Header */}
      <header className="px-5 py-6 border-b border-amber-500/20 bg-black/30 text-center">
        <img
          src="https://media.base44.com/images/public/69e078117e2725c0776d724e/649909b33_logoPaletaMesadetrabajo8-111.png"
          alt="Logo"
          className="h-16 w-auto mx-auto mb-2 drop-shadow-lg"
        />
        <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-amber-200 to-amber-500 bg-clip-text text-transparent">
          LA PALETA CAFE
        </h1>
        <p className="text-amber-300/70 text-[10px] uppercase tracking-[0.3em] mt-1">
          Helados artesanales
        </p>
      </header>

      {/* Sabores */}
      <section className="px-4 py-6">
        <h2 className="text-xl font-black mb-4 text-amber-100 flex items-center gap-2">
          <span className="w-1.5 h-6 bg-amber-400 rounded-full" />
          Sabores Disponibles
        </h2>

        {uniqueFlavors.length === 0 ? (
          <p className="text-amber-200/40 text-center py-6">Preparando sabores...</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {uniqueFlavors.map((f) => (
              <div
                key={f.id}
                className="relative overflow-hidden rounded-xl border border-amber-400/30 bg-amber-900/20 aspect-square"
              >
                <img
                  src={f.imageUrl || FALLBACK_IMG}
                  alt={f.name}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover"
                  onError={(e) => {
                    if (e.currentTarget.src !== FALLBACK_IMG)
                      e.currentTarget.src = FALLBACK_IMG;
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                {f.tag && f.tag !== 'Regular' && (
                  <span className="absolute top-2 right-2 bg-amber-400 text-black text-[9px] font-black uppercase px-1.5 py-0.5 rounded">
                    {f.tag}
                  </span>
                )}
                <p className="absolute bottom-2 left-2 right-2 text-sm font-black text-amber-50 leading-tight drop-shadow-lg">
                  {f.name}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Precios */}
      <section className="px-4 pb-10">
        <h2 className="text-xl font-black mb-4 text-amber-100 flex items-center gap-2">
          <span className="w-1.5 h-6 bg-amber-400 rounded-full" />
          Carta y Precios
        </h2>

        <div className="space-y-5">
          {Object.entries(productsByCategory).map(([cat, items]) => (
            <div key={cat}>
              <h3 className="text-[10px] uppercase tracking-[0.3em] text-amber-400/80 font-bold mb-2 border-b border-amber-500/20 pb-1">
                {cat}
              </h3>
              <div className="space-y-2">
                {items.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-2 border-b border-dashed border-amber-500/10 pb-2"
                  >
                    <span className="text-sm text-amber-50 flex-1">
                      {p.name}
                      {p.size_label && (
                        <span className="text-amber-300/60 text-xs ml-1">
                          {p.size_label}
                        </span>
                      )}
                    </span>
                    <span className="text-sm font-black font-mono text-amber-200 whitespace-nowrap">
                      {formatUSD(p.price)}
                    </span>
                    <button
                      onClick={() => {
                        cart.addProduct(p);
                        setIsCartOpen(true);
                      }}
                      aria-label={`Agregar ${p.name}`}
                      className="h-9 w-9 shrink-0 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-200 active:bg-amber-500/40"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {products.length === 0 && (
            <p className="text-amber-200/40 text-center py-6">Sin productos publicados</p>
          )}
        </div>
      </section>

      <footer className="px-4 py-4 border-t border-amber-500/20 bg-black/40 text-center">
        <p className="text-[10px] text-amber-300/50 uppercase tracking-[0.3em]">
          Síguenos en instagram · @lapaletacafe
        </p>
      </footer>

      <CartSheet
        items={cart.items}
        total={cart.total}
        count={cart.count}
        isOpen={isCartOpen}
        onToggle={() => setIsCartOpen((v) => !v)}
        onSetQuantity={cart.setQuantity}
        onSetFlavor={cart.setFlavor}
        onRemove={cart.removeItem}
        onCheckout={() => setIsCheckoutOpen(true)}
        flavorOptions={uniqueFlavors.map((f) => f.name)}
      />

      {isCheckoutOpen && (
        <CheckoutSheet
          items={cart.items}
          total={cart.total}
          onClose={() => setIsCheckoutOpen(false)}
          onSent={() => {
            cart.clear();
            setIsCheckoutOpen(false);
            setIsCartOpen(false);
          }}
        />
      )}
    </div>
  );
}