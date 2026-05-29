import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Coins } from 'lucide-react';
import { useCurrencySymbol, CURRENCY_OPTIONS } from '@/lib/useCurrencySymbol';
import { toast } from 'sonner';

export default function CurrencySelectorCard() {
  const { symbol, setSymbol } = useCurrencySymbol();

  const handleChange = (value) => {
    setSymbol(value);
    const opt = CURRENCY_OPTIONS.find(o => o.value === value);
    toast.success(`Divisa cambiada a ${opt?.label || value}`);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Coins className="h-4 w-4 text-primary" />
          Divisa del Sistema
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Cambia el símbolo de moneda mostrado en toda la app. Esto es solo visual
          —los datos guardados y los cálculos no se modifican.
        </p>
        <div className="max-w-xs">
          <Label className="text-xs text-muted-foreground">Símbolo</Label>
          <Select value={symbol} onValueChange={handleChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCY_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  <span className="font-mono mr-2">{opt.symbol}</span>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}