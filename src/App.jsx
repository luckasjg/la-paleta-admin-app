import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

import AppLayout from '@/components/layout/AppLayout';
import RequireAdmin from '@/components/RequireAdmin';
import Dashboard from '@/pages/Dashboard.jsx';
import POS from '@/pages/POS';
import Inventory from '@/pages/Inventory';
import Recipes from '@/pages/Recipes';
import Preparations from '@/pages/Preparations.jsx';
import Production from '@/pages/Production';
import Products from '@/pages/Products';
import CashRegister from '@/pages/CashRegister';
import Adjustments from '@/pages/Adjustments';
import Transfers from '@/pages/Transfers.jsx';
import AuditHistory from '@/pages/AuditHistory.jsx';
import ProfitabilityAnalysis from '@/pages/ProfitabilityAnalysis.jsx';
import ExpensesManager from '@/pages/ExpensesManager.jsx';
import Wallets from '@/pages/Wallets.jsx';
import Settings from '@/pages/Settings.jsx';
import DigitalMenuTV from '@/pages/DigitalMenuTV.jsx';
import Login from '@/pages/Login.jsx';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

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

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      {/* Vista pública de TV — sin layout, sin sidebar, sin navbar */}
      <Route path="/tv-menu" element={<DigitalMenuTV />} />
      <Route path="/login" element={<Login />} />
      <Route element={<AppLayout />}>
        <Route path="/" element={<RequireAdmin><Dashboard /></RequireAdmin>} />
        <Route path="/pos" element={<POS />} />
        <Route path="/inventario" element={<RequireAdmin><Inventory /></RequireAdmin>} />
        <Route path="/recetas" element={<RequireAdmin><Recipes /></RequireAdmin>} />
        <Route path="/preparados" element={<RequireAdmin><Preparations /></RequireAdmin>} />
        <Route path="/produccion" element={<RequireAdmin><Production /></RequireAdmin>} />
        <Route path="/productos" element={<RequireAdmin><Products /></RequireAdmin>} />
        <Route path="/caja" element={<CashRegister />} />
        <Route path="/ajustes" element={<RequireAdmin><Adjustments /></RequireAdmin>} />
        <Route path="/transferencias" element={<RequireAdmin><Transfers /></RequireAdmin>} />
        <Route path="/auditorias" element={<RequireAdmin><AuditHistory /></RequireAdmin>} />
        <Route path="/rentabilidad" element={<RequireAdmin><ProfitabilityAnalysis /></RequireAdmin>} />
        <Route path="/gastos" element={<RequireAdmin><ExpensesManager /></RequireAdmin>} />
        <Route path="/billeteras" element={<RequireAdmin><Wallets /></RequireAdmin>} />
        <Route path="/configuracion" element={<RequireAdmin><Settings /></RequireAdmin>} />
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