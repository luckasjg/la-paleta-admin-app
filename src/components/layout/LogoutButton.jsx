import React from 'react';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

export default function LogoutButton() {
  return (
    <Button
      variant="outline"
      className="w-full justify-start gap-2"
      onClick={() => base44.auth.logout('/')}
    >
      <LogOut className="h-4 w-4" />
      Cerrar sesión
    </Button>
  );
}