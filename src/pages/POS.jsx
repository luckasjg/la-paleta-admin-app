import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShoppingCart, Plus, Minus, Trash2, Gift, AlertTriangle, Coffee, GlassWater } from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';
import { useExchangeRate, formatUSD, formatVES } from '@/lib/useExchangeRate';
import { useCurrencySymbol } from '@/lib/useCurrencySymbol';
import ExchangeRateInput from '@/components/pos/ExchangeRateInput';
import MixedPaymentDialog from '@/components/pos/MixedPaymentDialog';
import { depositSalePaymentsToWallets } from '@/lib/walletHelpers';
import StockLocationSelector from '@/components/shared/StockLocationSelector';
import { buildStockDelta, getStockAt, LOCATION_LABEL } from '@/lib/stockHelpers';
import { applyCategoryOrder } from '@/lib/categoryOrder';
import RegisterOpenGate from '@/components/pos/RegisterOpenGate';
import { getActiveSession, setActiveSession, clearActiveSession } from '@/lib/cashSession';

export default function POS() {
  const [cart, setCart] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [flavorDialog, setFlavorDialog] = useState(null);
  const [selectedFlavors, setSelectedFlavors] = useState([]);
  const [payDialog, setPayDialog] = useState(false);
  // Diálogo para elegir Taza (cerámica) vs Vaso (desechable) — sólo en productos con vessel_optional
  const [vesselDialog, setVesselDialog] = useState(null);
  // Origen de Materia Prima para esta venta (aplica a toda la orden).
  const [sourceLocation, setSourceLocation] = useState('production');
  const { rate: exchangeRate, setRate: setExchangeRate } = useExchangeRate();
  const { symbol: currency } = useCurrencySymbol();
  const qc = useQueryClient();

  // ── Sesión de caja activa (obligatoria para vender) ──────────────────────
  // Verificamos contra el servidor que exista una CashRegister 'abierta'.
  // Si la del localStorage ya no existe/cerró, la limpiamos.
  const { data: activeSession, isLoading: loadingSession } = useQuery({
    queryKey: ['active_cash_session'],
    queryFn: async () => {
      const local = getActiveSession();
      if (local?.id) {
        // Validar contra el servidor
        try {
          const rec = await base44.entities.CashRegister.filter({ id: local.id });
          const found = Array.isArray(rec) ? rec[0] : rec;
          if (found && found.status === 'abierta') return local;
        } catch { /* fallthrough */ }
        clearActiveSession();
      }
      // Buscar cualquier sesión abierta (por si fue abierta en otro dispositivo)
      const open = await base44.entities.CashRegister.filter({ status: 'abierta' });
      if (Array.isArray(open) && open.length > 0) {
        const s = open[0];
        const session = {
          id: s.id,
          staff_id: s.staff_id,
          staff_name: s.staff_name,
          shift: s.shift,
          date: s.date,
          opened_at: s.opened_at,
        };
        setActiveSession(session);
        return session;
      }
      return null;
    },
    staleTime: 30 * 1000,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list(),
  });

  const { data: trays = [] } = useQuery({
    queryKey: ['trays'],
    queryFn: () => base44.entities.Tray.filter({ status: 'activa' }),
  });

  const { data: recipes = [] } = useQuery({
    queryKey: ['recipes'],
    queryFn: () => base44.entities.Recipe.list(),
  });

  const { data: supplies = [] } = useQuery({
    queryKey: ['supplies'],
    queryFn: () => base44.entities.Supply.list(),
  });

  const { data: wallets = [] } = useQuery({
    queryKey: ['wallets'],
    queryFn: () => base44.entities.Wallet.list(),
  });

  const activeProducts = products.filter(p => p.is_active !== false);

  // Build dynamic categories from active products. El orden por defecto se
  // mantiene como fallback; si el usuario reordena en /productos, se respeta
  // esa preferencia (persistida en localStorage).
  const categoryOrder = ['helado', 'cafe', 'merengada', 'adicional', 'otro'];
  const allCats = [...new Set(activeProducts.map(p => p.category).filter(Boolean))];
  const baseCategories = [
    ...categoryOrder.filter(c => allCats.includes(c)),
    ...allCats.filter(c => !categoryOrder.includes(c)),
  ];
  const categories = applyCategoryOrder(baseCategories);

  const activeCat = selectedCategory || categories[0] || 'helado';
  const filteredProducts = activeProducts
    .filter(p => p.category === activeCat)
    .sort((a, b) => {
      const oa = a.sort_order ?? 99;
      const ob = b.sort_order ?? 99;
      if (oa !== ob) return oa - ob;
      return (a.name || '').localeCompare(b.name || '');
    });

  // A product needs flavor selection if explicitly flagged OR if it's a helado (legacy default)
  const productNeedsFlavor = (p) => p.requires_flavor === true || p.category === 'helado';
  const productMaxFlavors = (p) => Math.max(1, p.max_flavors || p.flavor_count || 1);

  // Split grams equally across N flavors (last slot absorbs rounding remainder so the sum is exact)
  const splitGramsEqually = (totalGrams, n) => {
    const base = Math.floor(totalGrams / n);
    const arr = Array.from({ length: n }, () => base);
    arr[n - 1] = totalGrams - base * (n - 1);
    return arr;
  };

  const pushSimpleProductToCart = (product, vessel = null) => {
    setCart(prev => {
      const existing = prev.find(i =>
        i.product_id === product.id && !i.tray_id && !i.is_courtesy && (i.vessel || null) === vessel
      );
      if (existing) {
        return prev.map(i => i === existing ? { ...i, quantity: i.quantity + 1, subtotal: (i.quantity + 1) * i.unit_price } : i);
      }
      return [...prev, {
        product_id: product.id,
        product_name: product.name,
        category: product.category,
        recipe_id: product.recipe_id,
        utensil_supply_id: product.utensil_supply_id || '',
        linked_supplies: Array.isArray(product.linked_supplies) ? product.linked_supplies : [],
        grams: product.grams_per_serving || 0,
        quantity: 1,
        unit_price: product.price,
        subtotal: product.price,
        is_courtesy: false,
        vessel, // 'taza' | 'vaso' | null
      }];
    });
  };

  const addToCart = (product) => {
    if (productNeedsFlavor(product)) {
      const totalGrams = product.grams_per_serving || 80;
      // Start with 1 flavor; cashier can add up to max_flavors
      const portions = splitGramsEqually(totalGrams, 1);
      setFlavorDialog(product);
      setSelectedFlavors([{ tray_id: '', grams: portions[0] }]);
    } else if (product.vessel_optional) {
      // Pide elección de recipiente antes de añadir
      setVesselDialog(product);
    } else {
      pushSimpleProductToCart(product);
    }
  };

  const confirmVesselChoice = (vessel) => {
    if (!vesselDialog) return;
    pushSimpleProductToCart(vesselDialog, vessel);
    setVesselDialog(null);
  };

  const targetGrams = flavorDialog?.grams_per_serving || 80;
  const maxFlavors = flavorDialog ? productMaxFlavors(flavorDialog) : 1;
  const totalFlavorGrams = selectedFlavors.reduce((s, f) => s + (parseFloat(f.grams) || 0), 0);
  const flavorGramsOk = Math.abs(totalFlavorGrams - targetGrams) <= 1;
  const allFlavorsFilled = selectedFlavors.every(f => f.tray_id);

  // Adding/removing a slot re-divides grams equally so the cashier never has to do the math.
  const addFlavorSlot = () => {
    if (selectedFlavors.length >= maxFlavors) return;
    const n = selectedFlavors.length + 1;
    const portions = splitGramsEqually(targetGrams, n);
    setSelectedFlavors(prev => prev.map((f, i) => ({ ...f, grams: portions[i] })).concat([{ tray_id: '', grams: portions[n - 1] }]));
  };

  const removeFlavorSlot = (idx) => {
    setSelectedFlavors(prev => {
      const next = prev.filter((_, i) => i !== idx);
      if (next.length === 0) return next;
      const portions = splitGramsEqually(targetGrams, next.length);
      return next.map((f, i) => ({ ...f, grams: portions[i] }));
    });
  };

  const updateFlavorSlot = (idx, field, value) => {
    setSelectedFlavors(prev => prev.map((f, i) => i === idx ? { ...f, [field]: value } : f));
  };

  // Devuelve el surcharge_per_gram de la receta vinculada a una bandeja
  const traySurchargePerGram = (trayId) => {
    const tray = trays.find(t => t.id === trayId);
    if (!tray) return 0;
    const recipe = recipes.find(r =>
      (tray.recipe_id && r.id === tray.recipe_id) || r.name === tray.recipe_name
    );
    if (!recipe || (recipe.flavor_tag || 'Regular') === 'Regular') return 0;
    return recipe.surcharge_per_gram || 0;
  };

  // Recargo total para la selección actual de sabores (suma gramos × $/g de cada sabor)
  const computeFlavorSurcharge = (flavors) =>
    flavors.reduce((sum, f) => {
      if (!f.tray_id) return sum;
      return sum + (parseFloat(f.grams) || 0) * traySurchargePerGram(f.tray_id);
    }, 0);

  const previewSurcharge = flavorDialog ? computeFlavorSurcharge(selectedFlavors) : 0;

  const addIceCreamToCart = () => {
    if (!flavorDialog || !allFlavorsFilled) return;
    const product = flavorDialog;
    const flavorLabel = selectedFlavors.map(f => {
      const tray = trays.find(t => t.id === f.tray_id);
      return tray ? tray.recipe_name : '';
    }).join(' + ');

    const surcharge = computeFlavorSurcharge(selectedFlavors);
    const finalPrice = +(product.price + surcharge).toFixed(2);

    setCart(prev => [...prev, {
      product_id: product.id,
      product_name: product.name,
      category: product.category,
      recipe_id: product.recipe_id,
      flavor: flavorLabel,
      flavors: selectedFlavors.map(f => {
        const tray = trays.find(t => t.id === f.tray_id);
        return { tray_id: f.tray_id, recipe_name: tray?.recipe_name || '', grams: parseFloat(f.grams) || 0 };
      }),
      tray_id: selectedFlavors[0].tray_id,
      utensil_supply_id: product.utensil_supply_id || '',
      linked_supplies: Array.isArray(product.linked_supplies) ? product.linked_supplies : [],
      grams: targetGrams,
      quantity: 1,
      base_price: product.price,
      flavor_surcharge: +surcharge.toFixed(2),
      unit_price: finalPrice,
      subtotal: finalPrice,
      is_courtesy: false,
    }]);

    setFlavorDialog(null);
    setSelectedFlavors([]);
  };

  const updateQty = (index, delta) => {
    setCart(prev => prev.map((item, i) => {
      if (i !== index) return item;
      const newQty = Math.max(0, item.quantity + delta);
      if (newQty === 0) return null;
      const price = item.is_courtesy ? 0 : item.unit_price;
      return { ...item, quantity: newQty, subtotal: newQty * price };
    }).filter(Boolean));
  };

  const removeItem = (index) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  const toggleCourtesy = (index) => {
    setCart(prev => prev.map((item, i) => {
      if (i !== index) return item;
      const newIsCourtesy = !item.is_courtesy;
      return {
        ...item,
        is_courtesy: newIsCourtesy,
        subtotal: newIsCourtesy ? 0 : item.quantity * item.unit_price,
      };
    }));
  };

  const total = cart.reduce((sum, i) => sum + i.subtotal, 0);

  // ── Stock warnings: aggregate grams demanded per tray across the cart ──
  // and compare against current tray stock. Returns one entry per overdrawn tray.
  const stockWarnings = React.useMemo(() => {
    const demand = {}; // tray_id -> total grams demanded by the cart
    for (const item of cart) {
      const flavorList = (item.flavors && item.flavors.length > 0)
        ? item.flavors
        : (item.tray_id ? [{ tray_id: item.tray_id, grams: item.grams || 0 }] : []);
      for (const fl of flavorList) {
        if (!fl.tray_id) continue;
        demand[fl.tray_id] = (demand[fl.tray_id] || 0) + (fl.grams || 0) * item.quantity;
      }
    }
    const warnings = [];
    for (const [trayId, demanded] of Object.entries(demand)) {
      const tray = trays.find(t => t.id === trayId);
      if (!tray) continue;
      const available = tray.remaining_grams || 0;
      if (demanded > available) {
        warnings.push({
          tray_id: trayId,
          name: tray.recipe_name,
          demanded,
          available,
          missing: demanded - available,
        });
      }
    }
    return warnings;
  }, [cart, trays]);

  const getCurrentShift = () => {
    const hour = moment().hour();
    if (hour < 12) return 'manana';
    if (hour < 18) return 'tarde';
    return 'noche';
  };

  const completeSale = useMutation({
    mutationFn: async ({ payments, exchange_rate }) => {
      // ── Aggregate ALL grams demanded per tray across the ENTIRE cart ────────
      // Previously we updated each tray multiple times inside the loop, which
      // overwrote earlier deductions when the same tray appeared in several items.
      // Now we sum demand per tray_id first, then issue ONE update per tray.
      const trayDemand = {}; // tray_id -> total grams
      for (const item of cart) {
        const flavorList = (item.flavors && item.flavors.length > 0)
          ? item.flavors
          : (item.tray_id ? [{ tray_id: item.tray_id, grams: item.grams || 0 }] : []);
        for (const fl of flavorList) {
          if (!fl.tray_id) continue;
          trayDemand[fl.tray_id] = (trayDemand[fl.tray_id] || 0) + (fl.grams || 0) * item.quantity;
        }
      }

      // Apply tray deductions ONCE per tray. Allow negative remaining_grams so the
      // full real deduction is recorded (physical audit will reconcile any merma).
      for (const [trayId, gramsToDeduct] of Object.entries(trayDemand)) {
        const tray = trays.find(t => t.id === trayId);
        if (!tray) continue;
        const newRemaining = (tray.remaining_grams || 0) - gramsToDeduct;
        await base44.entities.Tray.update(trayId, {
          remaining_grams: newRemaining,
          status: newRemaining <= 0 ? 'agotada' : 'activa',
          ...(newRemaining <= 0 ? { in_vitrine: false, closed_at: new Date().toISOString() } : {}),
        });
      }

      // ── Aggregate supply deductions across the ENTIRE cart ────────────────
      // Combines: (1) ingredientes de recetas (café/merengada),
      //           (2) linked_supplies del producto (múltiples insumos/utensilios),
      //           (3) utensil_supply_id legacy (sólo si no hay linked_supplies).
      // Una sola actualización por insumo evita sobrescrituras.
      const supplyDemand = {}; // supply_id -> cantidad total a descontar
      const addDemand = (supplyId, qty) => {
        if (!supplyId || !(qty > 0)) return;
        supplyDemand[supplyId] = (supplyDemand[supplyId] || 0) + qty;
      };

      for (const item of cart) {
        // (1) Recetas (café/merengada)
        if ((item.category === 'cafe' || item.category === 'merengada') && item.recipe_id) {
          const recipe = recipes.find(r => r.id === item.recipe_id);
          if (recipe) {
            for (const ing of (recipe.ingredients || [])) {
              addDemand(ing.supply_id, (ing.quantity || 0) * item.quantity);
            }
          }
        }

        // (2) linked_supplies (nuevo: múltiples insumos)
        const linked = Array.isArray(item.linked_supplies) ? item.linked_supplies : [];
        if (linked.length > 0) {
          for (const ls of linked) {
            // Si el cajero eligió "taza" (cerámica), no descontamos utensilios desechables.
            if (item.vessel === 'taza' && ls.type === 'utensilio') continue;
            addDemand(ls.supply_id, (ls.quantity || 0) * item.quantity);
          }
        } else if (item.utensil_supply_id) {
          // (3) Fallback legacy: utensil_supply_id (1 unidad por venta).
          // En modo "taza" tampoco descontamos el utensilio legacy.
          if (item.vessel !== 'taza') {
            addDemand(item.utensil_supply_id, item.quantity);
          }
        }
      }

      // Aplicar descuentos UNA sola vez por insumo desde la ubicación de origen elegida.
      for (const [supplyId, qtyToDeduct] of Object.entries(supplyDemand)) {
        const supply = supplies.find(s => s.id === supplyId);
        if (!supply || supply.is_infinite) continue;
        // Limitamos al disponible en la ubicación para no dejar negativos.
        const avail = getStockAt(supply, sourceLocation);
        const effective = Math.min(avail, qtyToDeduct);
        await base44.entities.Supply.update(
          supplyId,
          buildStockDelta(supply, sourceLocation, -effective)
        );
      }

      // Derive legacy summary fields for backwards compatibility with reports/cash register
      const cashUSD = payments
        .filter(p => p.method === 'efectivo_usd' || p.method === 'efectivo_ves')
        .reduce((s, p) => s + (p.amount_usd_equivalent || 0), 0);
      const digitalUSD = payments
        .filter(p => p.method !== 'efectivo_usd' && p.method !== 'efectivo_ves')
        .reduce((s, p) => s + (p.amount_usd_equivalent || 0), 0);
      const legacyMethod = payments.length > 1
        ? 'mixto'
        : (payments[0]?.method || 'efectivo_usd');

      // ── Vinculación obligatoria con la sesión de caja activa ─────────
      if (!activeSession?.id) {
        throw new Error('No hay sesión de caja abierta. Abre la caja antes de vender.');
      }

      const sale = await base44.entities.Sale.create({
        items: cart,
        total,
        exchange_rate,
        payments,
        payment_method: legacyMethod,
        cash_amount: +cashUSD.toFixed(2),
        digital_amount: +digitalUSD.toFixed(2),
        sale_date: new Date().toISOString(),
        shift: getCurrentShift(),
        cash_register_id: activeSession.id,
        staff_id: activeSession.staff_id,
        staff_name: activeSession.staff_name,
      });

      // Depositar pagos en las billeteras vinculadas (no bloquea si falla)
      try {
        await depositSalePaymentsToWallets({
          payments,
          exchange_rate,
          sale_id: sale?.id,
          wallets,
        });
      } catch (e) {
        console.error('Error depositando en billeteras:', e);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trays'] });
      qc.invalidateQueries({ queryKey: ['supplies'] });
      qc.invalidateQueries({ queryKey: ['sales'] });
      qc.invalidateQueries({ queryKey: ['wallets'] });
      qc.invalidateQueries({ queryKey: ['wallet_transactions'] });
      setCart([]);
      setPayDialog(false);
      toast.success('¡Venta registrada!');
    },
    onError: (err) => toast.error(err.message),
  });

  const totalVES = total * exchangeRate;

  // ── Bloqueo del POS si no hay sesión de caja abierta ─────────────────────
  if (loadingSession) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-7rem)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Verificando sesión de caja...</p>
        </div>
      </div>
    );
  }

  if (!activeSession) {
    return <RegisterOpenGate onOpened={() => qc.invalidateQueries({ queryKey: ['active_cash_session'] })} />;
  }

  return (
    <div className="flex flex-col md:flex-row gap-3 lg:gap-4 h-[calc(100vh-5rem)]">
      {/* Product Grid */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
          <div className="flex flex-wrap gap-2 flex-1 min-w-0">
            {categories.map(c => {
              const isActive = activeCat === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setSelectedCategory(c)}
                  className={`px-3 py-2 lg:px-5 lg:py-3 rounded-xl text-xs lg:text-sm font-bold capitalize border-2 transition-all active:scale-95 ${
                    isActive
                      ? 'bg-[#1a365d] text-white border-[#1a365d] shadow-md'
                      : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 hover:border-slate-300'
                  }`}
                  style={{ minWidth: '88px' }}
                >
                  {c}
                </button>
              );
            })}
          </div>
          <ExchangeRateInput rate={exchangeRate} setRate={setExchangeRate} requireConfirm={payDialog} />
        </div>

        <div className="flex items-center justify-between gap-2 mb-3 px-1 py-1.5 rounded-md bg-primary/5 border border-primary/20 text-xs">
          <span className="text-muted-foreground">
            Sesión abierta por <strong className="text-foreground">{activeSession.staff_name}</strong>
            {' · '}turno <span className="capitalize">{activeSession.shift}</span>
          </span>
          <span className="text-[10px] text-muted-foreground font-mono">
            {moment(activeSession.opened_at).format('DD/MM HH:mm')}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 lg:gap-3">
            {filteredProducts.map(p => (
              <button
                key={p.id}
                onClick={() => addToCart(p)}
                className="bg-card border border-border rounded-xl p-4 text-left hover:shadow-lg hover:border-primary/30 transition-all active:scale-95"
              >
                <p className="font-semibold text-sm">{p.name}</p>
                {p.size_label && <p className="text-xs text-muted-foreground">{p.size_label}</p>}
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-lg font-bold text-primary">{currency}{p.price?.toFixed(2)}</span>
                  {p.grams_per_serving > 0 && (
                    <Badge variant="secondary" className="text-xs">{p.grams_per_serving}g</Badge>
                  )}
                </div>
              </button>
            ))}
            {filteredProducts.length === 0 && (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                No hay productos en esta categoría
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cart */}
      <Card className="md:w-64 lg:w-80 xl:w-96 flex flex-col max-h-full">
        <div className="p-4 border-b border-border flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Orden Actual</h2>
          <Badge variant="secondary" className="ml-auto">{cart.length}</Badge>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
          {cart.map((item, idx) => (
            <div key={idx} className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${item.is_courtesy ? 'bg-amber-50 border border-amber-200' : 'bg-secondary/50'}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium truncate">{item.product_name}</p>
                  {item.is_courtesy && <Gift className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />}
                </div>
                {item.flavor && <p className="text-xs text-muted-foreground">{item.flavor} · {item.grams}g</p>}
                {item.vessel && (
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                    {item.vessel === 'taza'
                      ? <><Coffee className="h-3 w-3" /> En taza</>
                      : <><GlassWater className="h-3 w-3" /> En vaso</>
                    }
                  </p>
                )}
                {item.flavor_surcharge > 0 && (
                  <p className="text-[10px] text-amber-700 font-medium">
                    Base {currency}{item.base_price?.toFixed(2)} + recargo {currency}{item.flavor_surcharge.toFixed(2)}
                  </p>
                )}
                {item.is_courtesy && <p className="text-xs text-amber-600 font-medium">Cortesía</p>}
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateQty(idx, -1)}>
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="text-sm font-mono w-5 text-center">{item.quantity}</span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateQty(idx, 1)}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              <div className={`w-20 text-right ${item.is_courtesy ? 'text-amber-600' : ''}`}>
                <div className="text-sm font-semibold">{currency}{item.subtotal.toFixed(2)}</div>
                <div className="text-[10px] text-muted-foreground font-mono">{formatVES(item.subtotal * exchangeRate)}</div>
              </div>
              <div className="flex flex-col gap-0.5">
                <Button
                  variant="ghost" size="icon" className={`h-6 w-6 ${item.is_courtesy ? 'text-amber-500' : 'text-muted-foreground'}`}
                  title={item.is_courtesy ? 'Quitar cortesía' : 'Marcar como cortesía'}
                  onClick={() => toggleCourtesy(idx)}
                >
                  <Gift className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeItem(idx)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
          {cart.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <ShoppingCart className="h-8 w-8 mb-2 opacity-30" />
              <p className="text-sm">Carrito vacío</p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border space-y-3">
          <StockLocationSelector
            value={sourceLocation}
            onChange={setSourceLocation}
            label={`Origen Insumos (${LOCATION_LABEL[sourceLocation]})`}
          />
          {cart.some(i => i.is_courtesy) && (
            <div className="flex items-center justify-between text-xs text-amber-600">
              <span className="flex items-center gap-1"><Gift className="h-3 w-3" /> Cortesías incluidas</span>
              <span>Inventario se descuenta igual</span>
            </div>
          )}
          {stockWarnings.length > 0 && (
            <div className="rounded-lg border-2 border-amber-400 bg-amber-50 p-2.5 space-y-1.5">
              <div className="flex items-center gap-1.5 text-amber-800 font-semibold text-xs">
                <AlertTriangle className="h-4 w-4" /> ¡Atención! Stock insuficiente
              </div>
              {stockWarnings.map(w => (
                <div key={w.tray_id} className="text-[11px] text-amber-900 leading-tight">
                  <span className="font-semibold">{w.name}</span>: faltan{' '}
                  <span className="font-mono font-bold">{w.missing.toFixed(0)}g</span>
                  <span className="text-amber-700"> (disponible {w.available.toFixed(0)}g / pedido {w.demanded.toFixed(0)}g)</span>
                </div>
              ))}
              <p className="text-[10px] text-amber-700 italic pt-1 border-t border-amber-200">
                Puedes continuar la venta. Verifica el inventario físico al cierre.
              </p>
            </div>
          )}
          <div className="flex items-end justify-between">
            <span className="text-lg font-bold">Total</span>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary leading-tight">{formatUSD(total)}</div>
              <div className="text-sm text-muted-foreground font-mono">{formatVES(totalVES)}</div>
            </div>
          </div>
          <Button className="w-full h-12 text-base" disabled={cart.length === 0} onClick={() => setPayDialog(true)}>
            Cobrar
          </Button>
        </div>
      </Card>

      {/* Flavor selection dialog */}
      <Dialog open={!!flavorDialog} onOpenChange={() => setFlavorDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              Seleccionar Sabor — {flavorDialog?.name}
              <p className="text-sm font-normal text-muted-foreground mt-0.5">{targetGrams}g en total</p>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {selectedFlavors.map((fl, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className="flex-1">
                  <Select value={fl.tray_id} onValueChange={v => updateFlavorSlot(idx, 'tray_id', v)}>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder={`Sabor ${idx + 1}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {trays.map(t => {
                        const stock = t.remaining_grams || 0;
                        const isLow = stock < 200;
                        return (
                          <SelectItem key={t.id} value={t.id}>
                            <span className="flex items-center gap-2">
                              {t.recipe_name}
                              <span className={`font-mono text-xs ${isLow ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
                                {stock.toFixed(0)}g{isLow ? ' ⚠️' : ''}
                              </span>
                            </span>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <input
                    type="number"
                    min={1}
                    max={targetGrams}
                    value={fl.grams}
                    onChange={e => updateFlavorSlot(idx, 'grams', e.target.value)}
                    className="w-16 border border-input rounded-md px-2 py-1.5 text-sm text-center"
                  />
                  <span className="text-xs text-muted-foreground">g</span>
                </div>
                {selectedFlavors.length > 1 && (
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive flex-shrink-0" onClick={() => removeFlavorSlot(idx)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}

            <div className="flex items-center justify-between">
              {selectedFlavors.length < maxFlavors ? (
                <Button variant="outline" size="sm" onClick={addFlavorSlot} className="text-xs">
                  <Plus className="h-3 w-3 mr-1" /> Agregar sabor ({selectedFlavors.length}/{maxFlavors})
                </Button>
              ) : (
                <span className="text-xs text-muted-foreground">Máx. {maxFlavors} sabores</span>
              )}
              <span className={`text-sm font-semibold ${flavorGramsOk ? 'text-primary' : 'text-destructive'}`}>
                {totalFlavorGrams}g / {targetGrams}g
              </span>
            </div>

            {!flavorGramsOk && (
              <p className="text-xs text-destructive">Los gramos deben sumar exactamente {targetGrams}g</p>
            )}

            {/* Resumen de precio con recargo proporcional */}
            {flavorDialog && (
              <div className="rounded-md border border-border bg-muted/40 p-2.5 text-xs space-y-1 font-mono">
                <div className="flex justify-between text-muted-foreground">
                  <span>Precio base</span>
                  <span>{currency}{(flavorDialog.price || 0).toFixed(2)}</span>
                </div>
                {previewSurcharge > 0 && (
                  <div className="flex justify-between text-amber-700">
                    <span>Recargo sabor</span>
                    <span>+{currency}{previewSurcharge.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-primary border-t pt-1">
                  <span>Precio final</span>
                  <span>{currency}{((flavorDialog.price || 0) + previewSurcharge).toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFlavorDialog(null)}>Cancelar</Button>
            <Button onClick={addIceCreamToCart} disabled={!allFlavorsFilled || !flavorGramsOk}>Agregar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Vessel choice dialog (taza vs vaso) */}
      <Dialog open={!!vesselDialog} onOpenChange={() => setVesselDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              ¿Cómo se sirve? — {vesselDialog?.name}
              <p className="text-sm font-normal text-muted-foreground mt-0.5">
                Elige el recipiente para esta orden
              </p>
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <button
              type="button"
              onClick={() => confirmVesselChoice('taza')}
              className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all active:scale-95"
            >
              <Coffee className="h-10 w-10 text-primary" />
              <span className="font-semibold">Taza</span>
              <span className="text-[11px] text-muted-foreground text-center leading-tight">
                Cerámica<br />(no descuenta vaso)
              </span>
            </button>
            <button
              type="button"
              onClick={() => confirmVesselChoice('vaso')}
              className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all active:scale-95"
            >
              <GlassWater className="h-10 w-10 text-primary" />
              <span className="font-semibold">Vaso</span>
              <span className="text-[11px] text-muted-foreground text-center leading-tight">
                Desechable<br />(descuenta del stock)
              </span>
            </button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVesselDialog(null)}>Cancelar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mixed Payment dialog */}
      <MixedPaymentDialog
        open={payDialog}
        onOpenChange={setPayDialog}
        totalUSD={total}
        exchangeRate={exchangeRate}
        isProcessing={completeSale.isPending}
        onConfirm={(data) => completeSale.mutate(data)}
      />
    </div>
  );
}