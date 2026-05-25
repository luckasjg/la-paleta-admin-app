import { useState, useEffect, useCallback } from 'react';

const LS_KEY = 'expense_categories_v1';

const DEFAULTS = {
  fijo: ['Alquiler', 'Nómina', 'Servicios', 'Software', 'Seguros'],
  variable: ['Mantenimiento', 'Imprevistos', 'Marketing', 'Compras menores'],
};

function load() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw);
    return {
      fijo: Array.isArray(parsed.fijo) ? parsed.fijo : DEFAULTS.fijo,
      variable: Array.isArray(parsed.variable) ? parsed.variable : DEFAULTS.variable,
    };
  } catch {
    return DEFAULTS;
  }
}

export function useExpenseCategories() {
  const [categories, setCategories] = useState(load);

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(categories));
  }, [categories]);

  const addCategory = useCallback((type, name) => {
    const trimmed = name.trim();
    if (!trimmed) return false;
    setCategories(prev => {
      const existing = prev[type] || [];
      if (existing.some(c => c.toLowerCase() === trimmed.toLowerCase())) return prev;
      return { ...prev, [type]: [...existing, trimmed] };
    });
    return true;
  }, []);

  const renameCategory = useCallback((type, oldName, newName) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setCategories(prev => ({
      ...prev,
      [type]: (prev[type] || []).map(c => (c === oldName ? trimmed : c)),
    }));
  }, []);

  const deleteCategory = useCallback((type, name) => {
    setCategories(prev => ({
      ...prev,
      [type]: (prev[type] || []).filter(c => c !== name),
    }));
  }, []);

  return { categories, addCategory, renameCategory, deleteCategory };
}