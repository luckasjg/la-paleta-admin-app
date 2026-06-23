import React, { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

/**
 * Combobox genérico con búsqueda por tipeo.
 * Las opciones se ordenan alfabéticamente (A-Z) por su label automáticamente.
 *
 * Props:
 *  - value: id seleccionado (string)
 *  - onChange: (id) => void
 *  - options: [{ value, label, sublabel? }]
 *  - placeholder: texto cuando no hay selección
 *  - searchPlaceholder: texto del input de búsqueda
 *  - emptyText: texto cuando no hay coincidencias
 *  - className, triggerClassName: estilos extra
 *  - disabled: bool
 */
export default function SearchableCombobox({
  value,
  onChange,
  options = [],
  placeholder = 'Seleccionar...',
  searchPlaceholder = 'Buscar...',
  emptyText = 'Sin resultados',
  className,
  triggerClassName,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);

  const sortedOptions = useMemo(
    () =>
      [...options].sort((a, b) =>
        (a.label || '').localeCompare(b.label || '', undefined, { sensitivity: 'base' })
      ),
    [options]
  );

  const selected = sortedOptions.find(o => o.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'w-full justify-between font-normal h-auto min-h-9 py-1.5',
            !selected && 'text-muted-foreground',
            triggerClassName
          )}
        >
          <div className="flex flex-col min-w-0 flex-1 text-left">
            {selected ? (
              <>
                <span className="truncate">{selected.label}</span>
                {selected.sublabel && (
                  <span className="text-[10px] text-muted-foreground truncate leading-tight">
                    {selected.sublabel}
                  </span>
                )}
              </>
            ) : (
              <span className="truncate">{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn('p-0 w-[--radix-popover-trigger-width] min-w-[240px]', className)}
        align="start"
      >
        <Command className="overflow-hidden">
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList
            className="max-h-60 overflow-y-auto overscroll-contain"
            onWheel={(e) => e.stopPropagation()}
          >
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {sortedOptions.map(opt => (
                <CommandItem
                  key={opt.value}
                  value={`${opt.label} ${opt.sublabel || ''}`}
                  onSelect={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === opt.value ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="truncate">{opt.label}</span>
                    {opt.sublabel && (
                      <span className="text-[10px] text-muted-foreground truncate">
                        {opt.sublabel}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}