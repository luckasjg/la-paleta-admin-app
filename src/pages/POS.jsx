import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShoppingCart, Plus, Minus, Trash2, Gift } from 'lucide-react';
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
  const filteredProducts = activeProducts.filter(p => p.category === activeCat);

  const addToCart = (product) => {
    if (product.category === 'helado') {
      const count = product.flavor_count || 1;
      const gramsEach = Math.round((product.grams_per_serving || 80) / count);
      setFlavorDialog(product);
      setSelectedFlavors(Array.from({ length: count }, () => ({ tray_id: '', grams: gramsEach })));
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

  const totalFlavorGrams = selectedFlavors.reduce((s, f) => s + (parseFloat(f.grams) || 0), 0);
  const targetGrams = flavorDialog?.grams_per_serving || 80;
  const flavorGramsOk = Math.abs(totalFlavorGrams - targetGrams) <= 1;
  const allFlavorsFilled = selectedFlavors.every(f => f.tray_id);

  const addFlavorSlot = () => {
    if (selectedFlavors.length >= 3) return;
    const remaining = targetGrams - totalFlavorGrams;
    setSelectedFlavors(prev => [...prev.slice(0, -1).map(f => ({ ...f })),
      { ...prev[prev.length - 1], grams: Math.max(0, prev[prev.length - 1].grams - Math.ceil(remaining === 0 ? prev[prev.length - 1].grams / 2 : 0)) },
      { tray_id: '', grams: Math.ceil(remaining > 0 ? remaining : prev[prev.length - 1].grams / 2) }
    ]);
  };

  const removeFlavorSlot = (idx) => {
    setSelectedFlavors(prev => {
      const removed = prev[idx];
      const next = prev.filter((_, i) => i !== idx);
      if (next.length > 0) {
        next[next.length - 1] = { ...next[next.length - 1], grams: next[next.length - 1].grams + (parseFloat(removed.grams) || 0) };
      }
      return next;
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
      category: 'helado',
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

  const getCurrentShift = () => {
    const hour = moment().hour();
    if (hour < 12) return 'manana';
    if (hour < 18) return 'tarde';
    return 'noche';
  };

  const completeSale = useMutation({
    mutationFn: async ({ payments, exchange_rate }) => {
      // Deduct from trays (helado items)
      for (const item of cart) {
        if (item.category === 'helado') {
          const flavorList = item.flavors || [{ tray_id: item.tray_id, grams: item.grams || 80 }];
          for (const fl of flavorList) {
            if (!fl.tray_id) continue;
            const tray = trays.find(t => t.id === fl.tray_id);
            if (!tray) continue;
            const gramsToDeduct = (fl.grams || 0) * item.quantity;
            const newRemaining = Math.max(0, (tray.remaining_grams || 0) - gramsToDeduct);
            await base44.entities.Tray.update(tray.id, {
              remaining_grams: newRemaining,
              status: newRemaining <= 0 ? 'agotada' : 'activa',
            });
          }
        }
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
                      {trays.map(t => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.recipe_name} ({t.remaining_grams?.toFixed(0)}g)
                        </SelectItem>
                      ))}
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
              {selectedFlavors.length < 3 ? (
                <Button variant="outline" size="sm" onClick={addFlavorSlot} className="text-xs">
                  <Plus className="h-3 w-3 mr-1" /> Agregar sabor
                </Button>
              ) : <span />}
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