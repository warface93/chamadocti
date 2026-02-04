import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from './Sidebar';
import Header from './Header';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/chamados': 'Chamados',
  '/usuarios': 'Usuários',
  '/setores': 'Setores',
  '/relatorios': 'Relatórios',
  '/meus-chamados': 'Meus Chamados',
  '/novo-chamado': 'Novo Chamado',
};

const Layout = () => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const title = pageTitles[location.pathname] || 'Suporte Técnico';

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title={title} />
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
