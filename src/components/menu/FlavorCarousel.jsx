import React from 'react';

const FALLBACK_IMG =
  'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?w=400&q=70&auto=format&fit=crop';

/** Carrusel horizontal con scroll-snap de los sabores en vitrina. */
export default function FlavorCarousel({ flavors }) {
  if (flavors.length === 0) {
    return (
      <div className="menu-anim-cardin rounded-[20px] bg-white p-6 text-center text-[12px] font-extrabold text-[#777984] shadow-[0_10px_22px_#16161d12]">
        Preparando sabores...
      </div>
    );
  }

  return (
    <div className="menu-no-scrollbar -mr-4 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-[11px] pl-px pr-[18px] pt-0.5">
      {flavors.map((f) => (
        <article
          key={f.id}
          className="menu-flavor-fade relative h-[174px] w-[184px] min-w-[184px] snap-start overflow-hidden rounded-[22px] border-2 border-white bg-[#202127] shadow-[0_8px_18px_#16161d25] transition-colors duration-200 hover:border-[#F0A23B]"
        >
          <img
            src={f.imageUrl || FALLBACK_IMG}
            alt={f.name}
            loading="lazy"
            className="block h-[174px] w-full object-cover"
            onError={(e) => {
              if (e.currentTarget.src !== FALLBACK_IMG) e.currentTarget.src = FALLBACK_IMG;
            }}
          />
          {f.tag && f.tag !== 'Regular' && (
            <span className="absolute right-[9px] top-[10px] z-[1] rounded-full bg-[#F0A23B] px-2 py-[5px] text-[9px] font-[950] uppercase text-[#24252b]">
              {f.tag}
            </span>
          )}
          <b className="absolute bottom-3 left-3 right-2 z-[1] text-[13px] font-[950] leading-[1.05] text-white">
            {f.name}
          </b>
        </article>
      ))}
    </div>
  );
}