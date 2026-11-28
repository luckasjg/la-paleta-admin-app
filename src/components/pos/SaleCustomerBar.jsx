import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import CustomerPickerDialog from '@/components/pos/CustomerPickerDialog';
import EditCustomerNameDialog from '@/components/pos/EditCustomerNameDialog';
import { touchRecentCustomer } from '@/lib/recentCustomers';

// Barra del cliente de la venta en el POS: mostrar, cambiar/asignar y editar su nombre.
export default function SaleCustomerBar({ saleCustomer, setSaleCustomer, sessionId }) {
  const [picker, setPicker] = useState(false);
  const [editName, setEditName] = useState(false);
  const has = saleCustomer && !saleCustomer.none;

  return (
    <>
      <div className="mt-3 flex items-center gap-2 text-sm">
        <Badge variant={saleCustomer?.none ? 'outline' : 'secondary'}>
          {has ? `Cliente: ${saleCustomer.full_name} · V-${saleCustomer.cedula}` : 'Venta sin datos de cliente'}
        </Badge>
        <button type="button" className="text-xs underline text-muted-foreground" onClick={() => setPicker(true)}>
          {has ? 'Cambiar cliente' : 'Asignar cliente'}
        </button>
        {has &&
          <button type="button" className="text-xs underline text-muted-foreground" onClick={() => setEditName(true)}>
            Editar nombre
          </button>}
      </div>
      <CustomerPickerDialog open={picker} onOpenChange={setPicker} sessionId={sessionId} onDone={setSaleCustomer} />
      <EditCustomerNameDialog open={editName} onOpenChange={setEditName} customer={saleCustomer}
        onSaved={(full_name) => { const c = { ...saleCustomer, full_name }; setSaleCustomer(c); touchRecentCustomer(c, sessionId); }} />
    </>
  );
}