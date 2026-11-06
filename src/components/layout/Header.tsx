import { Bell, Moon, Sun, Menu, PackageOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePendingReturns } from '@/hooks/usePendingReturns';
import { useData } from '@/contexts/DataContext';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useAuth } from '@/contexts/AuthContext';
import { useThemeToggle } from '@/hooks/useTheme';

interface HeaderProps {
  title: string;
  onMenuToggle?: () => void;
  showMenuButton?: boolean;
}

const Header = ({ title, onMenuToggle, showMenuButton }: HeaderProps) => {
  const { tickets, getNewTicketsCount, getCriticalTicketsCount, markTicketAsRead } = useData();
  const { isAdmin } = useAuth();
  const { theme, toggleTheme } = useThemeToggle();
  const navigate = useNavigate();
  const pendingReturns = usePendingReturns();
  const ticketCount = getNewTicketsCount();
  const newCount = ticketCount + pendingReturns.length;
  const criticalCount = getCriticalTicketsCount();
  
  const newTickets = tickets.filter(t => t.is_new);

  return (
    <header className="h-14 md:h-16 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-3 md:px-6">
      <div className="flex items-center gap-2">
        {showMenuButton && (
          <button onClick={onMenuToggle} className="p-2 rounded-lg hover:bg-secondary/50 transition-colors">
            <Menu className="w-5 h-5 text-foreground" />
          </button>
        )}
        <h1 className="text-lg md:text-xl font-semibold text-foreground truncate">{title}</h1>
      </div>

      <div className="flex items-center gap-1 md:gap-2">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-secondary/50 transition-colors"
          title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5 text-warning" />
          ) : (
            <Moon className="w-5 h-5 text-muted-foreground" />
          )}
        </button>

        {isAdmin && (
          <Popover>
            <PopoverTrigger asChild>
              <button className="relative p-2 rounded-lg hover:bg-secondary/50 transition-colors">
                <Bell className={cn(
                  "w-5 h-5",
                  newCount > 0 ? "text-primary bell-blink" : "text-muted-foreground",
                  criticalCount > 0 && "text-critical"
                )} />
                {newCount > 0 && (
                  <span className={cn(
                    "absolute -top-1 -right-1 w-5 h-5 rounded-full text-xs flex items-center justify-center font-medium",
                    criticalCount > 0 
                      ? "bg-critical text-critical-foreground pulse-critical" 
                      : "bg-primary text-primary-foreground"
                  )}>
                    {newCount}
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 bg-card border-border" align="end">
              <div className="p-4 border-b border-border">
                <h3 className="font-semibold text-foreground">Notificações</h3>
                <p className="text-sm text-muted-foreground">
                  {ticketCount} novo(s) chamado(s){pendingReturns.length > 0 && ` • ${pendingReturns.length} devolução(ões) pendente(s)`}
                </p>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {pendingReturns.map(r => (
                  <button key={r.id} onClick={() => navigate(`/reunioes?reuniao=${r.meeting_id}`)}
                    className="w-full p-4 text-left border-b border-border hover:bg-secondary/50 transition-colors bg-warning/10">
                    <div className="flex items-start gap-3">
                      <PackageOpen className="w-4 h-4 mt-0.5 text-warning shrink-0" />
                      <div>
                        <p className="font-medium text-foreground text-sm">Solicitação de devolução de equipamento</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          O usuário {r.requested_by_name || 'Usuário'} solicitou a devolução de {r.quantity > 1 ? `${r.quantity} un. de ` : 'um '}{r.equipment_label}{r.meeting_theme ? ` referente à reunião ${r.meeting_theme}` : ''}.
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
                {newTickets.length === 0 && pendingReturns.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    Nenhuma notificação
                  </div>
                ) : (
                  newTickets.map((ticket) => (
                    <button
                      key={ticket.id}
                      onClick={() => markTicketAsRead(ticket.id)}
                      className={cn(
                        "w-full p-4 text-left border-b border-border last:border-0 hover:bg-secondary/50 transition-colors",
                        ticket.status === 'critical' && "bg-critical/10"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "w-2 h-2 rounded-full mt-2",
                          ticket.status === 'critical' ? "bg-critical pulse-critical" : "bg-primary"
                        )} />
                        <div>
                          <p className="font-medium text-foreground text-sm">{ticket.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {ticket.status === 'critical' ? '🚨 CRÍTICO' : 'Novo chamado'}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </header>
  );
};

export default Header;
