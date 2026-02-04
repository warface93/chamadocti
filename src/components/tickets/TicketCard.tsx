import { Ticket, User } from '@/types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Clock, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TicketCardProps {
  ticket: Ticket;
  user?: User;
  onClick?: () => void;
}

const statusLabels = {
  open: 'Aberto',
  in_progress: 'Em Andamento',
  resolved: 'Resolvido',
  critical: 'Crítico',
  pending: 'Pendente',
};

const statusStyles = {
  open: 'bg-open/10 text-open border-open/30',
  in_progress: 'bg-warning/10 text-warning border-warning/30',
  resolved: 'bg-success/10 text-success border-success/30',
  critical: 'bg-critical/10 text-critical border-critical/30',
  pending: 'bg-muted text-muted-foreground border-muted',
};

const categoryLabels = {
  software: 'Software',
  hardware: 'Hardware',
  network: 'Rede',
  other: 'Outro',
};

const TicketCard = ({ ticket, user, onClick }: TicketCardProps) => {
  const isCritical = ticket.status === 'critical';
  const isNew = ticket.is_new;

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-card rounded-xl p-5 border cursor-pointer transition-all duration-300',
        isNew && 'new-ticket-glow',
        isCritical ? 'glow-border-critical hover:bg-critical/5' : 'glow-border hover:bg-primary/5',
        'card-hover-effect'
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {isCritical && (
              <AlertTriangle className="w-4 h-4 text-critical pulse-critical" />
            )}
            <h3 className="font-semibold text-foreground">{ticket.title}</h3>
            {isNew && (
              <span className="px-2 py-0.5 text-xs bg-primary/20 text-primary rounded-full">
                Novo
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">{ticket.description}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline" className={cn('text-xs', statusStyles[ticket.status])}>
          {statusLabels[ticket.status]}
        </Badge>
        <Badge variant="outline" className="text-xs bg-secondary/50 text-secondary-foreground">
          {categoryLabels[ticket.category]}
        </Badge>
      </div>

      <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
        <span>{user?.name || 'Usuário'}</span>
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>{format(new Date(ticket.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
        </div>
      </div>
    </div>
  );
};

export default TicketCard;
