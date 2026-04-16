import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShoppingCart, Plus, Minus, Trash2, CreditCard, Banknote, Smartphone, IceCream } from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';

export default function POS() {
  const [cart, setCart] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('helado');
  const [flavorDialog, setFlavorDialog] = useState(null); // product that needs flavor selection
  const [selectedFlavors, setSelectedFlavors] = useState([]); // [{tray_id, grams}]
  const [payDialog, setPayDialog] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('efectivo');
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
  const filteredProducts = activeProducts.filter(p => p.category === selectedCategory);

  const addToCart = (product) => {
    if (product.category === 'helado') {
      setFlavorDialog(product);
      setSelectedFlavors([{ tray_id: '', grams: product.grams_per_serving || 80 }]);
    } else {
      setCart(prev => {
        const existing = prev.find(i => i.product_id === product.id && !i.tray_id);
        if (existing) {
          return prev.map(i => i === existing ? { ...i, quantity: i.quantity + 1, subtotal: (i.quantity + 1) * i.unit_price } : i);
        }
        return [...prev, {
          product_id: product.id,
          product_name: product.name,
          category: product.category,
          recipe_id: product.recipe_id,
          grams: product.grams_per_serving || 0,
          quantity: 1,
          unit_price: product.price,
          subtotal: product.price,
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
      // Give grams back to last remaining
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
      tray_id: selectedFlavors[0].tray_id, // primary for compat
      grams: targetGrams,
      quantity: 1,
      unit_price: product.price,
      subtotal: product.price,
    }]);

    setFlavorDialog(null);
    setSelectedFlavors([]);
  };

  const updateQty = (index, delta) => {
    setCart(prev => prev.map((item, i) => {
      if (i !== index) return item;
      const newQty = Math.max(0, item.quantity + delta);
      if (newQty === 0) return null;
      return { ...item, quantity: newQty, subtotal: newQty * item.unit_price };
    }).filter(Boolean));
  };

  const removeItem = (index) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  const total = cart.reduce((sum, i) => sum + i.subtotal, 0);

  const getCurrentShift = () => {
    const hour = moment().hour();
    if (hour < 12) return 'manana';
    if (hour < 18) return 'tarde';
    return 'noche';
  };

  const completeSale = useMutation({
    mutationFn: async () => {
      // Deduct from trays (helado items)
      for (const item of cart) {
        if (item.category === 'helado') {
          // multi-flavor support
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
              if (supply) {
                const needed = (ing.quantity || 0) * item.quantity;
                await base44.entities.Supply.update(supply.id, {
                  stock_current: Math.max(0, supply.stock_current - needed),
                });
              }
            }
          }
        }
      }

      // Create sale
      await base44.entities.Sale.create({
        items: cart,
        total,
        payment_method: paymentMethod,
        cash_amount: paymentMethod === 'efectivo' ? total : paymentMethod === 'mixto' ? total / 2 : 0,
        digital_amount: paymentMethod !== 'efectivo' ? (paymentMethod === 'mixto' ? total / 2 : total) : 0,
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

  const categories = [
    { value: 'helado', label: 'Helados', icon: IceCream },
    { value: 'cafe', label: 'Café', icon: null },
    { value: 'merengada', label: 'Merengadas', icon: null },
    { value: 'adicional', label: 'Extras', icon: null },
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-5rem)]">
      {/* Product Grid */}
      <div className="flex-1 flex flex-col min-h-0">
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="mb-4">
          <TabsList className="w-full justify-start">
            {categories.map(c => (
              <TabsTrigger key={c.value} value={c.value} className="text-sm px-4 py-2">
                {c.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

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
            <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.product_name}</p>
                {item.flavor && <p className="text-xs text-muted-foreground">{item.flavor} · {item.grams}g</p>}
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
              <span className="text-sm font-semibold w-16 text-right">${item.subtotal.toFixed(2)}</span>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeItem(idx)}>
                <Trash2 className="h-3 w-3" />
              </Button>
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
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold">Total</span>
            <span className="text-2xl font-bold text-primary">${total.toFixed(2)}</span>
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

      {/* Payment dialog */}
      <Dialog open={payDialog} onOpenChange={setPayDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Método de Pago</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <p className="text-center text-2xl font-bold text-primary">${total.toFixed(2)}</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'efectivo', label: 'Efectivo', icon: Banknote },
                { value: 'pago_movil', label: 'Pago Móvil', icon: Smartphone },
                { value: 'punto_venta', label: 'Tarjeta', icon: CreditCard },
              ].map(pm => (
                <button
                  key={pm.value}
                  onClick={() => setPaymentMethod(pm.value)}
                  className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                    paymentMethod === pm.value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
                  }`}
                >
                  <pm.icon className="h-6 w-6" />
                  <span className="text-xs font-medium">{pm.label}</span>
                </button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDialog(false)}>Cancelar</Button>
            <Button onClick={() => completeSale.mutate()} disabled={completeSale.isPending} className="flex-1">
              {completeSale.isPending ? 'Procesando...' : 'Confirmar Venta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}