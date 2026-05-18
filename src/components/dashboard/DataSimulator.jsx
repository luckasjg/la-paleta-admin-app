import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FlaskConical, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';

const MOCK_PREFIX = '[TEST]';
const PAYMENT_METHODS = ['efectivo', 'pago_movil', 'punto_venta'];
const SHIFTS = ['manana', 'tarde', 'noche'];

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export default function DataSimulator() {
  const qc = useQueryClient();
  const [running, setRunning] = useState(false);
  const [salesCount, setSalesCount] = useState(2500);

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list(),
  });
  const { data: trays = [] } = useQuery({
    queryKey: ['trays'],
    queryFn: () => base44.entities.Tray.list(),
  });

  const refreshAll = () => {
    qc.invalidateQueries({ queryKey: ['sales'] });
    qc.invalidateQueries({ queryKey: ['products'] });
    qc.invalidateQueries({ queryKey: ['trays'] });
    qc.invalidateQueries({ queryKey: ['supplies'] });
  };

  const handleGenerate = async () => {
    if (products.length === 0) {
      toast.error('No hay productos para simular ventas');
      return;
    }
    const numSales = Math.max(1, Math.min(10000, parseInt(salesCount) || 0));
    setRunning(true);
    const toastId = toast.loading(`Generando ${numSales} ventas de prueba...`);

    try {
      const sales = [];

      for (let i = 0; i < numSales; i++) {
        const daysAgo = randInt(0, 29);
        const hour = randInt(9, 21);
        const minute = randInt(0, 59);
        const saleDate = moment()
          .subtract(daysAgo, 'days')
          .hour(hour).minute(minute).second(0)
          .toISOString();

        const itemCount = randInt(1, 3);
        const items = [];
        let total = 0;

        for (let j = 0; j < itemCount; j++) {
          const product = pick(products.filter(p => p.is_active !== false));
          if (!product) continue;
          const quantity = randInt(1, 2);
          const unit_price = product.price || randInt(2, 10);
          const subtotal = unit_price * quantity;
          total += subtotal;

          const item = {
            // Mock marker: prefix product_name
            product_name: `${MOCK_PREFIX} ${product.name}`,
            product_id: product.id,
            category: product.category || '',
            quantity,
            unit_price,
            subtotal,
          };

          // If it's an ice cream product, attach a random active tray
          if (product.grams_per_serving > 0) {
            const activeTrays = trays.filter(t => t.status === 'activa');
            if (activeTrays.length > 0) {
              const tray = pick(activeTrays);
              item.tray_id = tray.id;
              item.flavor = tray.recipe_name;
              item.grams = product.grams_per_serving;
            }
          }
          items.push(item);
        }

        if (items.length === 0) continue;

        const paymentMethod = pick(PAYMENT_METHODS);
        sales.push({
          items,
          total,
          payment_method: paymentMethod,
          cash_amount: paymentMethod === 'efectivo' ? total : 0,
          digital_amount: paymentMethod !== 'efectivo' ? total : 0,
          sale_date: saleDate,
          shift: pick(SHIFTS),
        });
      }

      // Bulk create in chunks to be safe
      const chunkSize = 50;
      for (let i = 0; i < sales.length; i += chunkSize) {
        await base44.entities.Sale.bulkCreate(sales.slice(i, i + chunkSize));
        toast.loading(`Generando... ${Math.min(i + chunkSize, sales.length)} / ${sales.length}`, { id: toastId });
      }

      toast.success(`${sales.length} ventas de prueba generadas`, { id: toastId });
      refreshAll();
    } catch (err) {
      toast.error('Error generando datos: ' + err.message, { id: toastId });
    } finally {
      setRunning(false);
    }
  };

  const handleDelete = async () => {
    setRunning(true);
    const toastId = toast.loading('Buscando y eliminando datos de prueba...');

    try {
      let totalDeleted = 0;
      let safetyLoops = 0;

      // Loop: fetch a batch, delete mock entries, repeat until no mock entries remain.
      // We always fetch from the top (no offset) because deletions shrink the dataset
      // and would desync any pagination offset.
      while (safetyLoops < 100) {
        safetyLoops++;
        const batch = await base44.entities.Sale.list('-sale_date', 500);
        if (!batch || batch.length === 0) break;

        const mockInBatch = batch.filter(s =>
          (s.items || []).some(it => it.product_name?.startsWith(MOCK_PREFIX))
        );

        if (mockInBatch.length === 0) break;

        // Delete in parallel chunks for speed
        const chunkSize = 10;
        for (let i = 0; i < mockInBatch.length; i += chunkSize) {
          const chunk = mockInBatch.slice(i, i + chunkSize);
          await Promise.all(chunk.map(s => base44.entities.Sale.delete(s.id)));
          totalDeleted += chunk.length;
          toast.loading(`Eliminando... ${totalDeleted} ventas borradas`, { id: toastId });
        }
      }

      if (totalDeleted === 0) {
        toast.success('No se encontraron datos de prueba para eliminar', { id: toastId });
      } else {
        toast.success(`${totalDeleted} ventas de prueba eliminadas`, { id: toastId });
      }
      refreshAll();
    } catch (err) {
      toast.error('Error eliminando: ' + err.message, { id: toastId });
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card className="border-dashed border-amber-400/50 bg-amber-50/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-amber-700">
          <FlaskConical className="h-4 w-4" />
          Simulador de Datos (Modo Prueba)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground mb-3">
          Genera ventas ficticias de los últimos 30 días para evaluar el punto de equilibrio según tus gastos fijos.
          Todos los registros llevan el prefijo <code className="bg-muted px-1 rounded">{MOCK_PREFIX}</code> para poder eliminarlos fácilmente.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[140px]">
            <Label className="text-xs">Cantidad de ventas</Label>
            <Input
              type="number"
              min="1"
              max="10000"
              value={salesCount}
              onChange={(e) => setSalesCount(e.target.value)}
              disabled={running}
              className="h-9"
            />
            <p className="text-[10px] text-muted-foreground mt-1">Sugerido: 2300–3000 para estresar el cálculo de break-even.</p>
          </div>
          <Button onClick={handleGenerate} disabled={running} size="sm">
            {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FlaskConical className="h-4 w-4 mr-2" />}
            Generar Ventas
          </Button>
          <Button onClick={handleDelete} disabled={running} size="sm" variant="destructive">
            {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
            Eliminar Datos de Prueba
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}