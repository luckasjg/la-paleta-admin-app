import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Gift, Pencil } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import StaffBonusForm from '@/components/staff/StaffBonusForm';

export default function StaffBenefits() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(null);
  const { data: staff = [], isLoading } = useQuery({
    queryKey: ['staff_pos_benefits'],
    queryFn: async () => (await base44.entities.StaffPOS.filter({}, { sort: 'full_name', limit: 200 })).items,
  });
  const refresh = () => { qc.invalidateQueries({ queryKey: ['staff_pos_benefits'] }); qc.invalidateQueries({ queryKey: ['bonus_staff'] }); };

  return (
    <div className="space-y-6">
      <PageHeader title="Colaboradores" description="Cargo y bono semanal de productos de cada colaborador. Los colaboradores se crean en Configuración → Personal POS." />
      <div className="rounded-xl border bg-card divide-y">
        {isLoading ? <p className="p-8 text-center text-sm text-muted-foreground">Cargando...</p> :
          staff.length === 0 ? <p className="p-8 text-center text-sm text-muted-foreground">No hay colaboradores registrados.</p> :
          staff.map(s => (
            <div key={s.id} className="flex items-center gap-3 px-4 py-3">
              <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold shrink-0">{s.full_name?.[0]?.toUpperCase()}</div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{s.full_name} {s.is_active === false && <span className="text-xs text-muted-foreground">(inactivo)</span>}</p>
                <p className="text-xs text-muted-foreground truncate">{s.position || 'Sin cargo'}{s.bonus_enabled ? ` · ${(s.weekly_bonus || []).map(b => `${b.quantity_per_week}× ${b.product_name}`).join(', ')}` : ''}</p>
              </div>
              {s.bonus_enabled && <Badge variant="secondary"><Gift className="h-3 w-3 mr-1" /> Bono{s.discount_percentage ? ` · ${s.discount_percentage}%` : ''}</Badge>}
              <Button size="icon" variant="ghost" onClick={() => setEditing(s)}><Pencil className="h-4 w-4" /></Button>
            </div>
          ))}
      </div>
      <StaffBonusForm staff={editing} onOpenChange={o => !o && setEditing(null)} onSaved={refresh} />
    </div>
  );
}