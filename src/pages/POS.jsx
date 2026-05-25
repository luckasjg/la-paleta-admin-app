import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShoppingCart, Plus, Minus, Trash2, Gift, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';
import { useExchangeRate, formatUSD, formatVES } from '@/lib/useExchangeRate';
import ExchangeRateInput from '@/components/pos/ExchangeRateInput';
import MixedPaymentDialog from '@/components/pos/MixedPaymentDialog';

export default function POS() {
  const [cart, setCart] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [flavorDialog, setFlavorDialog] = useState(null);
  const [selectedFlavors, setSelectedFlavors] = useState([]);
  const [payDialog, setPayDialog] = useState(false);
  const { rate: exchangeRate, setRate: setExchangeRate } = useExchangeRate();
  const qc = useQueryClient();

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

  const activeProducts = products.filter(p => p.is_active !== false);

  // Build dynamic categories from active products
  const categoryOrder = ['helado', 'cafe', 'merengada', 'adicional', 'otro'];
  const allCats = [...new Set(activeProducts.map(p => p.category).filter(Boolean))];
  const categories = [
    ...categoryOrder.filter(c => allCats.includes(c)),
    ...allCats.filter(c => !categoryOrder.includes(c)),
  ];

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

  const addToCart = (product) => {
    if (productNeedsFlavor(product)) {
      const totalGrams = product.grams_per_serving || 80;
      // Start with 1 flavor; cashier can add up to max_flavors
      const portions = splitGramsEqually(totalGrams, 1);
      setFlavorDialog(product);
      setSelectedFlavors([{ tray_id: '', grams: portions[0] }]);
    } else {
      setCart(prev => {
        const existing = prev.find(i => i.product_id === product.id && !i.tray_id && !i.is_courtesy);
        if (existing) {
          return prev.map(i => i === existing ? { ...i, quantity: i.quantity + 1, subtotal: (i.quantity + 1) * i.unit_price } : i);
        }
        return [...prev, {
          product_id: product.id,
          product_name: product.name,
          category: product.category,
          recipe_id: product.recipe_id,
          utensil_supply_id: product.utensil_supply_id || '',
          grams: product.grams_per_serving || 0,
          quantity: 1,
          unit_price: product.price,
          subtotal: product.price,
          is_courtesy: false,
        }];
      });
    }
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

  const addIceCreamToCart = () => {
    if (!flavorDialog || !allFlavorsFilled) return;
    const product = flavorDialog;
    const flavorLabel = selectedFlavors.map(f => {
      const tray = trays.find(t => t.id === f.tray_id);
      return tray ? tray.recipe_name : '';
    }).join(' + ');

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
      grams: targetGrams,
      quantity: 1,
      unit_price: product.price,
      subtotal: product.price,
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
        });
      }

      // Deduct supplies / utensils per item (these are not affected by the bug)
      for (const item of cart) {
        // Deduct supplies for café/merengada
        if ((item.category === 'cafe' || item.category === 'merengada') && item.recipe_id) {
          const recipe = recipes.find(r => r.id === item.recipe_id);
          if (recipe) {
            for (const ing of (recipe.ingredients || [])) {
              const supply = supplies.find(s => s.id === ing.supply_id);
              if (supply && !supply.is_infinite) {
                const needed = (ing.quantity || 0) * item.quantity;
                await base44.entities.Supply.update(supply.id, {
                  stock_current: Math.max(0, supply.stock_current - needed),
                });
              }
            }
          }
        }
        // Deduct utensilio vinculado (always, even if courtesy)
        if (item.utensil_supply_id) {
          const utensil = supplies.find(s => s.id === item.utensil_supply_id);
          if (utensil && !utensil.is_infinite) {
            await base44.entities.Supply.update(utensil.id, {
              stock_current: Math.max(0, (utensil.stock_current || 0) - item.quantity),
            });
          }
        }
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

      await base44.entities.Sale.create({
        items: cart,
        total,
        exchange_rate,
        payments,
        payment_method: legacyMethod,
        cash_amount: +cashUSD.toFixed(2),
        digital_amount: +digitalUSD.toFixed(2),
        sale_date: new Date().toISOString(),
        shift: getCurrentShift(),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trays'] });
      qc.invalidateQueries({ queryKey: ['supplies'] });
      qc.invalidateQueries({ queryKey: ['sales'] });
      setCart([]);
      setPayDialog(false);
      toast.success('¡Venta registrada!');
    },
    onError: (err) => toast.error(err.message),
  });

  const totalVES = total * exchangeRate;

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-5rem)]">
      {/* Product Grid */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <Tabs value={activeCat} onValueChange={setSelectedCategory} className="flex-1 min-w-0">
            <TabsList className="w-full justify-start overflow-x-auto">
              {categories.map(c => (
                <TabsTrigger key={c} value={c} className="text-sm px-4 py-2 capitalize">
                  {c}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <ExchangeRateInput rate={exchangeRate} setRate={setExchangeRate} requireConfirm={payDialog} />
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredProducts.map(p => (
              <button
                key={p.id}
                onClick={() => addToCart(p)}
                className="bg-card border border-border rounded-xl p-4 text-left hover:shadow-lg hover:border-primary/30 transition-all active:scale-95"
              >
                <p className="font-semibold text-sm">{p.name}</p>
                {p.size_label && <p className="text-xs text-muted-foreground">{p.size_label}</p>}
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-lg font-bold text-primary">${p.price?.toFixed(2)}</span>
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
      <Card className="lg:w-80 xl:w-96 flex flex-col max-h-full">
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
                <div className="text-sm font-semibold">${item.subtotal.toFixed(2)}</div>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFlavorDialog(null)}>Cancelar</Button>
            <Button onClick={addIceCreamToCart} disabled={!allFlavorsFilled || !flavorGramsOk}>Agregar</Button>
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