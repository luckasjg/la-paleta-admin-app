import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';
import { useShopSetting } from '@/lib/useShopSetting';
import { toast } from 'sonner';

export default function WhatsAppConfigCard() {
  const { value, isLoading, save } = useShopSetting('whatsapp_number');
  const [draft, setDraft] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const handleSave = async () => {
    const digits = draft.replace(/[^\d]/g, '');
    if (digits.length < 10) {
      toast.error('Ingresa el número con código de país, ej. 584121234567');
      return;
    }
    setIsSaving(true);
    await save(digits);
    setIsSaving(false);
    toast.success('Número de WhatsApp guardado');
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-primary" />
          WhatsApp de Pedidos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Número al que llegan los pedidos del menú móvil. Incluye el código de país
          sin signos ni espacios (ej. <span className="font-mono">584121234567</span>).
        </p>
        <div className="flex flex-col sm:flex-row gap-2 max-w-md">
          <div className="flex-1">
            <Label className="text-xs text-muted-foreground">Número</Label>
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="584121234567"
              inputMode="numeric"
              disabled={isLoading}
            />
          </div>
          <Button onClick={handleSave} disabled={isSaving || isLoading} className="sm:mt-5">
            Guardar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}