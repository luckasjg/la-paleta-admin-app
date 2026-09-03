import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Campos obligatorios para poder ejecutar el pago móvil / transferencia.
export const REFUND_REQUIRED_FIELDS = ['titular', 'cedula', 'banco', 'numero_cuenta', 'telefono'];

export const isRefundDataComplete = (data = {}, reference = '') =>
  REFUND_REQUIRED_FIELDS.every(f => String(data[f] || '').trim().length > 0) &&
  String(reference || '').trim().length > 0;

const Field = ({ label, children }) => (
  <div className="space-y-1">
    <Label className="text-[11px] text-muted-foreground">{label}</Label>
    {children}
  </div>
);

export default function RefundCustomerFields({ data, reference, onChange, onReferenceChange }) {
  const set = (key) => (e) => onChange({ ...data, [key]: e.target.value });

  return (
    <div className="space-y-2.5 pt-1">
      <div className="grid grid-cols-2 gap-2">
        <Field label="Titular de la cuenta *">
          <Input value={data.titular || ''} onChange={set('titular')} placeholder="Nombre y apellido" className="h-9 text-sm" />
        </Field>
        <Field label="Cédula *">
          <Input value={data.cedula || ''} onChange={set('cedula')} placeholder="V-12345678" className="h-9 text-sm" />
        </Field>
        <Field label="Banco *">
          <Input value={data.banco || ''} onChange={set('banco')} placeholder="Ej. Banesco" className="h-9 text-sm" />
        </Field>
        <Field label="Tipo de cuenta">
          <Select value={data.tipo_cuenta || 'pago_movil'} onValueChange={v => onChange({ ...data, tipo_cuenta: v })}>
            <SelectTrigger className="h-9 text-sm bg-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pago_movil">Pago Móvil</SelectItem>
              <SelectItem value="ahorro">Ahorro</SelectItem>
              <SelectItem value="corriente">Corriente</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="N° de cuenta *">
          <Input value={data.numero_cuenta || ''} onChange={set('numero_cuenta')} placeholder="0000-0000-00-0000000000" className="h-9 text-sm font-mono" />
        </Field>
        <Field label="Teléfono *">
          <Input value={data.telefono || ''} onChange={set('telefono')} placeholder="0412-0000000" className="h-9 text-sm font-mono" />
        </Field>
      </div>

      <Field label="Motivo / referencia *">
        <Textarea
          value={reference || ''}
          onChange={e => onReferenceChange(e.target.value)}
          placeholder="Ej. Vuelto no disponible en efectivo — venta #123"
          rows={2}
          className="text-sm bg-white"
        />
      </Field>
    </div>
  );
}