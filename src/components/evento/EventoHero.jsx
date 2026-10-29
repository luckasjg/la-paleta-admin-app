const LOGO = 'https://media.base44.com/images/public/69e078117e2725c0776d724e/68efe1372_logoPaletaMesadetrabajo8-111.png';

export default function EventoHero() {
  return (
    <>
      <header className="text-center pt-8 pb-4">
        <img src={LOGO} alt="La Paleta Café" className="h-28 w-auto mx-auto drop-shadow-xl transition-transform duration-300 hover:scale-105" />
        <p className="mt-2 font-heading italic text-sm tracking-[0.25em] font-bold uppercase text-[#5A121A]">Gelato & Café</p>
      </header>
      <div className="relative h-48 rounded-2xl overflow-hidden mb-5 shadow-lg border border-[#F6BA18]/30 group">
        <img src="https://images.unsplash.com/photo-1576506295286-5cda18df43e7?auto=format&fit=crop&w=900&q=85" alt="Gelato artesanal" loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#2E1109]/85 via-[#2E1109]/20 to-transparent" />
        <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#5A121A]/90 text-[#FFCE2A] border border-[#F6BA18]/40">Gelato 100% artesanal</span>
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
          <div>
            <p className="text-[#FFCE2A] text-[11px] font-semibold">Fórmula tradicional italiana</p>
            <h3 className="text-white font-heading font-bold text-lg leading-tight">Cremoso, denso y recién elaborado</h3>
          </div>
          <div className="bg-[#F6BA18] px-2.5 py-1.5 rounded-xl text-center text-[#5A121A]">
            <span className="block text-[8px] uppercase font-black">Stand</span>
            <span className="block text-xs font-black leading-none">GRATIS</span>
          </div>
        </div>
      </div>
    </>
  );
}