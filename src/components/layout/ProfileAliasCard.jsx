import React, { useEffect, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { displayName } from '@/lib/displayName';

const PenIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="w-[17px] h-[17px] transition-transform [transition-duration:180ms] group-hover:-rotate-[8deg]">
    <path d="m14.5 5.5 4 4M4 20l4.2-.9L19.1 8.2a2.12 2.12 0 0 0-3-3L5.2 16.1 4 20Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function ProfileAliasCard() {
  const [me, setMe] = useState(null);
  const [editing, setEditing] = useState(false);
  const [alias, setAlias] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { base44.auth.me().then((u) => { setMe(u); setAlias(u?.alias || ''); }); }, []);

  const handleClick = async () => {
    if (!editing) { setEditing(true); return; }
    setSaving(true);
    try {
      await base44.auth.updateMe({ alias: alias.trim() });
      setMe({ ...me, alias: alias.trim() });
      setEditing(false);
      toast.success('Alias guardado');
    } catch (e) {
      toast.error('No se pudo guardar el alias');
    }
    setSaving(false);
  };

  const field = 'w-full box-border h-9 px-3 rounded-[11px] border border-[#d7dfcf] bg-[#fffdf8] shadow-[inset_0_1px_2px_#28382008] text-[13px] text-[#243a2d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#718a68] focus-visible:outline-offset-2';

  return (
    <div className="profile-arrive flex items-center gap-3 p-3 rounded-[22px] bg-[#f0f4eb] border border-[#d4dfcc] shadow-[0_12px_30px_#243a2417,0_2px_6px_#243a240a] text-[#243a2d] font-[system-ui,-apple-system,sans-serif]">
      <div aria-hidden="true" className="relative grid place-items-center shrink-0 w-11 h-11 rounded-full bg-[#dce8d4] border border-[#c9d8bd] overflow-hidden">
        <span className="absolute top-[8px] w-3 h-3 rounded-full bg-[#718a68]" />
        <span className="absolute top-[24px] w-[26px] h-[18px] rounded-[14px_14px_8px_8px] bg-[#718a68]" />
      </div>
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        {editing ? (
          <input autoFocus aria-label="Alias" className={field} value={alias} maxLength={40}
            placeholder="Tu alias" onChange={(e) => setAlias(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleClick()} />
        ) : (
          <p className="text-sm font-semibold truncate">{me ? displayName(me) : '…'}</p>
        )}
        <p className="text-[11px] text-[#5f7356] truncate">{me?.email}</p>
      </div>
      <button type="button" aria-label={editing ? 'Guardar alias' : 'Editar alias'} onClick={handleClick} disabled={saving || !me}
        className="group grid place-items-center shrink-0 w-9 h-9 rounded-[11px] border border-[#e3c2af] bg-[#f7e6db] text-[#a65e43] cursor-pointer transition-[background,color,box-shadow,transform] [transition-duration:180ms] hover:bg-[#efd5c5] hover:shadow-[0_3px_8px_#743e291c] active:scale-[.94] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#a65e43] focus-visible:outline-offset-[3px] disabled:opacity-60">
        {saving ? <Loader2 className="w-[17px] h-[17px] animate-spin" /> : editing ? <Check className="w-[17px] h-[17px]" /> : <PenIcon />}
      </button>
    </div>
  );
}