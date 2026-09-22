import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Printer } from 'lucide-react';
import { RELAY_FILES, RELAY_PORT } from '@/lib/printRelaySource';

function downloadFile(name, content) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

/** Entrega los archivos del relay de impresión local y sus instrucciones. */
export default function PrintRelayCard() {
  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Printer className="h-5 w-5 text-primary" />
        <div>
          <h3 className="font-semibold">Impresión directa de comandas</h3>
          <p className="text-xs text-muted-foreground">
            Instala el relay local en la computadora del POS para imprimir sin diálogo del navegador
          </p>
        </div>
      </div>

      <ol className="text-sm space-y-1.5 list-decimal list-inside text-muted-foreground">
        <li>Descarga los 4 archivos y colócalos juntos en una carpeta (ej. <code className="font-mono text-foreground">C:\PrintRelay</code>).</li>
        <li>Instala Node.js (versión LTS) en ese equipo si no lo tiene.</li>
        <li>Comparte la impresora térmica en Windows con el nombre <code className="font-mono text-foreground">POS80</code>.</li>
        <li>Doble clic en <code className="font-mono text-foreground">start-relay.bat</code> y deja la ventana abierta.</li>
        <li>En el POS verás el indicador verde «Impresión directa» junto al botón de imprimir.</li>
      </ol>

      <div className="flex flex-wrap gap-2">
        {RELAY_FILES.map(f => (
          <Button key={f.name} variant="outline" size="sm" onClick={() => downloadFile(f.name, f.content)}>
            <Download className="h-3.5 w-3.5 mr-1" /> {f.name}
          </Button>
        ))}
      </div>

      <p className="text-[11px] text-muted-foreground border-t pt-3">
        El relay corre sólo en esa computadora (puerto {RELAY_PORT}) y no necesita internet.
        Cualquier otro equipo seguirá imprimiendo con el diálogo normal del navegador.
      </p>
    </Card>
  );
}