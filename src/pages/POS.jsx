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
  const [selectedTray, setSelectedTray] = useState('');
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
      setSelectedTray('');
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

  const addIceCreamToCart = () => {
    if (!flavorDialog || !selectedTray) return;
    const tray = trays.find(t => t.id === selectedTray);
    if (!tray) return;
    const product = flavorDialog;

    setCart(prev => [...prev, {
      product_id: product.id,
      product_name: product.name,
      category: 'helado',
      flavor: tray.recipe_name,
      tray_id: tray.id,
      grams: product.grams_per_serving || 80,
      quantity: 1,
      unit_price: product.price,
      subtotal: product.price,
    }]);

    setFlavorDialog(null);
    setSelectedTray('');
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
        if (item.category === 'helado' && item.tray_id) {
          const tray = trays.find(t => t.id === item.tray_id);
          if (!tray) continue;
          const gramsToDeduct = (item.grams || 80) * item.quantity;
          const newRemaining = Math.max(0, (tray.remaining_grams || 0) - gramsToDeduct);
          await base44.entities.Tray.update(tray.id, {
            remaining_grams: newRemaining,
            status: newRemaining <= 0 ? 'agotada' : 'activa',
          });
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
            <DialogTitle>Seleccionar Sabor</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Select value={selectedTray} onValueChange={setSelectedTray}>
              <SelectTrigger><SelectValue placeholder="Elegir bandeja/sabor" /></SelectTrigger>
              <SelectContent>
                {trays.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.recipe_name} ({t.remaining_grams?.toFixed(0)}g restantes)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFlavorDialog(null)}>Cancelar</Button>
            <Button onClick={addIceCreamToCart} disabled={!selectedTray}>Agregar</Button>
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