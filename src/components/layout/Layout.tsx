import { useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from './Sidebar';
import Header from './Header';
import ForcePasswordChange from '@/components/ForcePasswordChange';
import IArpeAssistant from '@/components/iarpe/IArpeAssistant';
import { useIsMobile } from '@/hooks/use-mobile';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/chamados': 'Chamados',
  '/usuarios': 'Usuários',
  '/setores': 'Setores',
  '/relatorios': 'Relatórios',
  '/meus-chamados': 'Meus Chamados',
  '/novo-chamado': 'Novo Chamado',
  '/reunioes': 'Reunião',
  '/equipamentos': 'Equipamentos',
};

const Layout = () => {
  const { isAuthenticated, mustChangePassword, setMustChangePassword } = useAuth();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const title = pageTitles[location.pathname] || 'CTIChamados';

  return (
    <div className="flex min-h-screen bg-background">
      <ForcePasswordChange
        open={mustChangePassword}
        onSuccess={() => setMustChangePassword(false)}
      />
      
      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <div className={cn(
        isMobile ? 'fixed inset-y-0 left-0 z-50 transition-transform duration-300' : '',
        isMobile && !sidebarOpen ? '-translate-x-full' : 'translate-x-0'
      )}>
        <Sidebar onNavigate={() => isMobile && setSidebarOpen(false)} />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <Header title={title} onMenuToggle={isMobile ? () => setSidebarOpen(!sidebarOpen) : undefined} showMenuButton={isMobile} />
        <main className="flex-1 p-3 md:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
      <IArpeAssistant />
    </div>
  );
};

export default Layout;
