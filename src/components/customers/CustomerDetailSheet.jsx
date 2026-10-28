import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getCustomerHistory } from '@/lib/customerHistory';
import CustomerHistoryTab from '@/components/customers/CustomerHistoryTab';
import LoyaltyTab from '@/components/customers/LoyaltyTab';
import CouponsTab from '@/components/customers/CouponsTab';

export default function CustomerDetailSheet({ customer, onOpenChange }) {
  const { data, isLoading } = useQuery({
    queryKey: ['customer_history', customer?.id],
    enabled: !!customer,
    queryFn: () => getCustomerHistory(customer),
  });

  return (
    <Sheet open={!!customer} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        {customer && <>
          <SheetHeader className="text-left">
            <SheetTitle>{customer.full_name}</SheetTitle>
            <p className="text-sm text-muted-foreground">{customer.phone}{customer.instagram ? ` · @${customer.instagram}` : ''}</p>
          </SheetHeader>
          <Tabs defaultValue="historial" className="mt-6">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="historial">Historial</TabsTrigger>
              <TabsTrigger value="puntos">Billetera y Puntos</TabsTrigger>
              <TabsTrigger value="cupones">Promociones</TabsTrigger>
            </TabsList>
            {isLoading ? <p className="text-sm text-muted-foreground py-8 text-center">Cargando…</p> : <>
              <TabsContent value="historial" className="mt-5"><CustomerHistoryTab customer={customer} data={data} /></TabsContent>
              <TabsContent value="puntos" className="mt-5"><LoyaltyTab data={data} /></TabsContent>
            </>}
            <TabsContent value="cupones" className="mt-5"><CouponsTab customer={customer} /></TabsContent>
          </Tabs>
        </>}
      </SheetContent>
    </Sheet>
  );
}