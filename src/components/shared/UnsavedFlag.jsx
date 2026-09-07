import { useUnsavedChanges } from '@/lib/useUnsavedChanges';

// Colócalo dentro de un diálogo/formulario para avisar al usuario si intenta
// salir del departamento con trabajo sin guardar.
export default function UnsavedFlag({ active = true }) {
  useUnsavedChanges(active);
  return null;
}