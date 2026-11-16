import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Sparkles, Trash2 } from 'lucide-react';
import SearchableCombobox from '@/components/shared/SearchableCombobox';
import { invertSugarFormula, findSupplyByName } from '@/lib/productionSubstitutes';

const isGlucosa = (n) => n.includes('glucosa');
const isAzucar = (n) => (n.includes('azúcar') || n.includes('azucar') || n.includes('sacarosa')) && !n.includes('invertid');

/** Diálogo para sustituir un ingrediente base por 1 (simple) o varios insumos (compuesta). */
export default function SubstituteDialog({ row, supplies, onConfirm, onClear, onClose }) {
  const [mode, setMode] = useState('simple');
  const [targets, setTargets] = useState([]);
  const [div, setDiv] = useState({ glucosa: 1.144, azucar: 1.43 });
  const [formulaUsed, setFormulaUsed] = useState(false);

  useEffect(() => {
    if (!row) return;
    const prev = row.variation?.status === 'substituted' ? row.variation : null;
    setTargets(prev?.targets?.length ? prev.targets : [{ supply_id: '', quantity: +row.planned.toFixed(1) }]);
    setMode(prev?.targets?.length > 1 || prev?.factors ? 'compuesta' : 'simple');
    if (prev?.factors) setDiv(prev.factors);
    setFormulaUsed(Boolean(prev?.factors));
  }, [row]);

  if (!row) return null;
  const options = supplies.filter((s) => s.id !== row.original?.id)
    .map((s) => ({ value: s.id, label: s.name, sublabel: s.unit }));
  const setT = (i, patch) => setTargets((p) => p.map((t, j) => (j === i ? { ...t, ...patch } : t)));
  const showFormula = mode === 'compuesta';
  const factors = formulaUsed ? div : undefined;

  const applyFormula = () => {
    const r = invertSugarFormula(row.planned, div.glucosa, div.azucar);
    const g = findSupplyByName(supplies, isGlucosa); const a = findSupplyByName(supplies, isAzucar);
    const next = [{ supply_id: g?.id || '', quantity: +r.glucosa.toFixed(1) }, { supply_id: a?.id || '', quantity: +r.azucar.toFixed(1) }];
    setFormulaUsed(true);
    setTargets(next);
  };
  const valid = targets.length > 0 && targets.every((t) => t.supply_id && t.quantity > 0);
  const list = mode === 'simple' ? targets.slice(0, 1) : targets;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Sustituir {row.originalName}</DialogTitle></DialogHeader>
        <p className="text-xs text-muted-foreground -mt-2">Plan: {row.planned.toFixed(1)}{row.unit} · solo para este lote</p>
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
          {['simple', 'compuesta'].map((m) => (
            <button key={m} type="button" onClick={() => setMode(m)}
              className={`rounded-md py-1.5 text-xs font-medium transition ${mode === m ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}>
              {m === 'simple' ? 'Simple (1 a 1)' : 'Compuesta / Fórmula'}
            </button>
          ))}
        </div>

        {showFormula && (
          <div className={`rounded-lg border p-3 space-y-2 ${row.originalName.toLowerCase().includes('invertido') ? 'border-amber-300 bg-amber-50' : ''}`}>
            <div className="flex items-end gap-2">
              <div className="flex-1"><Label className="text-xs">÷ Glucosa</Label>
                <Input type="number" step="0.001" className="h-8 text-xs" value={div.glucosa} onChange={(e) => setDiv((d) => ({ ...d, glucosa: parseFloat(e.target.value) || 0 }))} /></div>
              <div className="flex-1"><Label className="text-xs">÷ Azúcar</Label>
                <Input type="number" step="0.001" className="h-8 text-xs" value={div.azucar} onChange={(e) => setDiv((d) => ({ ...d, azucar: parseFloat(e.target.value) || 0 }))} /></div>
            </div>
            <Button type="button" size="sm" variant="outline" className="w-full h-8 text-xs" onClick={applyFormula}>
              <Sparkles className="h-3 w-3 mr-1" /> Fórmula Equivalencia Azúcar Invertido
            </Button>
          </div>
        )}

        <div className="space-y-2">
          {list.map((t, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <SearchableCombobox value={t.supply_id} onChange={(v) => setT(i, { supply_id: v })} options={options}
                  placeholder="Insumo destino" searchPlaceholder="Buscar insumo..." emptyText="Sin resultados" />
              </div>
              <Input type="number" className="h-9 w-24 text-xs text-right" value={t.quantity}
                onChange={(e) => setT(i, { quantity: parseFloat(e.target.value) || 0 })} />
              {mode === 'compuesta' && list.length > 1 && (
                <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => setTargets((p) => p.filter((_, j) => j !== i))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          {mode === 'compuesta' && (
            <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setTargets((p) => [...p, { supply_id: '', quantity: 0 }])}>
              <Plus className="h-3 w-3 mr-1" /> Agregar insumo destino
            </Button>
          )}
        </div>

        <DialogFooter className="gap-2">
          {row.variation?.status === 'substituted' && <Button variant="ghost" onClick={onClear}>Quitar sustitución</Button>}
          <Button disabled={!(mode === 'simple' ? list[0]?.supply_id && list[0]?.quantity > 0 : valid)}
            onClick={() => onConfirm(list.map(({ supply_id, quantity }) => ({ supply_id, quantity })), mode === 'compuesta' ? factors : undefined)}>
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}