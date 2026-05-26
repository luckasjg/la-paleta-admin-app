import React, { useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, FileJson, FileSpreadsheet, Upload, AlertTriangle, Loader2 } from 'lucide-react';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  exportManagementCSV, exportFullJSON, validateBackup, restoreFromBackup,
} from '@/lib/backupHelpers';

export default function BackupRestoreCard() {
  const fileInputRef = useRef(null);
  const [parsedBackup, setParsedBackup] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [exporting, setExporting] = useState(null); // 'csv' | 'json' | null

  const handleExportCSV = async () => {
    try {
      setExporting('csv');
      await exportManagementCSV();
      toast.success('Archivo de gestión descargado');
    } catch (e) {
      toast.error('Error al exportar: ' + e.message);
    } finally {
      setExporting(null);
    }
  };

  const handleExportJSON = async () => {
    try {
      setExporting('json');
      await exportFullJSON();
      toast.success('Backup completo descargado');
    } catch (e) {
      toast.error('Error al exportar: ' + e.message);
    } finally {
      setExporting(null);
    }
  };

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.json')) {
      toast.error('Solo se aceptan archivos .json');
      e.target.value = '';
      return;
    }
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const validation = validateBackup(parsed);
      if (!validation.ok) {
        toast.error('Archivo inválido: ' + validation.error);
        e.target.value = '';
        return;
      }
      setParsedBackup({ data: parsed, validation });
      setConfirmText('');
      setConfirmOpen(true);
    } catch (err) {
      toast.error('No se pudo leer el JSON: ' + err.message);
    } finally {
      e.target.value = '';
    }
  };

  const handleConfirmRestore = async () => {
    if (!parsedBackup) return;
    setBusy(true);
    setProgress('Iniciando...');
    try {
      await restoreFromBackup(parsedBackup.data, (msg) => setProgress(msg));
      toast.success('Restauración completada. Recargando...');
      setTimeout(() => window.location.reload(), 1200);
    } catch (e) {
      toast.error('Error en la restauración: ' + e.message);
      setBusy(false);
      setConfirmOpen(false);
    }
  };

  const canConfirm = confirmText.trim().toUpperCase() === 'RESTAURAR' && !busy;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Copias de Seguridad
          </CardTitle>
          <CardDescription>
            Exporta tus datos para resguardo o restaura el sistema desde un respaldo previo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Exportación */}
          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-start gap-1 text-left"
              onClick={handleExportCSV}
              disabled={exporting === 'csv'}
            >
              <div className="flex items-center gap-2 font-semibold">
                {exporting === 'csv' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
                Exportar para Gestión (Excel/CSV)
              </div>
              <span className="text-xs text-muted-foreground font-normal">
                Inventario y Recetas en formato legible para auditoría manual.
              </span>
            </Button>

            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-start gap-1 text-left"
              onClick={handleExportJSON}
              disabled={exporting === 'json'}
            >
              <div className="flex items-center gap-2 font-semibold">
                {exporting === 'json' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileJson className="h-4 w-4" />}
                Exportar Sistema Completo (JSON)
              </div>
              <span className="text-xs text-muted-foreground font-normal">
                Backup íntegro de todas las entidades. Úsalo para restaurar.
              </span>
            </Button>
          </div>

          {/* Restauración */}
          <div className="border-t pt-4">
            <Label className="flex items-center gap-2 mb-2 text-destructive font-semibold">
              <Upload className="h-4 w-4" />
              Restaurar Base de Datos
            </Label>
            <p className="text-xs text-muted-foreground mb-2">
              Selecciona un archivo <code>.json</code> de respaldo. Se te pedirá confirmación antes de aplicar los cambios.
            </p>
            <Input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              onChange={handleFileSelected}
              className="cursor-pointer"
            />
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={(o) => { if (!busy) setConfirmOpen(o); }}>
        <AlertDialogContent className="border-destructive border-2">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Confirmación crítica de restauración
            </AlertDialogTitle>
            <AlertDialogDescription className="text-destructive font-medium">
              ¿Está completamente seguro de restaurar el sistema? Esta acción borrará la base de datos actual
              y la reemplazará por los datos del archivo de respaldo. Esta operación no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {parsedBackup?.validation?.counts && (
            <div className="rounded-md bg-secondary/50 p-3 text-xs space-y-1 max-h-40 overflow-y-auto">
              <p className="font-semibold text-foreground">Contenido del respaldo:</p>
              {parsedBackup.validation.exported_at && (
                <p className="text-muted-foreground">
                  Fecha: {new Date(parsedBackup.validation.exported_at).toLocaleString()}
                </p>
              )}
              <ul className="grid grid-cols-2 gap-x-3">
                {Object.entries(parsedBackup.validation.counts).map(([k, v]) => (
                  <li key={k} className="text-muted-foreground">
                    <span className="font-mono">{k}</span>: {v}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-sm">
              Escribe <span className="font-bold text-destructive">RESTAURAR</span> para confirmar:
            </Label>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="RESTAURAR"
              disabled={busy}
              autoFocus
            />
          </div>

          {busy && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {progress}
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleConfirmRestore(); }}
              disabled={!canConfirm}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {busy ? 'Restaurando...' : 'Restaurar definitivamente'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}