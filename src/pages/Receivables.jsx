import React from 'react';
import PageHeader from '@/components/shared/PageHeader';
import ReceivablesPanel from '@/components/receivables/ReceivablesPanel';
import { usePermission } from '@/lib/usePermission';

export default function Receivables() {
  const { can } = usePermission();
  return (
    <div className="space-y-6">
      <PageHeader title="Cuentas por Cobrar" description="Deudas de clientes, estados de cuenta y abonos" />
      <ReceivablesPanel canSettle={can('cobranza', 'delete')} />
    </div>
  );
}