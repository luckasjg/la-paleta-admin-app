import React from 'react';
import PageHeader from '@/components/shared/PageHeader';
import BackupRestoreCard from '@/components/settings/BackupRestoreCard';
import SelectiveCleanupCard from '@/components/settings/SelectiveCleanupCard';
import SlackConnectionCard from '@/components/settings/SlackConnectionCard';
import CurrencySelectorCard from '@/components/settings/CurrencySelectorCard';
import ExchangeRatesCard from '@/components/settings/ExchangeRatesCard';
import WhatsAppConfigCard from '@/components/settings/WhatsAppConfigCard';
import UsersManagerCard from '@/components/settings/users/UsersManagerCard';
import StaffPOSManagerCard from '@/components/settings/StaffPOSManagerCard';
import PrintRelayCard from '@/components/settings/PrintRelayCard';

export default function Settings() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuración"
        description="Ajustes del sistema y herramientas de mantenimiento"
      />
      <UsersManagerCard />
      <StaffPOSManagerCard />
      <ExchangeRatesCard />
      <CurrencySelectorCard />
      <WhatsAppConfigCard />
      <PrintRelayCard />
      <SlackConnectionCard />
      <BackupRestoreCard />
      <SelectiveCleanupCard />
    </div>
  );
}