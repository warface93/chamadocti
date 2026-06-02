import { useState, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import StatusCard from '@/components/tickets/StatusCard';
import TicketCard from '@/components/tickets/TicketCard';
import TicketModal from '@/components/tickets/TicketModal';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Ticket } from '@/types';
import {
  FileText,
  FolderOpen,
  Clock,
  CheckCircle,
  AlertTriangle,
  Hourglass,
  Search,
} from 'lucide-react';

const MeusChamados = () => {
  const { user, isAdmin } = useAuth();
  const { tickets, users, markTicketAsRead } = useData();
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const myTickets = useMemo(() => {
    if (!user) return [];
    return tickets.filter((t) => t.user_id === user.id);
  }, [tickets, user]);

  const mostRecentTicketId = useMemo(() => {
    if (myTickets.length === 0) return null;
    const sorted = [...myTickets].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    return sorted[0]?.id;
  }, [myTickets]);

  const counts = useMemo(() => ({
    total: myTickets.length,
    open: myTickets.filter((t) => t.status === 'open').length,
    pending: myTickets.filter((t) => t.status === 'pending').length,
    in_progress: myTickets.filter((t) => t.status === 'in_progress').length,
    resolved: myTickets.filter((t) => t.status === 'resolved').length,
    critical: myTickets.filter((t) => t.status === 'critical').length,
  }), [myTickets]);

  const filteredTickets = useMemo(() => {
    const term = search.trim().toLowerCase();
    return myTickets
      .filter((t) => {
        const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
        const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter;
        const responsible = (t.assigned_admin_name || (t as any).status_changed_by || '').toLowerCase();
        const matchesSearch =
          !term ||
          t.title.toLowerCase().includes(term) ||
          (t.description?.toLowerCase().includes(term) ?? false) ||
          t.category.toLowerCase().includes(term) ||
          responsible.includes(term);
        return matchesStatus && matchesCategory && matchesSearch;
      })
      .sort((a, b) => {
        const aResolved = a.status === 'resolved' ? 1 : 0;
        const bResolved = b.status === 'resolved' ? 1 : 0;
        if (aResolved !== bResolved) return aResolved - bResolved;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [myTickets, search, statusFilter, categoryFilter]);

  if (isAdmin) return <Navigate to="/dashboard" replace />;
  if (!user) return <Navigate to="/login" replace />;

  const getUserById = (id: string) => users.find((u) => u.id === id);

  const handleTicketClick = async (ticket: Ticket) => {
    if (ticket.is_new) {
      await markTicketAsRead(ticket.id);
    }
    setSelectedTicket(ticket);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="cursor-pointer" onClick={() => setStatusFilter('all')}>
          <StatusCard title="Total" value={counts.total} icon={FileText} variant="total" />
        </div>
        <div className="cursor-pointer" onClick={() => setStatusFilter('open')}>
          <StatusCard title="Abertos" value={counts.open} icon={FolderOpen} variant="open" />
        </div>
        <div className="cursor-pointer" onClick={() => setStatusFilter('pending')}>
          <StatusCard title="Pendentes" value={counts.pending} icon={Hourglass} variant="pending" />
        </div>
        <div className="cursor-pointer" onClick={() => setStatusFilter('in_progress')}>
          <StatusCard title="Em Andamento" value={counts.in_progress} icon={Clock} variant="in_progress" />
        </div>
        <div className="cursor-pointer" onClick={() => setStatusFilter('resolved')}>
          <StatusCard title="Resolvidos" value={counts.resolved} icon={CheckCircle} variant="resolved" />
        </div>
        <div className="cursor-pointer" onClick={() => setStatusFilter('critical')}>
          <StatusCard title="Críticos" value={counts.critical} icon={AlertTriangle} variant="critical" />
        </div>
      </div>

      <div className="bg-card rounded-xl p-4 border border-border glow-border">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar chamados..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-secondary/50"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full md:w-48 bg-secondary/50">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas Categorias</SelectItem>
              <SelectItem value="internet">Internet</SelectItem>
              <SelectItem value="computador">Computador</SelectItem>
              <SelectItem value="telefone">Telefone</SelectItem>
              <SelectItem value="conta">Conta</SelectItem>
              <SelectItem value="sistema">Sistema</SelectItem>
              <SelectItem value="outros">Outros</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <h2 className="text-lg font-semibold text-foreground">Meus Chamados</h2>

      {myTickets.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">Você ainda não tem chamados.</p>
          <p className="text-sm text-muted-foreground">
            Clique em "Novo Chamado" no menu para criar um.
          </p>
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          Nenhum chamado encontrado
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTickets.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              user={getUserById(ticket.user_id)}
              onClick={() => handleTicketClick(ticket)}
              isNewest={ticket.id === mostRecentTicketId}
            />
          ))}
        </div>
      )}

      {selectedTicket && (
        <TicketModal
          ticket={selectedTicket}
          user={getUserById(selectedTicket.user_id)}
          onClose={() => setSelectedTicket(null)}
        />
      )}
    </div>
  );
};

export default MeusChamados;
