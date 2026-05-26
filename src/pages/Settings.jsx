import React from 'react';
import PageHeader from '@/components/shared/PageHeader';
import BackupRestoreCard from '@/components/settings/BackupRestoreCard';

export default function Settings() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuración"
        description="Ajustes del sistema y herramientas de mantenimiento"
      />
      <BackupRestoreCard />
    </div>
  );
}