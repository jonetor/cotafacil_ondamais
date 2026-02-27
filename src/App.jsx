import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { Helmet } from "react-helmet";
import { Toaster } from "@/components/ui/toaster";

import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import DashboardPage from "@/pages/DashboardPage";
import Layout from "@/components/Layout";

import { useAuth } from "@/contexts/SupabaseAuthContext";
import { Loader2 } from "lucide-react";

import Companies from "@/pages/Companies";
import CompanyDetailPage from "@/pages/CompanyDetailPage";
import Clients from "@/pages/Clients";
import ClientFormPage from "@/pages/ClientFormPage";
import Products from "@/pages/Products";
import Quotes from "@/pages/Quotes";
import Sellers from "@/pages/Sellers";
import Users from "@/pages/Users";
import AuditLog from "@/pages/AuditLog";
import Settings from "@/pages/Settings";
import QuoteFormPage from "@/pages/QuoteFormPage";
import FiscalPage from "@/pages/FiscalPage";
import CalculoFiscalPage from "@/pages/CalculoFiscalPage";
import NFePage from "@/pages/NFePage";
import ApiIntegrationPage from "@/pages/ApiIntegrationPage";
import OrcamentoItens from "@/pages/OrcamentoItens";
import CreateSellerPage from "@/pages/CreateSellerPage";

// ✅ página do orçamento
import NovoOrcamento from "@/pages/NovoOrcamento";

/**
 * Tela de loading padrão enquanto valida auth
 */
function FullscreenLoader() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-app-background">
      <Loader2 className="h-16 w-16 animate-spin text-primary" />
    </div>
  );
}

/**
 * Rota protegida
 * - se não logado -> manda pro /login e guarda "from" pra voltar depois
 */
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullscreenLoader />;

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    );
  }

  return children;
}

/**
 * Rota pública
 * - se logado -> manda pro /dashboard
 */
function PublicRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <FullscreenLoader />;

  return user ? <Navigate to="/dashboard" replace /> : children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* ===== Rotas Públicas ===== */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />

      <Route
        path="/register"
        element={
          <PublicRoute>
            <RegisterPage />
          </PublicRoute>
        }
      />

      <Route
        path="/forgot-password"
        element={
          <PublicRoute>
            <ForgotPasswordPage />
          </PublicRoute>
        }
      />

      {/* ===== Rotas Protegidas com Layout ===== */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        {/* ao entrar em "/" manda pro dashboard */}
        <Route index element={<Navigate to="dashboard" replace />} />

        {/* ✅ Rotas internas RELATIVAS */}
        <Route path="dashboard" element={<DashboardPage />} />

        <Route path="empresas" element={<Companies />} />
        <Route path="empresas/:id" element={<CompanyDetailPage />} />
        <Route path="empresas/:id/:tab" element={<CompanyDetailPage />} />

        <Route path="clientes" element={<Clients />} />
        <Route path="clientes/novo" element={<ClientFormPage />} />
        <Route path="clientes/editar/:id" element={<ClientFormPage />} />

        <Route path="produtos" element={<Products />} />

        <Route path="cotacoes" element={<Quotes />} />
        <Route path="cotacoes/novo" element={<QuoteFormPage />} />
        <Route path="cotacoes/editar/:id" element={<QuoteFormPage />} />

        <Route path="orcamentos/novo" element={<NovoOrcamento />} />
        <Route path="orcamentos/itens" element={<OrcamentoItens />} />

        <Route path="vendedores" element={<Sellers />} />
        <Route path="usuarios" element={<Users />} />
        <Route path="auditoria" element={<AuditLog />} />
        <Route path="configuracoes" element={<Settings />} />
        <Route path="api-integration" element={<ApiIntegrationPage />} />

        <Route path="fiscal" element={<FiscalPage />} />
        <Route path="fiscal/calculo" element={<CalculoFiscalPage />} />
        <Route path="fiscal/nfe" element={<NFePage />} />
        <Route path="usuarios/novo-vendedor" element={<CreateSellerPage />} />
      </Route>

      {/* ===== Fallback: qualquer rota desconhecida ===== */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <>
      <Helmet>
        <title>CotaFácil | Plataforma</title>
        <meta
          name="description"
          content="Plataforma de gerenciamento com sistema de login e autenticação."
        />
        <meta property="og:title" content="CotaFácil | Plataforma" />
        <meta
          property="og:description"
          content="Acesse a plataforma para gerenciar suas operações."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Helmet>

      <Router>
        <AppRoutes />
        <Toaster />
      </Router>
    </>
  );
}

export default App;