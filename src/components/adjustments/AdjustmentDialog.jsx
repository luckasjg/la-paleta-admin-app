import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ClipboardCheck, ArrowUpDown, Plus, Minus } from 'lucide-react';
import SearchableCombobox from '@/components/shared/SearchableCombobox';
import StockLocationSelector from '@/components/shared/StockLocationSelector';
import QuantityInput from '@/components/adjustments/QuantityInput';
import { getStockAt, LOCATION_LABEL } from '@/lib/stockHelpers';
import { useAdjustmentReasons } from '@/lib/useAdjustmentReasons';
import { useRole } from '@/lib/useRole';
import AdjustmentReasonManager from '@/components/adjustments/AdjustmentReasonManager';
import { Settings2 } from 'lucide-react';

const locationFromNotes = (notes) => {
  const prefix = (notes || '').match(/^\[([^\]]+)\]/);
  return prefix && /almac/i.test(prefix[1]) ? 'warehouse' : 'production';
};

export default function AdjustmentDialog({ open, onOpenChange, editing, supplies, trays, onSubmit, isPending }) {
  const isEdit = !!editing;

  const [type, setType] = useState('supply');
  const [refId, setRefId] = useState('');
  const [location, setLocation] = useState('production');
  const [entryMode, setEntryMode] = useState('physical'); // physical | delta
  const [sign, setSign] = useState(1);
  const [magnitude, setMagnitude] = useState(null);
  const [reason, setReason] = useState('conteo_fisico');
  const [notes, setNotes] = useState('');
  const [resetKey, setResetKey] = useState(0);
  const [reasonManagerOpen, setReasonManagerOpen] = useState(false);
  const { reasons } = useAdjustmentReasons();
  const { isAdmin } = useRole();

  useEffect(() => {
    if (!open) return;
    if (isEdit) {
      setType(editing.type);
      setRefId(editing.reference_id);
      setLocation(editing.type === 'supply' ? locationFromNotes(editing.notes) : 'production');
      setReason(editing.reason || 'conteo_fisico');
      setNotes(editing.notes || '');
    } else {
      setType('supply');
      setRefId('');
      setLocation('production');
      setReason('conteo_fisico');
      setNotes('');
    }
    setEntryMode('physical');
    setSign(1);
    setMagnitude(null);
    setResetKey(k => k + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?.id]);

  const supply = type === 'supply' ? supplies.find(s => s.id === refId) : null;
  const tray = type === 'tray' ? trays.find(t => t.id === refId) : null;
  const unit = type === 'supply' ? (supply?.unit || 'unidad') : 'g';
  const currentStock = type === 'supply'
    ? (supply ? getStockAt(supply, location) : 0)
    : (tray?.remaining_grams || 0);

  const stockDelta = magnitude === null
    ? 0
    : (entryMode === 'physical' ? +(magnitude - currentStock).toFixed(2) : +(sign * magnitude).toFixed(2));

  const storedQty = isEdit
    ? +((editing.quantity_change || 0) + stockDelta).toFixed(2)
    : stockDelta;

  const canSubmit = !!refId && magnitude !== null && stockDelta !== 0 && !isPending;

  const submit = () => {
    const refName = type === 'supply' ? (supply?.name || '') : (tray?.recipe_name || '');
    onSubmit({ type, refId, refName, location, stockDelta, storedQty, reason, notes });
  };

  const options = type === 'supply'
    ? supplies.map(s => ({
        value: s.id,
        label: s.name,
        sublabel: `${LOCATION_LABEL[location]}: ${getStockAt(s, location)} ${s.unit}`,
      }))
    : trays.map(t => ({
        value: t.id,
        label: t.recipe_name,
        sublabel: `${(t.remaining_grams || 0).toFixed(0)}g`,
      }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? `Editar Ajuste — ${editing.reference_name}` : 'Nuevo Ajuste de Inventario'}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Modo de registro */}
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => { setEntryMode('physical'); setMagnitude(null); setResetKey(k => k + 1); }}
              className={`flex-1 flex items-center justify-center gap-1.5 min-h-11 px-3 rounded-lg text-xs font-bold border-2 transition-colors ${
                entryMode === 'physical'
                  ? 'bg-[#1a365d] text-white border-[#1a365d]'
                  : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              <ClipboardCheck className="h-4 w-4" /> Conteo Físico
            </button>
            <button
              type="button"
              onClick={() => { setEntryMode('delta'); setMagnitude(null); setResetKey(k => k + 1); }}
              className={`flex-1 flex items-center justify-center gap-1.5 min-h-11 px-3 rounded-lg text-xs font-bold border-2 transition-colors ${
                entryMode === 'delta'
                  ? 'bg-[#1a365d] text-white border-[#1a365d]'
                  : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              <ArrowUpDown className="h-4 w-4" /> Por Diferencia
            </button>
          </div>

          {!isEdit && (
            <div>
              <Label>Tipo</Label>
              <Select value={type} onValueChange={v => { setType(v); setRefId(''); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="supply">Insumo</SelectItem>
                  <SelectItem value="tray">Bandeja</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {type === 'supply' && (
            <StockLocationSelector value={location} onChange={setLocation} label="Ubicación a Ajustar" disabled={isEdit} />
          )}

          {!isEdit && (
            <div>
              <Label>{type === 'supply' ? 'Insumo' : 'Bandeja'}</Label>
              <SearchableCombobox
                value={refId}
                onChange={setRefId}
                options={options}
                placeholder="Seleccionar..."
                searchPlaceholder={type === 'supply' ? 'Buscar insumo...' : 'Buscar bandeja...'}
                emptyText="Sin resultados"
              />
            </div>
          )}

          {refId && (
            <div className="rounded-lg bg-secondary/60 border border-border p-3 text-sm">
              Stock actual{type === 'supply' ? ` en ${LOCATION_LABEL[location]}` : ''}:{' '}
              <span className="font-mono font-bold text-foreground">{currentStock.toFixed(2)} {unit}</span>
            </div>
          )}

          {entryMode === 'delta' && (
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setSign(1)}
                className={`flex-1 flex items-center justify-center gap-1.5 min-h-11 rounded-lg text-xs font-semibold border-2 transition-colors ${
                  sign === 1 ? 'bg-green-600 text-white border-green-600' : 'bg-secondary text-secondary-foreground border-border'
                }`}
              >
                <Plus className="h-3.5 w-3.5" /> Agregar
              </button>
              <button
                type="button"
                onClick={() => setSign(-1)}
                className={`flex-1 flex items-center justify-center gap-1.5 min-h-11 rounded-lg text-xs font-semibold border-2 transition-colors ${
                  sign === -1 ? 'bg-destructive text-destructive-foreground border-destructive' : 'bg-secondary text-secondary-foreground border-border'
                }`}
              >
                <Minus className="h-3.5 w-3.5" /> Restar
              </button>
            </div>
          )}

          <QuantityInput
            unit={unit}
            packageFormat={type === 'supply' ? supply?.package_format : null}
            onChange={setMagnitude}
            resetKey={`${resetKey}-${refId}-${entryMode}`}
            label={entryMode === 'physical' ? `Cantidad física contada (${unit})` : `Cantidad a ${sign === 1 ? 'agregar' : 'restar'} (${unit})`}
          />

          {magnitude !== null && refId && (
            <div className={`rounded-lg p-3 text-sm border ${stockDelta === 0 ? 'bg-muted border-border' : stockDelta > 0 ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
              <div className="flex items-center justify-between font-semibold">
                <span>Diferencia a aplicar</span>
                <span className="font-mono">{stockDelta > 0 ? '+' : ''}{stockDelta} {unit}</span>
              </div>
              <div className="flex items-center justify-between text-xs opacity-80 mt-1">
                <span>Stock resultante</span>
                <span className="font-mono">{(currentStock + stockDelta).toFixed(2)} {unit}</span>
              </div>
              {isEdit && (
                <div className="flex items-center justify-between text-xs opacity-80 mt-1">
                  <span>Ajuste registrado pasa a</span>
                  <span className="font-mono">{storedQty > 0 ? '+' : ''}{storedQty} {unit}</span>
                </div>
              )}
            </div>
          )}

          <div>
            <Label>Motivo</Label>
            <Select
              value={reason}
              onValueChange={v => {
                if (v === '__manage__') { setReasonManagerOpen(true); return; }
                setReason(v);
              }}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {reasons.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                {isAdmin && (
                  <SelectItem value="__manage__" className="text-primary font-medium">
                    <span className="flex items-center gap-1.5">
                      <Settings2 className="h-3.5 w-3.5" /> Gestionar motivos...
                    </span>
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Notas</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Detalles del ajuste..." />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={!canSubmit}>
            {isPending ? 'Aplicando...' : isEdit ? 'Guardar Cambios' : 'Aplicar Ajuste'}
          </Button>
        </DialogFooter>

        <AdjustmentReasonManager open={reasonManagerOpen} onOpenChange={setReasonManagerOpen} />
      </DialogContent>
    </Dialog>
  );
}