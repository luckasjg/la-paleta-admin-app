import React from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';

export default function TelegramConnectCard() {
  return (
    <div className="m-3 rounded-xl border border-border bg-secondary/50 p-3">
      <div className="mb-2 flex items-center gap-2">
        <Send className="h-4 w-4 text-primary" />
        <p className="text-xs font-semibold text-foreground">Asesor en tu teléfono</p>
      </div>
      <p className="mb-3 text-[11px] leading-relaxed text-muted-foreground">
        Vincula tu Telegram para consultarle desde el celular. Las propuestas de cambio se aprueban aquí en la app.
      </p>
      <Button asChild size="sm" variant="outline" className="w-full">
        <a href={base44.agents.getTelegramConnectURL('asesor')} target="_blank" rel="noreferrer">
          Conectar Telegram
        </a>
      </Button>
    </div>);

}