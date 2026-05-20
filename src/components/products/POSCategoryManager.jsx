import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, Plus, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

export default function POSCategoryManager({ open, onOpenChange, categories, products, onProductsRefresh, onHideCategory }) {
  const [newCatInput, setNewCatInput] = useState('');
  const [editingCat, setEditingCat] = useState(null); // { oldName, newName }

  const handleAdd = () => {
    const val = newCatInput.trim();
    if (!val) return;
    if (categories.some(c => c.toLowerCase() === val.toLowerCase())) {
      toast.error('Esa categoría ya existe');
      return;
    }
    setNewCatInput('');
    toast.success(`Categoría "${val}" lista para usar. Asígnala a un producto para guardarla.`);
  };

  const handleEdit = async () => {
    if (!editingCat) return;
    const { oldName, newName } = editingCat;
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) { setEditingCat(null); return; }

    const toUpdate = products.filter(p => p.category === oldName);
    await Promise.all(toUpdate.map(p =>
      base44.entities.Product.update(p.id, { category: trimmed })
    ));

    toast.success(toUpdate.length > 0
      ? `"${oldName}" → "${trimmed}": ${toUpdate.length} producto(s) actualizado(s)`
      : `Categoría renombrada a "${trimmed}"`
    );
    onProductsRefresh();
    setEditingCat(null);
  };

  const handleDelete = async (catName) => {
    const toUpdate = products.filter(p => p.category === catName);
    await Promise.all(toUpdate.map(p =>
      base44.entities.Product.update(p.id, { category: '' })
    ));

    // Hide from the list (works for default categories too, which can't be deleted from DB)
    if (onHideCategory) onHideCategory(catName);

    toast.success(toUpdate.length > 0
      ? `Categoría eliminada. ${toUpdate.length} producto(s) sin categoría`
      : `Categoría "${catName}" eliminada`
    );
    onProductsRefresh();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Categorías del POS</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Add new */}
          <div className="flex gap-2">
            <Input
              placeholder="Nueva categoría..."
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
            {categories.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No hay categorías. Agrega una arriba.</p>
            ) : (
              categories.map(cat => {
                const usageCount = products.filter(p => p.category === cat).length;
                const isEditing = editingCat?.oldName === cat;

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
                          <Badge variant="secondary" className="text-xs">{usageCount} producto{usageCount !== 1 ? 's' : ''}</Badge>
                        )}
                        <Button size="icon" variant="ghost" className="h-7 w-7"
                          onClick={() => setEditingCat({ oldName: cat, newName: cat })}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7"
                          onClick={() => handleDelete(cat)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}