import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';

import Login from '@/pages/Login.jsx';
import Register from '@/pages/Register.jsx';
import ForgotPassword from '@/pages/ForgotPassword.jsx';
import ResetPassword from '@/pages/ResetPassword.jsx';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/layout/AppLayout';
import RequireAdmin from '@/components/RequireAdmin';
import RequirePermission from '@/components/RequirePermission';
import Dashboard from '@/pages/Dashboard.jsx';
import POS from '@/pages/POS';
import Inventory from '@/pages/Inventory';
import Recipes from '@/pages/Recipes';
import Preparations from '@/pages/Preparations.jsx';
import Production from '@/pages/Production';
import Products from '@/pages/Products';
import Orders from '@/pages/Orders.jsx';
import CashRegister from '@/pages/CashRegister';
import Adjustments from '@/pages/Adjustments';
import Transfers from '@/pages/Transfers.jsx';
import AuditHistory from '@/pages/AuditHistory.jsx';
import ProfitabilityAnalysis from '@/pages/ProfitabilityAnalysis.jsx';
import ExpensesManager from '@/pages/ExpensesManager.jsx';
import Wallets from '@/pages/Wallets.jsx';
import Settings from '@/pages/Settings.jsx';
import DigitalMenuTV from '@/pages/DigitalMenuTV.jsx';
import TVSabores from '@/pages/TVSabores.jsx';
import TVEspeciales from '@/pages/TVEspeciales.jsx';
import TVCafeMerengadas from '@/pages/TVCafeMerengadas.jsx';
import MenuMovil from '@/pages/MenuMovil.jsx';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Vistas públicas — sin layout, sin sidebar, sin navbar */}
      <Route path="/tv-menu" element={<DigitalMenuTV />} />
      <Route path="/tv/sabores" element={<TVSabores />} />
      <Route path="/tv/especiales" element={<TVEspeciales />} />
      <Route path="/tv/cafe-merengadas" element={<TVCafeMerengadas />} />
      <Route path="/menu-movil" element={<MenuMovil />} />

      {/* Páginas de autenticación — públicas */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<RequirePermission module="dashboard"><Dashboard /></RequirePermission>} />
          <Route path="/pos" element={<RequirePermission module="pos"><POS /></RequirePermission>} />
          <Route path="/inventario" element={<RequirePermission module="inventario"><Inventory /></RequirePermission>} />
          <Route path="/recetas" element={<RequirePermission module="recetas"><Recipes /></RequirePermission>} />
          <Route path="/preparados" element={<RequirePermission module="preparados"><Preparations /></RequirePermission>} />
          <Route path="/produccion" element={<RequirePermission module="produccion"><Production /></RequirePermission>} />
          <Route path="/productos" element={<RequirePermission module="productos"><Products /></RequirePermission>} />
          <Route path="/pedidos" element={<RequirePermission module="pedidos"><Orders /></RequirePermission>} />
          <Route path="/caja" element={<RequirePermission module="caja"><CashRegister /></RequirePermission>} />
          <Route path="/ajustes" element={<RequirePermission module="ajustes"><Adjustments /></RequirePermission>} />
          <Route path="/transferencias" element={<RequirePermission module="transferencias"><Transfers /></RequirePermission>} />
          <Route path="/auditorias" element={<RequirePermission module="auditorias"><AuditHistory /></RequirePermission>} />
          <Route path="/rentabilidad" element={<RequirePermission module="rentabilidad"><ProfitabilityAnalysis /></RequirePermission>} />
          <Route path="/gastos" element={<RequirePermission module="gastos"><ExpensesManager /></RequirePermission>} />
          <Route path="/billeteras" element={<RequirePermission module="billeteras"><Wallets /></RequirePermission>} />
          <Route path="/configuracion" element={<RequireAdmin><Settings /></RequireAdmin>} />
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App