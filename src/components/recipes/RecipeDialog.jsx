import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, FlaskConical } from 'lucide-react';

const TYPES = [
  { value: 'helado', label: 'Helado' },
  { value: 'cafe', label: 'Café' },
  { value: 'merengada', label: 'Merengada' },
  { value: 'otro', label: 'Otro' },
];

const emptyIng = { supply_id: '', supply_name: '', quantity: 0, unit: 'g', percentage: 0, sugars: 0, fats: 0, slngo: 0, other_solids: 0, calories: 0 };

export default function RecipeDialog({ open, onOpenChange, form, setForm, editing, supplies, onSave, onClose }) {
  const [mixDeseado, setMixDeseado] = useState('');
  const totalGrams = form.ingredients.reduce((s, i) => s + (parseFloat(i.quantity) || 0), 0);
  const totalSugars = form.ingredients.reduce((s, i) => s + (parseFloat(i.sugars) || 0), 0);
  const totalFats = form.ingredients.reduce((s, i) => s + (parseFloat(i.fats) || 0), 0);
  const totalSlngo = form.ingredients.reduce((s, i) => s + (parseFloat(i.slngo) || 0), 0);
  const totalOther = form.ingredients.reduce((s, i) => s + (parseFloat(i.other_solids) || 0), 0);
  const totalCalories = form.ingredients.reduce((s, i) => s + (parseFloat(i.calories) || 0), 0);

  const totalSolids = totalGrams > 0 ? ((totalSugars + totalFats + totalSlngo + totalOther) / totalGrams * 100).toFixed(2) : 0;

  const addIngredient = () => setForm(f => ({ ...f, ingredients: [...f.ingredients, { ...emptyIng }] }));

  const removeIngredient = (idx) => setForm(f => ({ ...f, ingredients: f.ingredients.filter((_, i) => i !== idx) }));

  const updateIngredient = (idx, field, value) => {
    setForm(f => {
      const newIngs = [...f.ingredients];
      newIngs[idx] = { ...newIngs[idx], [field]: value };
      if (field === 'supply_id') {
        const supply = supplies.find(s => s.id === value);
        if (supply) {
          newIngs[idx].supply_name = supply.name;
          newIngs[idx].unit = supply.unit;
        }
      }
      // Auto-calc percentage when quantity changes
      if (field === 'quantity' && totalGrams > 0) {
        newIngs[idx].percentage = ((parseFloat(value) || 0) / totalGrams * 100).toFixed(2);
      }
      return { ...f, ingredients: newIngs };
    });
  };

  const numInput = (label, field, step = '1', small = false) => (
    <div className={small ? '' : ''}>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <Input
        type="number" step={step}
        className="h-7 text-xs px-2 text-right"
        value={form[field] ?? ''}
        onChange={e => setForm(f => ({ ...f, [field]: parseFloat(e.target.value) || 0 }))}
      />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">
            {editing ? `Editando: ${editing.name}` : 'Nueva Receta'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Header info */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs">Nº Receta</Label>
              <Input value={form.recipe_number} onChange={e => setForm(f => ({ ...f, recipe_number: e.target.value }))} className="h-8" placeholder="60" />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs">Nombre del sabor *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="h-8" placeholder="Ej: Crema de Coco 2021" />
            </div>
            <div>
              <Label className="text-xs">Tipo</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          {/* Ice cream specific params */}
          {form.type === 'helado' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-muted/30 p-3 rounded-lg">
              <div>
                <Label className="text-xs">Mix Deseado (g)</Label>
                <Input type="number" value={form.yield_amount} onChange={e => setForm(f => ({ ...f, yield_amount: parseFloat(e.target.value) || 0 }))} className="h-8" />
              </div>
              <div>
                <Label className="text-xs">Overrun (%)</Label>
                <Input type="number" value={form.overrun} onChange={e => setForm(f => ({ ...f, overrun: parseFloat(e.target.value) || 0 }))} className="h-8" />
              </div>
              <div>
                <Label className="text-xs">Temp. Servicio (°C)</Label>
                <Input type="number" value={form.service_temperature} onChange={e => setForm(f => ({ ...f, service_temperature: parseFloat(e.target.value) || 0 }))} className="h-8" />
              </div>
              <div>
                <Label className="text-xs">Precio Venta ($)</Label>
                <Input type="number" step="0.01" value={form.sale_price} onChange={e => setForm(f => ({ ...f, sale_price: parseFloat(e.target.value) || 0 }))} className="h-8" />
              </div>
            </div>
          )}

          {/* Calculadora de Producción */}
          {form.ingredients.length > 0 && totalGrams > 0 && (
            <div className="border rounded-lg p-3 bg-blue-50/50 dark:bg-blue-950/20 space-y-2">
              <div className="flex items-center gap-2">
                <FlaskConical className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-semibold text-blue-700 dark:text-blue-400">Calculadora de Producción</span>
              </div>
              <div className="flex items-end gap-3">
                <div className="w-52">
                  <Label className="text-xs">Mix Deseado (gramos)</Label>
                  <Input
                    type="number" step="1" placeholder={`Base: ${totalGrams}g`}
                    value={mixDeseado}
                    onChange={e => setMixDeseado(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                {mixDeseado && (
                  <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-8" onClick={() => setMixDeseado('')}>
                    Limpiar
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground italic">* Solo visual — no modifica la receta original.</p>
            </div>
          )}

          {/* Ingredients table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-semibold">Ingredientes</Label>
              <Button variant="outline" size="sm" onClick={addIngredient}>
                <Plus className="h-3 w-3 mr-1" /> Agregar ingrediente
              </Button>
            </div>

            <div className="border rounded-lg overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-2 font-semibold min-w-[160px]">Ingrediente</th>
                    <th className="text-right p-2 font-semibold w-20">Cant. (g)</th>
                    <th className="text-right p-2 font-semibold w-20">% en Receta</th>
                    {mixDeseado && <th className="text-right p-2 font-semibold w-24 text-blue-600">Gramos a Pesar</th>}
                    <th className="text-right p-2 font-semibold w-20">Azúcares</th>
                    <th className="text-right p-2 font-semibold w-16">Grasas</th>
                    <th className="text-right p-2 font-semibold w-20">S.L.N.G.O.</th>
                    <th className="text-right p-2 font-semibold w-20">Otros Sól.</th>
                    <th className="text-right p-2 font-semibold w-20">Calorías</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {form.ingredients.map((ing, idx) => {
                    const pct = totalGrams > 0 ? ((parseFloat(ing.quantity) || 0) / totalGrams * 100).toFixed(2) : '0.00';
                    return (
                      <tr key={idx} className="border-t hover:bg-muted/20">
                        <td className="p-1">
                          <Select value={ing.supply_id} onValueChange={v => updateIngredient(idx, 'supply_id', v)}>
                            <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                            <SelectContent>
                              {supplies.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-1">
                          <Input type="number" className="h-7 text-xs text-right px-2 w-full"
                            value={ing.quantity || ''} placeholder="0"
                            onChange={e => updateIngredient(idx, 'quantity', parseFloat(e.target.value) || 0)} />
                        </td>
                        <td className="p-1 text-right text-muted-foreground font-mono pr-2">{pct}%</td>
                        {mixDeseado && (
                          <td className="p-1 text-right font-mono font-semibold text-blue-700 dark:text-blue-400 pr-2">
                            {((parseFloat(mixDeseado) / totalGrams) * (parseFloat(ing.quantity) || 0)).toFixed(1)}g
                          </td>
                        )}
                        <td className="p-1">
                          <Input type="number" className="h-7 text-xs text-right px-2 w-full"
                            value={ing.sugars || ''} placeholder="0"
                            onChange={e => updateIngredient(idx, 'sugars', parseFloat(e.target.value) || 0)} />
                        </td>
                        <td className="p-1">
                          <Input type="number" className="h-7 text-xs text-right px-2 w-full"
                            value={ing.fats || ''} placeholder="0"
                            onChange={e => updateIngredient(idx, 'fats', parseFloat(e.target.value) || 0)} />
                        </td>
                        <td className="p-1">
                          <Input type="number" className="h-7 text-xs text-right px-2 w-full"
                            value={ing.slngo || ''} placeholder="0"
                            onChange={e => updateIngredient(idx, 'slngo', parseFloat(e.target.value) || 0)} />
                        </td>
                        <td className="p-1">
                          <Input type="number" className="h-7 text-xs text-right px-2 w-full"
                            value={ing.other_solids || ''} placeholder="0"
                            onChange={e => updateIngredient(idx, 'other_solids', parseFloat(e.target.value) || 0)} />
                        </td>
                        <td className="p-1">
                          <Input type="number" className="h-7 text-xs text-right px-2 w-full"
                            value={ing.calories || ''} placeholder="0"
                            onChange={e => updateIngredient(idx, 'calories', parseFloat(e.target.value) || 0)} />
                        </td>
                        <td className="p-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeIngredient(idx)}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}

                  {form.ingredients.length === 0 && (
                    <tr><td colSpan={9} className="p-4 text-center text-muted-foreground">Sin ingredientes — pulsa "Agregar ingrediente"</td></tr>
                  )}
                </tbody>

                {/* Totals row */}
                {form.ingredients.length > 0 && (
                  <tfoot className="bg-muted/50 font-semibold border-t-2">
                    <tr>
                      <td className="p-2 text-xs uppercase tracking-wide">TOTAL MIX</td>
                      <td className="p-2 text-right font-mono text-sm">{totalGrams}</td>
                      <td className="p-2 text-right text-muted-foreground">100%</td>
                      {mixDeseado && <td className="p-2 text-right font-mono font-bold text-blue-700 dark:text-blue-400">{parseFloat(mixDeseado).toFixed(1)}g</td>}
                      <td className="p-2 text-right font-mono">{totalSugars.toFixed(0)}</td>
                      <td className="p-2 text-right font-mono">{totalFats.toFixed(0)}</td>
                      <td className="p-2 text-right font-mono">{totalSlngo.toFixed(0)}</td>
                      <td className="p-2 text-right font-mono">{totalOther.toFixed(0)}</td>
                      <td className="p-2 text-right font-mono">{totalCalories.toFixed(0)}</td>
                      <td></td>
                    </tr>
                    {totalGrams > 0 && (
                      <tr className="border-t text-muted-foreground">
                        <td className="p-2 text-xs">% s/ TOTAL</td>
                        <td></td>
                        <td></td>
                        <td className="p-2 text-right font-mono text-xs">{(totalSugars / totalGrams * 100).toFixed(2)}%</td>
                        <td className="p-2 text-right font-mono text-xs">{(totalFats / totalGrams * 100).toFixed(2)}%</td>
                        <td className="p-2 text-right font-mono text-xs">{(totalSlngo / totalGrams * 100).toFixed(2)}%</td>
                        <td className="p-2 text-right font-mono text-xs">{(totalOther / totalGrams * 100).toFixed(2)}%</td>
                        <td className="p-2 text-right font-mono text-xs">{totalGrams > 0 ? (totalCalories / totalGrams * 100).toFixed(0) : 0} /100g</td>
                        <td></td>
                      </tr>
                    )}
                  </tfoot>
                )}
              </table>
            </div>

            {/* Summary badges */}
            {form.type === 'helado' && form.ingredients.length > 0 && (
              <div className="flex flex-wrap gap-3 mt-3 text-xs">
                <div className="bg-muted px-3 py-1.5 rounded-md">
                  <span className="text-muted-foreground">% Sólidos totales: </span>
                  <span className="font-bold">{totalSolids}%</span>
                </div>
                <div className="bg-muted px-3 py-1.5 rounded-md">
                  <span className="text-muted-foreground">Mix producido: </span>
                  <span className="font-bold">{Math.round(totalGrams * (1 + (form.overrun || 0) / 100))}g</span>
                </div>
                <div className="bg-muted px-3 py-1.5 rounded-md">
                  <span className="text-muted-foreground">Cal/100g: </span>
                  <span className="font-bold">{totalGrams > 0 ? (totalCalories / totalGrams * 100).toFixed(0) : 0}</span>
                </div>
              </div>
            )}
          </div>

          <div>
            <Label className="text-xs">Observaciones</Label>
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="h-16 text-sm" placeholder="Notas adicionales..." />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={onSave} disabled={!form.name}>{editing ? 'Guardar cambios' : 'Crear receta'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}