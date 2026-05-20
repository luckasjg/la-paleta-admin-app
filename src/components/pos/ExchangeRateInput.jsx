import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DollarSign } from 'lucide-react';

export default function ExchangeRateInput({ rate, setRate }) {
  const [local, setLocal] = useState(String(rate));

  useEffect(() => { setLocal(String(rate)); }, [rate]);

  const commit = () => {
    const n = parseFloat(local);
    if (n > 0 && n !== rate) setRate(n);
    else setLocal(String(rate));
  };

  return (
    <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-1.5 shadow-sm">
      <DollarSign className="h-4 w-4 text-primary" />
      <Label className="text-xs text-muted-foreground whitespace-nowrap">1 USD =</Label>
      <Input
        type="number" step="0.01" min="0"
        value={local}
        onChange={e => setLocal(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
        className="h-7 w-20 text-sm font-mono px-2"
      />
      <span className="text-xs font-medium text-muted-foreground">Bs.</span>
    </div>
  );
}