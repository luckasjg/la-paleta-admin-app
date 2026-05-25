import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, Plus, Check, X } from 'lucide-react';
import { toast } from 'sonner';

const TYPES = [
  { value: 'fijo', label: 'Fijos' },
  { value: 'variable', label: 'Variables' },
];

export default function ExpenseCategoryManager({ open, onOpenChange, categories, addCategory, renameCategory, deleteCategory, usageCount }) {
  const [activeType, setActiveType] = useState('fijo');
  const [newInput, setNewInput] = useState('');
  const [editing, setEditing] = useState(null); // { type, oldName, newName }

  const handleAdd = () => {
    const val = newInput.trim();
    if (!val) return;
    const exists = (categories[activeType] || []).some(c => c.toLowerCase() === val.toLowerCase());
    if (exists) {
      toast.error('Esa categoría ya existe');
      return;
    }
    addCategory(activeType, val);
    setNewInput('');
    toast.success(`Categoría "${val}" añadida`);
  };

  const handleEditConfirm = () => {
    if (!editing) return;
    const { type, oldName, newName } = editing;
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) { setEditing(null); return; }
    renameCategory(type, oldName, trimmed);
    toast.success(`"${oldName}" → "${trimmed}"`);
    setEditing(null);
  };

  const handleDelete = (type, name) => {
    const used = usageCount(name);
    if (used > 0 && !window.confirm(`Hay ${used} gasto(s) usando "${name}". ¿Eliminar de todos modos? Los gastos mantendrán la etiqueta antigua.`)) {
      return;
    }
    deleteCategory(type, name);
    toast.success(`Categoría "${name}" eliminada`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Categorías de Gastos</DialogTitle>
        </DialogHeader>

        <Tabs value={activeType} onValueChange={v => { setActiveType(v); setEditing(null); setNewInput(''); }}>
          <TabsList className="w-full">
            {TYPES.map(t => (
              <TabsTrigger key={t.value} value={t.value} className="flex-1 text-xs">
                {t.label}
                <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0">
                  {(categories[t.value] || []).length}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>

          {TYPES.map(t => (
            <TabsContent key={t.value} value={t.value} className="mt-4 space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder={`Nueva categoría ${t.label.toLowerCase()}...`}
                  value={newInput}
                  onChange={e => setNewInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
                />
                <Button onClick={handleAdd} disabled={!newInput.trim()}>
                  <Plus className="h-4 w-4 mr-1" /> Agregar
                </Button>
              </div>

              <div className="space-y-2">
                {(categories[t.value] || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No hay categorías. Agrega una arriba.
                  </p>
                ) : (
                  (categories[t.value] || []).map(cat => {
                    const isEditing = editing?.type === t.value && editing?.oldName === cat;
                    const used = usageCount(cat);
                    return (
                      <div key={cat} className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-card">
                        {isEditing ? (
                          <>
                            <Input
                              autoFocus
                              className="flex-1 h-7 text-sm"
                              value={editing.newName}
                              onChange={e => setEditing(prev => ({ ...prev, newName: e.target.value }))}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleEditConfirm();
                                if (e.key === 'Escape') setEditing(null);
                              }}
                            />
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleEditConfirm}>
                              <Check className="h-4 w-4 text-primary" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(null)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <span className="flex-1 text-sm font-medium">{cat}</span>
                            {used > 0 && (
                              <Badge variant="secondary" className="text-xs">{used} gasto{used !== 1 ? 's' : ''}</Badge>
                            )}
                            <Button
                              size="icon" variant="ghost" className="h-7 w-7"
                              onClick={() => setEditing({ type: t.value, oldName: cat, newName: cat })}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon" variant="ghost" className="h-7 w-7"
                              onClick={() => handleDelete(t.value, cat)}
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