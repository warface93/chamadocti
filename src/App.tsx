import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { DataProvider } from "@/contexts/DataContext";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import Layout from "./components/layout/Layout";
import Dashboard from "./pages/Dashboard";
import Usuarios from "./pages/Usuarios";
import Setores from "./pages/Setores";
import Relatorios from "./pages/Relatorios";
import MeusChamados from "./pages/MeusChamados";
import NovoChamado from "./pages/NovoChamado";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <DataProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route element={<Layout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/chamados" element={<Navigate to="/dashboard" replace />} />
                <Route path="/usuarios" element={<Usuarios />} />
                <Route path="/setores" element={<Setores />} />
                <Route path="/relatorios" element={<Relatorios />} />
                <Route path="/meus-chamados" element={<MeusChamados />} />
                <Route path="/novo-chamado" element={<NovoChamado />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </DataProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
