import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, Package, BookOpen, Factory,
  DollarSign, Warehouse, SlidersHorizontal, Menu, X, IceCream, FlaskConical, ClipboardCheck, Percent, Wallet, Coins, ArrowLeftRight, Settings as SettingsIcon } from
'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { usePermission } from '@/lib/usePermission';
import LogoutButton from '@/components/layout/LogoutButton';

// Cada item declara el módulo de permisos al que pertenece.
const navItems = [
{ label: 'Dashboard', icon: LayoutDashboard, path: '/', module: 'dashboard' },
{ label: 'Punto de Venta', icon: ShoppingCart, path: '/pos', module: 'pos' },
{ label: 'Inventario', icon: Warehouse, path: '/inventario', module: 'inventario' },
{ label: 'Recetas', icon: BookOpen, path: '/recetas', module: 'recetas' },
{ label: 'Preparados', icon: FlaskConical, path: '/preparados', module: 'preparados' },
{ label: 'Producción', icon: Factory, path: '/produccion', module: 'produccion' },
{ label: 'Productos', icon: Package, path: '/productos', module: 'productos' },
{ label: 'Caja', icon: DollarSign, path: '/caja', module: 'caja' },
{ label: 'Transferencias', icon: ArrowLeftRight, path: '/transferencias', module: 'transferencias' },
{ label: 'Ajustes Inv.', icon: SlidersHorizontal, path: '/ajustes', module: 'ajustes' },
{ label: 'Auditorías', icon: ClipboardCheck, path: '/auditorias', module: 'auditorias' },
{ label: 'Rentabilidad', icon: Percent, path: '/rentabilidad', module: 'rentabilidad' },
{ label: 'Gastos', icon: Wallet, path: '/gastos', module: 'gastos' },
{ label: 'Billeteras', icon: Coins, path: '/billeteras', module: 'billeteras' },
{ label: 'Configuración', icon: SettingsIcon, path: '/configuracion', module: 'configuracion' }];


export default function Sidebar() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { can } = usePermission();
  const visibleItems = navItems.filter((item) => can(item.module, 'view'));

  return (
    <>
      {/* Mobile toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}>
        
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Overlay */}
      {mobileOpen &&
      <div
        className="fixed inset-0 bg-black/30 z-40 lg:hidden"
        onClick={() => setMobileOpen(false)} />

      }

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 h-full w-64 bg-card border-r border-border z-40 flex flex-col transition-transform duration-300",
        "lg:translate-x-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Logo */}
        <div className="p-4 flex items-center justify-center border-b border-border bg-gray-400">
          <img src="https://media.base44.com/images/public/69e078117e2725c0776d724e/7cc689726_logoPaletaMesadetrabajo8-111.png" alt="La Paleta Café" className="h-32 w-auto object-contain" />
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {visibleItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                  isActive ?
                  "bg-primary text-primary-foreground shadow-sm" :
                  "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}>
                
                <item.icon className="h-4 w-4 flex-shrink-0" />
                {item.label}
              </Link>);

          })}
        </nav>

        <div className="p-4 border-t border-border space-y-3">
          <LogoutButton />
          <p className="text-xs text-muted-foreground text-center">Gelato & Café v1.0</p>
        </div>
      </aside>
    </>);

}