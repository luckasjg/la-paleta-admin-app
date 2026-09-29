import React, { useState } from 'react';
import PageHeader from '@/components/shared/PageHeader';
import ReceivablesPanel from '@/components/receivables/ReceivablesPanel';
import ReceivablesManager from '@/components/receivables/ReceivablesManager';
import ReceivablesPinGate from '@/components/receivables/ReceivablesPinGate';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePermission } from '@/lib/usePermission';
import { useRole } from '@/lib/useRole';

export default function Receivables() {
  const { can } = usePermission();
  const { isAdmin, isGerente, user } = useRole();
  const [tab, setTab] = useState('deudas');
  const [operator, setOperator] = useState(null);
  const bypass = isAdmin || isGerente;

  return (
    <div className="space-y-6">
      <PageHeader title="Cuentas por Cobrar" description="Deudas de clientes, estados de cuenta y abonos" />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="deudas">Deudas</TabsTrigger>
          <TabsTrigger value="gestion">Gestionar cuentas</TabsTrigger>
        </TabsList>
      </Tabs>
      {tab === 'deudas' && <ReceivablesPanel canSettle={can('cobranza', 'delete')} />}
      {tab === 'gestion' && (bypass || operator
        ? <ReceivablesManager operatorName={bypass ? user?.full_name : operator.full_name} onLock={bypass ? null : () => setOperator(null)} />
        : <ReceivablesPinGate onUnlock={setOperator} />)}
    </div>
  );
}