import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, Plus, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

const SECTORS = [
  { value: 'materia_prima', label: 'Materia Prima' },
  { value: 'venta_directa', label: 'Venta Directa' },
  { value: 'utensilio', label: 'Utensilios' },
];

export default function CategoryManager({ open, onOpenChange, customCategories, setCustomCategories, supplies, onSuppliesRefresh }) {
  const [activeSector, setActiveSector] = useState('materia_prima');
  const [newCatInput, setNewCatInput] = useState('');
  const [editingCat, setEditingCat] = useState(null); // { sector, oldName, newName }

  const categoriesForSector = (sector) => customCategories[sector] || [];

  const handleAdd = () => {
    const val = newCatInput.trim();
    if (!val) return;
    const existing = categoriesForSector(activeSector);
    if (existing.some(c => c.toLowerCase() === val.toLowerCase())) {
      toast.error('Esa categoría ya existe');
      return;
    }
    setCustomCategories(prev => ({
      ...prev,
      [activeSector]: [...(prev[activeSector] || []), val],
    }));
    setNewCatInput('');
    toast.success(`Categoría "${val}" añadida`);
  };

  const handleEdit = async () => {
    if (!editingCat) return;
    const { sector, oldName, newName } = editingCat;
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) { setEditingCat(null); return; }

    // Update state
    setCustomCategories(prev => ({
      ...prev,
      [sector]: prev[sector].map(c => c === oldName ? trimmed : c),
    }));

    // Update supplies in DB
    const toUpdate = supplies.filter(s =>
      (s.sector || 'materia_prima') === sector && s.category === oldName
    );
    await Promise.all(toUpdate.map(s =>
      base44.entities.Supply.update(s.id, { category: trimmed })
    ));

    if (toUpdate.length > 0) {
      toast.success(`"${oldName}" → "${trimmed}": ${toUpdate.length} insumo(s) actualizado(s)`);
    } else {
      toast.success(`Categoría renombrada a "${trimmed}"`);
    }
    onSuppliesRefresh();
    setEditingCat(null);
  };

  const handleDelete = async (sector, catName) => {
    setCustomCategories(prev => ({
      ...prev,
      [sector]: prev[sector].filter(c => c !== catName),
    }));

    const toUpdate = supplies.filter(s =>
      (s.sector || 'materia_prima') === sector && s.category === catName
    );
    await Promise.all(toUpdate.map(s =>
      base44.entities.Supply.update(s.id, { category: '' })
    ));

    if (toUpdate.length > 0) {
      toast.success(`Categoría eliminada. ${toUpdate.length} insumo(s) movido(s) a "Sin categoría"`);
    } else {
      toast.success(`Categoría "${catName}" eliminada`);
    }
    onSuppliesRefresh();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Administrador de Categorías</DialogTitle>
        </DialogHeader>

        <Tabs value={activeSector} onValueChange={v => { setActiveSector(v); setEditingCat(null); setNewCatInput(''); }}>
          <TabsList className="w-full">
            {SECTORS.map(s => (
              <TabsTrigger key={s.value} value={s.value} className="flex-1 text-xs">
                {s.label}
                <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0">
                  {(customCategories[s.value] || []).length}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>

          {SECTORS.map(sec => (
            <TabsContent key={sec.value} value={sec.value} className="mt-4 space-y-4">
              {/* Add new */}
              <div className="flex gap-2">
                <Input
                  placeholder={`Nueva categoría para ${sec.label}...`}
                  value={newCatInput}
                  onChange={e => setNewCatInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
                />
                <Button onClick={handleAdd} disabled={!newCatInput.trim()}>
                  <Plus className="h-4 w-4 mr-1" /> Agregar
                </Button>
              </div>

              {/* List */}
              <div className="space-y-2">
                {categoriesForSector(sec.value).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No hay categorías. Agrega una arriba.</p>
                ) : (
                  categoriesForSector(sec.value).map(cat => {
                    const usageCount = supplies.filter(s =>
                      (s.sector || 'materia_prima') === sec.value && s.category === cat
                    ).length;
                    const isEditing = editingCat?.sector === sec.value && editingCat?.oldName === cat;

                    return (
                      <div key={cat} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card">
                        {isEditing ? (
                          <>
                            <Input
                              autoFocus
                              className="flex-1 h-7 text-sm"
                              value={editingCat.newName}
                              onChange={e => setEditingCat(prev => ({ ...prev, newName: e.target.value }))}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleEdit();
                                if (e.key === 'Escape') setEditingCat(null);
                              }}
                            />
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleEdit}>
                              <Check className="h-4 w-4 text-primary" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingCat(null)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <span className="flex-1 text-sm font-medium">{cat}</span>
                            {usageCount > 0 && (
                              <Badge variant="secondary" className="text-xs">{usageCount} insumo{usageCount !== 1 ? 's' : ''}</Badge>
                            )}
                            <Button
                              size="icon" variant="ghost" className="h-7 w-7"
                              onClick={() => setEditingCat({ sector: sec.value, oldName: cat, newName: cat })}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon" variant="ghost" className="h-7 w-7"
                              onClick={() => handleDelete(sec.value, cat)}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}