import React, { useState } from 'react';
import { Plus, IceCream2 } from 'lucide-react';
import { formatUSD } from '@/lib/useExchangeRate';

/** Tarjeta visual de producto: imagen grande, botón "+" flotante, precio destacado. */
export default function ProductCard({ product, onAdd }) {
  const [imgFailed, setImgFailed] = useState(false);
  const hasImage = Boolean(product.image_url) && !imgFailed;

  return (
    <div className="menu-anim-cardin overflow-hidden rounded-[22px] border border-[#E1E1E6] bg-white shadow-[0_10px_22px_#16161d10]">
      <div className="relative">
        {hasImage ? (
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            onError={() => setImgFailed(true)}
            className="block h-[168px] w-full object-cover"
          />
        ) : (
          <div className="flex h-[120px] w-full items-center justify-center bg-gradient-to-br from-[#F6D5C0] to-[#F0A23B]/40">
            <IceCream2 className="h-9 w-9 text-white/90" />
          </div>
        )}
        <button
          onClick={() => onAdd(product)}
          aria-label={`Agregar ${product.name}`}
          className="menu-btn absolute bottom-3 right-3 flex h-[42px] w-[42px] items-center justify-center rounded-full border-0 bg-[#F0A23B] text-[#24252b] shadow-[0_6px_14px_#16161d33] hover:bg-[#24252b] hover:text-white"
        >
          <Plus className="h-5 w-5" strokeWidth={3} />
        </button>
      </div>

      <div className="px-4 py-3">
        <p className="m-0 text-[14px] font-[950] leading-[1.2] tracking-[-0.02em] text-[#24252b]">
          {product.name}
        </p>
        {product.size_label && (
          <p className="mt-0.5 text-[11px] font-extrabold text-[#777984]">{product.size_label}</p>
        )}
        <p className="mt-1.5 text-[16px] font-[950] text-[#24252b]">{formatUSD(product.price)}</p>
      </div>
    </div>
  );
}