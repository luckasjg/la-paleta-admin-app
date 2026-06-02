import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, Plus, Check, X, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { readCategoryOrder, writeCategoryOrder, applyCategoryOrder } from '@/lib/categoryOrder';

export default function POSCategoryManager({ open, onOpenChange, categories, products, onProductsRefresh, onHideCategory, onAddCategory }) {
  const [newCatInput, setNewCatInput] = useState('');
  const [editingCat, setEditingCat] = useState(null); // { oldName, newName }
  // Lista local ordenada (la fuente de verdad mientras el diálogo está abierto).
  const [orderedCats, setOrderedCats] = useState([]);

  // Sincroniza la lista local con las categorías entrantes + orden guardado.
  useEffect(() => {
    setOrderedCats(applyCategoryOrder(categories));
  }, [categories]);

  const persistOrder = (list) => {
    setOrderedCats(list);
    writeCategoryOrder(list);
  };

  const handleAdd = () => {
    const val = newCatInput.trim();
    if (!val) return;
    if (categories.some(c => c.toLowerCase() === val.toLowerCase())) {
      toast.error('Esa categoría ya existe');
      return;
    }
    if (onAddCategory) onAddCategory(val);
    setNewCatInput('');
    toast.success(`Categoría "${val}" agregada`);
  };

  const handleEdit = async () => {
    if (!editingCat) return;
    const { oldName, newName } = editingCat;
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) { setEditingCat(null); return; }

    if (categories.some(c => c.toLowerCase() === trimmed.toLowerCase() && c.toLowerCase() !== oldName.toLowerCase())) {
      toast.error('Ya existe una categoría con ese nombre');
      return;
    }

    const toUpdate = products.filter(p => p.category === oldName);
    await Promise.all(toUpdate.map(p =>
      base44.entities.Product.update(p.id, { category: trimmed })
    ));

    // Reemplaza el nombre dentro del orden persistido sin perder la posición.
    const currentOrder = readCategoryOrder();
    const idx = currentOrder.indexOf(oldName.toLowerCase());
    if (idx !== -1) {
      const next = [...currentOrder];
      next[idx] = trimmed.toLowerCase();
      writeCategoryOrder(next);
    }

    if (onHideCategory) onHideCategory(oldName);
    if (onAddCategory) onAddCategory(trimmed);

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

    // Limpia del orden persistido.
    const currentOrder = readCategoryOrder();
    writeCategoryOrder(currentOrder.filter(c => c !== catName.toLowerCase()));

    if (onHideCategory) onHideCategory(catName);

    toast.success(toUpdate.length > 0
      ? `Categoría eliminada. ${toUpdate.length} producto(s) sin categoría`
      : `Categoría "${catName}" eliminada`
    );
    onProductsRefresh();
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const from = result.source.index;
    const to = result.destination.index;
    if (from === to) return;
    const next = [...orderedCats];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    persistOrder(next);
  };

  // Métricas memoizadas para evitar refiltrar dentro del render por cada categoría.
  const usageMap = useMemo(() => {
    const m = {};
    products.forEach(p => {
      const c = p.category;
      if (!c) return;
      m[c] = (m[c] || 0) + 1;
    });
    return m;
  }, [products]);

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

          <p className="text-xs text-muted-foreground">
            Arrastra <GripVertical className="inline h-3 w-3 -mt-0.5" /> para reordenar las categorías. El orden se aplica al POS y al catálogo de Productos.
          </p>

          {/* Lista ordenable */}
          {orderedCats.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No hay categorías. Agrega una arriba.</p>
          ) : (
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="categories">
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="space-y-2"
                  >
                    {orderedCats.map((cat, index) => {
                      const usageCount = usageMap[cat] || 0;
                      const isEditing = editingCat?.oldName === cat;

                      return (
                        <Draggable key={cat} draggableId={cat} index={index} isDragDisabled={isEditing}>
                          {(prov, snapshot) => (
                            <div
                              ref={prov.innerRef}
                              {...prov.draggableProps}
                              className={`flex items-center gap-2 px-3 py-2 rounded-lg border bg-card ${snapshot.isDragging ? 'border-primary shadow-md' : 'border-border'}`}
                            >
                              <span
                                {...prov.dragHandleProps}
                                className={`flex-shrink-0 text-muted-foreground ${isEditing ? 'opacity-40 cursor-not-allowed' : 'cursor-grab active:cursor-grabbing hover:text-foreground'}`}
                                title="Arrastrar para reordenar"
                              >
                                <GripVertical className="h-4 w-4" />
                              </span>

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
                                  <span className="flex-1 text-sm font-medium capitalize">{cat}</span>
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
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}