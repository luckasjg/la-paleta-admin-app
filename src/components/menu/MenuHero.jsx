import React from 'react';
import { UserRound, LogOut } from 'lucide-react';

const LOGO =
  'https://media.base44.com/images/public/69e078117e2725c0776d724e/649909b33_logoPaletaMesadetrabajo8-111.png';
const HERO_BG =
  'https://media.base44.com/images/public/69e078117e2725c0776d724e/380558b1b_generated_5567da22.jpg';

/** Hero del menú móvil: foto de fondo, logo, marca y acceso discreto al perfil. */
export default function MenuHero({ profile, onForget }) {
  return (
    <header
      className="menu-hero-wave menu-anim-rise relative overflow-hidden text-center min-h-[224px] px-[18px] pt-[18px] pb-[27px]"
      style={{
        background: `linear-gradient(#171820b8,#42312b66), url("${HERO_BG}") center/cover`,
      }}
    >
      {profile && (
        <div className="absolute top-3 left-3 right-3 z-[2] flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-[900] text-[#24252b] shadow-[0_5px_12px_#16161d33]">
            <UserRound className="h-3.5 w-3.5 text-[#F0A23B]" />
            Hola, {(profile.full_name || '').split(' ')[0]}
          </span>
          <button
            onClick={onForget}
            aria-label="Salir de mi perfil"
            className="menu-btn flex h-8 w-8 items-center justify-center rounded-full border-0 bg-white/85 text-[#777984]"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <img
        src={LOGO}
        alt="La Paleta Cafe"
        className="menu-anim-pop relative z-[1] mx-auto h-auto w-[108px] drop-shadow-[0_5px_8px_#11121a66]"
      />
      <h1 className="relative z-[1] mb-0.5 mt-2 text-[25px] font-[950] leading-none tracking-[0.02em] text-white [text-shadow:0_3px_8px_#11121a88]">
        LA PALETA CAFE
      </h1>
      <p className="relative z-[1] m-0 text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#F6D7B0]">
        Helados artesanales
      </p>
    </header>
  );
}