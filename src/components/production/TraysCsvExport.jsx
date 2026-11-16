import React from 'react';
import moment from 'moment';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { downloadCsv } from '@/lib/productionCsv';

const esc = (v) => { const s = String(v ?? ''); return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const d = (v, f = 'DD/MM/YYYY') => (v ? moment(v).format(f) : '—');

export default function TraysCsvExport() {
  const [busy, setBusy] = React.useState(false);
  const exportCsv = async () => {
    setBusy(true);
    const trays = await base44.entities.Tray.list('-created_date', 5000).finally(() => setBusy(false));
    const head = ['Sabor', 'Estado', 'Ubicación', 'Gramos restantes', 'Primera producción', 'Última producción', 'Agotada el'];
    const order = { activa: 0, agotada: 1 };
    const rows = [...trays]
      .sort((a, b) => (order[a.status] ?? 2) - (order[b.status] ?? 2) || (a.recipe_name || '').localeCompare(b.recipe_name || ''))
      .map(t => [
        t.recipe_name || '—',
        t.status === 'agotada' ? 'Agotada' : 'Activa',
        t.status === 'agotada' ? '—' : (t.in_vitrine ? 'Vitrina' : 'Depósito'),
        Math.round(Number(t.remaining_grams) || 0),
        d(t.first_production_date || t.production_date),
        d(t.production_date),
        t.status === 'agotada' ? d(t.closed_at, 'DD/MM/YYYY HH:mm') : '—',
      ]);
    const csv = [head, ...rows].map(r => r.map(esc).join(',')).join('\n');
    downloadCsv(csv, `bandejas_${moment().format('YYYY-MM-DD')}.csv`);
  };

  return (
    <Button variant="outline" onClick={exportCsv} disabled={busy}>
      <Download className="h-4 w-4 mr-2" /> {busy ? 'Exportando...' : 'CSV bandejas'}
    </Button>
  );
}