// Registro global de "cambios sin guardar". Cualquier formulario puede marcarse
// como sucio; la navegación entre departamentos consulta este registro para
// pedir confirmación antes de descartar el trabajo.
import React, { createContext, useCallback, useContext, useRef, useState } from 'react';

const UnsavedChangesContext = createContext(null);

export function UnsavedChangesProvider({ children }) {
  const keys = useRef(new Set());
  const [dirty, setDirty] = useState(false);

  const setDirtyFlag = useCallback((key, isDirty) => {
    if (isDirty) keys.current.add(key);
    else keys.current.delete(key);
    setDirty(keys.current.size > 0);
  }, []);

  const clearAll = useCallback(() => {
    keys.current.clear();
    setDirty(false);
  }, []);

  return (
    <UnsavedChangesContext.Provider value={{ dirty, setDirtyFlag, clearAll }}>
      {children}
    </UnsavedChangesContext.Provider>
  );
}

export function useUnsavedChangesStore() {
  return useContext(UnsavedChangesContext) || { dirty: false, setDirtyFlag: () => {}, clearAll: () => {} };
}