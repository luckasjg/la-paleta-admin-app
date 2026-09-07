// Marca esta pantalla/formulario como "con cambios sin guardar" mientras
// `isDirty` sea true. Se limpia automáticamente al desmontar.
import { useEffect, useRef } from 'react';
import { useUnsavedChangesStore } from '@/lib/UnsavedChangesContext';

let counter = 0;

export function useUnsavedChanges(isDirty) {
  const { setDirtyFlag } = useUnsavedChangesStore();
  const key = useRef(`uc_${++counter}`);

  useEffect(() => {
    setDirtyFlag(key.current, !!isDirty);
  }, [isDirty, setDirtyFlag]);

  useEffect(() => {
    const id = key.current;
    return () => setDirtyFlag(id, false);
  }, [setDirtyFlag]);
}