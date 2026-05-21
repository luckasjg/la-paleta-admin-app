import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, Package, BookOpen, Factory,
  DollarSign, Warehouse, SlidersHorizontal, Menu, X, IceCream, FlaskConical, ClipboardCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useRole } from '@/lib/useRole';

// adminOnly: true → solo visible para administradores
const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/', adminOnly: true },
  { label: 'Punto de Venta', icon: ShoppingCart, path: '/pos' },
  { label: 'Inventario', icon: Warehouse, path: '/inventario', adminOnly: true },
  { label: 'Recetas', icon: BookOpen, path: '/recetas', adminOnly: true },
  { label: 'Preparados', icon: FlaskConical, path: '/preparados', adminOnly: true },
  { label: 'Producción', icon: Factory, path: '/produccion', adminOnly: true },
  { label: 'Productos', icon: Package, path: '/productos', adminOnly: true },
  { label: 'Caja', icon: DollarSign, path: '/caja' },
  { label: 'Ajustes Inv.', icon: SlidersHorizontal, path: '/ajustes', adminOnly: true },
  { label: 'Auditorías', icon: ClipboardCheck, path: '/auditorias', adminOnly: true },
];

export default function Sidebar() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isAdmin } = useRole();
  const visibleItems = navItems.filter(item => !item.adminOnly || isAdmin);

  return (
    <>
      {/* Mobile toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 h-full w-64 bg-card border-r border-border z-40 flex flex-col transition-transform duration-300",
        "lg:translate-x-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Logo */}
        <div className="p-6 flex items-center gap-3 border-b border-border">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <IceCream className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-foreground">Gelato</h1>
            <p className="text-xs text-muted-foreground">& Café Premium</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {visibleItems.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">Gelato & Café v1.0</p>
        </div>
      </aside>
    </>
  );
}