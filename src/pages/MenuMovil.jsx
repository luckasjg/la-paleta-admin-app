import React, { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useMobileCart } from '@/lib/useMobileCart';
import { useCustomerProfile } from '@/lib/useCustomerProfile';
import MenuHero from '@/components/menu/MenuHero';
import FlavorCarousel from '@/components/menu/FlavorCarousel';
import ProductCatalog from '@/components/menu/ProductCatalog';
import CartSheet from '@/components/menu/CartSheet';
import CheckoutSheet from '@/components/menu/CheckoutSheet';
import ChannelSelector from '@/components/menu/ChannelSelector';
import FlavorPickerSheet from '@/components/menu/FlavorPickerSheet';
import VesselPickerSheet from '@/components/menu/VesselPickerSheet';

const POLL_MS = 30000;

/**
 * Menú móvil optimizado para QR — versión ligera y rápida.
 */
export default function MenuMovil() {
  const [trays, setTrays] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [channel, setChannel] = useState('pickup');
  const [channelNotice, setChannelNotice] = useState('');
  const [flavorProduct, setFlavorProduct] = useState(null);
  const [vesselProduct, setVesselProduct] = useState(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const cart = useMobileCart();
  const { profile, register, forget } = useCustomerProfile();

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
      setAllProducts(
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

  // Filtro por modalidad: en delivery solo los productos marcados como disponibles.
  const products =
    channel === 'delivery'
      ? allProducts.filter((p) => p.disponible_para_delivery === true)
      : allProducts;

  const handleChannelChange = (next) => {
    setChannel(next);
    const allowed =
      next === 'delivery'
        ? allProducts.filter((p) => p.disponible_para_delivery === true)
        : allProducts;
    const removed = cart.removeUnavailable(allowed.map((p) => p.id));
    setChannelNotice(
      removed > 0
        ? `Quitamos ${removed} producto${removed > 1 ? 's' : ''} de tu pedido que no está disponible en esta modalidad.`
        : ''
    );
  };

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

  const flavorTrays = Array.from(new Map(trays.map((t) => [t.recipe_name, t])).values()).sort(
    (a, b) => (a.recipe_name || '').localeCompare(b.recipe_name || '', 'es', { sensitivity: 'base' })
  );

  const productNeedsFlavor = (p) => p.requires_flavor === true || p.category === 'helado';

  const handleAddProduct = (p) => {
    if (productNeedsFlavor(p)) {
      setFlavorProduct(p);
    } else if (p.vessel_optional) {
      setVesselProduct(p);
    } else {
      cart.addProduct(p);
      setIsCartOpen(true);
    }
  };

  const productsByCategory = products.reduce((acc, p) => {
    const cat = p.category || 'Otros';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  const sectionTitle =
    'mb-3 flex items-center gap-2 text-[22px] font-[950] leading-none tracking-[-0.04em] text-[#24252b] before:block before:h-[22px] before:w-[10px] before:rounded-full before:bg-[#F0A23B] before:shadow-[7px_0_#F6D5C0]';

  return (
    <div className="menu-font relative min-h-screen overflow-x-clip bg-[#F4F4F6] pb-[86px] text-[#24252b]">
      <MenuHero profile={profile} onForget={forget} />

      <ChannelSelector value={channel} onChange={handleChannelChange} />
      {channelNotice && (
        <p className="mx-[14px] mb-4 rounded-[14px] bg-[#FFF3E8] px-2.5 py-2 text-[11px] text-[#4a3023]">
          {channelNotice}
        </p>
      )}

      {/* Sabores */}
      <section className="menu-wave menu-anim-rise menu-delay-25 relative mb-5 px-4 pb-[25px] pt-[17px]">
        <h2 className={sectionTitle}>Sabores Disponibles</h2>
        <div className="relative z-[1]">
          <FlavorCarousel flavors={uniqueFlavors} />
        </div>
      </section>

      {/* Precios */}
      <section className="menu-wave menu-anim-rise menu-delay-35 relative mb-5 px-4 pb-[25px] pt-[17px]">
        <h2 className={sectionTitle}>Carta y Precios</h2>
        <div className="relative z-[1]">
          <ProductCatalog productsByCategory={productsByCategory} onAdd={handleAddProduct} />
          {products.length === 0 && (
            <p className="menu-anim-cardin rounded-[20px] bg-white p-6 text-center text-[12px] font-extrabold text-[#777984] shadow-[0_10px_22px_#16161d12]">
              {channel === 'delivery'
                ? 'Aún no hay productos habilitados para delivery.'
                : 'Sin productos publicados'}
            </p>
          )}
        </div>
      </section>

      <footer className="mt-[18px] border-t border-[#E1E1E6] bg-white px-4 pb-6 pt-[22px] text-center text-[10px] font-[900] uppercase tracking-[0.13em] text-[#777984]">
        Síguenos en instagram · @lapaletacafe
      </footer>

      {flavorProduct && (
        <FlavorPickerSheet
          product={flavorProduct}
          trays={flavorTrays}
          recipes={recipes}
          onCancel={() => setFlavorProduct(null)}
          onConfirm={({ flavors, surcharge }) => {
            cart.addProduct(flavorProduct, { flavors, surcharge });
            setFlavorProduct(null);
            setIsCartOpen(true);
          }}
        />
      )}

      {vesselProduct && (
        <VesselPickerSheet
          product={vesselProduct}
          onCancel={() => setVesselProduct(null)}
          onConfirm={(vessel) => {
            cart.addProduct(vesselProduct, { vessel });
            setVesselProduct(null);
            setIsCartOpen(true);
          }}
        />
      )}

      <CartSheet
        items={cart.items}
        total={cart.total}
        count={cart.count}
        isOpen={isCartOpen}
        onToggle={() => setIsCartOpen((v) => !v)}
        onSetQuantity={cart.setQuantity}
        onRemove={cart.removeItem}
        onCheckout={() => setIsCheckoutOpen(true)}
      />

      {isCheckoutOpen && (
        <CheckoutSheet
          items={cart.items}
          total={cart.total}
          channel={channel}
          onChannelChange={handleChannelChange}
          profile={profile}
          onRegister={register}
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