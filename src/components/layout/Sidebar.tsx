import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  FileText, 
  BarChart3, 
  LogOut,
  Plus,
  CalendarDays,
  Monitor
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ctiLogoNeg from '@/assets/brand/cti-logo-horizontal-negativo.svg';
import { Button } from '@/components/ui/button';

interface SidebarProps {
  onNavigate?: () => void;
}

const Sidebar = ({ onNavigate }: SidebarProps) => {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();

  const adminLinks = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/novo-chamado', icon: Plus, label: 'Novo Chamado' },
    { to: '/usuarios', icon: Users, label: 'Usuários' },
    { to: '/setores', icon: Building2, label: 'Setores' },
    { to: '/relatorios', icon: BarChart3, label: 'Relatórios' },
    { to: '/reunioes', icon: CalendarDays, label: 'Agendar Reunião' },
    { to: '/equipamentos', icon: Monitor, label: 'Equipamentos' },
  ];

  const userLinks = [
    { to: '/meus-chamados', icon: FileText, label: 'Meus Chamados' },
    { to: '/novo-chamado', icon: Plus, label: 'Novo Chamado' },
    { to: '/reunioes', icon: CalendarDays, label: 'Agendar Reunião' },
  ];

  const links = isAdmin ? adminLinks : userLinks;

  return (
    <aside className="w-64 h-screen sticky top-0 bg-sidebar border-r border-sidebar-border flex flex-col overflow-y-auto">
      <div className="brand-stripe" />
      <div className="p-5 border-b border-sidebar-border">
        <img src={ctiLogoNeg} alt="CTI - Coordenadoria de Tecnologia da Informação" className="h-10 w-auto" />
        <p className="font-display font-bold text-sidebar-foreground mt-3 text-sm tracking-wide">CTIChamados</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-primary border-l-2 border-sidebar-primary'
                  : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent'
              )
            }
          >
            <link.icon className="w-5 h-5" />
            <span className="font-medium">{link.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-4 py-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-sm font-medium text-primary">{user?.name.charAt(0).toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">{user?.name}</p>
            <p className="text-xs text-sidebar-foreground/60">{isAdmin ? 'Administrador' : 'Usuário'}</p>
          </div>
        </div>
        <Button variant="ghost" className="w-full justify-start text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-critical" onClick={logout}>
          <LogOut className="w-4 h-4 mr-2" /> Sair
        </Button>
      </div>
    </aside>
  );
};

export default Sidebar;
