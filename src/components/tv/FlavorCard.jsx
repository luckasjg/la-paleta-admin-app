import React from 'react';

const FALLBACK_IMG =
  'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?w=600&q=70&auto=format&fit=crop';

/**
 * Tarjeta visual de un sabor con imagen + nombre.
 * Si el sabor (o su receta) no tiene image_url, usa un fallback elegante.
 */
export default function FlavorCard({ name, imageUrl, tag }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-amber-400/30 shadow-2xl bg-gradient-to-br from-amber-900/30 to-black/40 aspect-square">
      <img
        src={imageUrl || FALLBACK_IMG}
        alt={name}
        loading="lazy"
        className="absolute inset-0 w-full h-full object-cover"
        onError={(e) => {
          if (e.currentTarget.src !== FALLBACK_IMG) e.currentTarget.src = FALLBACK_IMG;
        }}
      />
      {/* Overlay degradado para legibilidad */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

      {tag && tag !== 'Regular' && (
        <span className="absolute top-3 right-3 bg-amber-400 text-black text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md shadow-lg">
          {tag}
        </span>
      )}

      <div className="absolute bottom-0 left-0 right-0 p-4">
        <p className="text-xl font-black text-amber-50 leading-tight drop-shadow-lg">
          {name}
        </p>
      </div>
    </div>
  );
}