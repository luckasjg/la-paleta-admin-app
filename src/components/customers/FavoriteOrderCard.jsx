import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { setPendingOrder } from '@/lib/posHandoff';

// Precarga en el POS el pedido favorito. Los sabores se eligen de nuevo en caja
// porque las bandejas de ventas anteriores ya no son las mismas.
export default function FavoriteOrderCard({ customer, favorite }) {
  const navigate = useNavigate();
  if (!favorite) return null;
  const repeat = () => {
    setPendingOrder({
      order_number: 'Favorito',
      customer_name: customer.full_name,
      items: [{ product_id: favorite.product_id, product_name: favorite.product_name, quantity: 1, vessel: favorite.vessel || null }],
    });
    navigate('/pos');
  };
  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center gap-3">
      <Star className="h-5 w-5 text-primary shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Pedido favorito · {favorite.count} veces</p>
        <p className="font-semibold truncate">{favorite.product_name}</p>
        {favorite.flavor && <p className="text-xs text-muted-foreground truncate">Sabores: {favorite.flavor}</p>}
      </div>
      <Button size="sm" onClick={repeat}><ShoppingCart className="h-4 w-4" /> Repetir en POS</Button>
    </div>
  );
}