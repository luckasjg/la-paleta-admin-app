import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PackageX, Scale, Link2, BellOff } from 'lucide-react';
import { TYPE_LABEL } from '@/lib/inventoryAudit';

const SEVERITY_DOT = { high: 'bg-red-500', medium: 'bg-amber-500', low: 'bg-sky-500' };

export default function FindingCard({ finding: f, onZero, onAdjust, onSilence, busy }) {
  const isSupply = !!f.supply_id;
  const canSilence = f.type === 'stagnant_overstock' || f.type === 'orphan_supply_in_stock';
  return (
    <div className="rounded-xl border border-border bg-card p-3.5 space-y-2.5 transition-shadow hover:shadow-sm">
      <div className="flex items-start gap-2.5">
        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${SEVERITY_DOT[f.severity] || 'bg-muted-foreground'}`} />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{TYPE_LABEL[f.type]}</p>
          <p className="text-sm font-semibold leading-snug">{f.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{f.detail}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 pl-4">
        {f.type === 'residual_stock' && (
          <Button size="sm" className="h-7 text-xs" disabled={busy} onClick={() => onZero(f)}>
            <PackageX className="h-3.5 w-3.5" /> Confirmar agotado (0 {f.unit})
          </Button>
        )}
        {isSupply && (
          <Button size="sm" variant="outline" className="h-7 text-xs" disabled={busy} onClick={() => onAdjust(f)}>
            <Scale className="h-3.5 w-3.5" /> Ajustar stock físico
          </Button>
        )}
        {f.type === 'unlinked_catalog_items' && (
          <Button size="sm" variant="outline" className="h-7 text-xs" asChild>
            <Link to="/productos"><Link2 className="h-3.5 w-3.5" /> Ir a vincular insumos</Link>
          </Button>
        )}
        {canSilence && (
          <>
            <Button size="sm" variant="outline" className="h-7 text-xs" asChild>
              <Link to="/recetas"><Link2 className="h-3.5 w-3.5" /> Ir a vincular receta</Link>
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" disabled={busy} onClick={() => onSilence(f)}>
              <BellOff className="h-3.5 w-3.5" /> Silenciar insumo
            </Button>
          </>
        )}
      </div>
    </div>
  );
}