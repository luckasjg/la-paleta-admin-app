export const fieldInput = 'w-full px-3.5 py-3 bg-[#FAF4EB] border border-[#F2E8D8] text-[#2E1109] placeholder:text-[#2E1109]/30 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#5A121A] transition';

export default function EventoField({ label, hint, prefix, children }) {
  return (
    <div>
      <label className="mb-1 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#5A121A]">
        <span>{label}</span>
        <span className="text-[10px] font-normal normal-case tracking-normal text-[#2E1109]/50">{hint}</span>
      </label>
      <div className="flex rounded-xl shadow-sm">
        {prefix && <span className="inline-flex items-center px-3.5 rounded-l-xl border border-r-0 border-[#F2E8D8] bg-[#F2E8D8]/60 text-xs font-bold text-[#5A121A]">{prefix}</span>}
        {children}
      </div>
    </div>
  );
}