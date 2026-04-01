import { useState, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import StatusCard from '@/components/tickets/StatusCard';
import TicketCard from '@/components/tickets/TicketCard';
import TicketModal from '@/components/tickets/TicketModal';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, FolderOpen, Clock, CheckCircle, AlertTriangle, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Ticket } from '@/types';

const ITEMS_PER_PAGE = 15;

const DashboardSkeleton = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-24 rounded-xl" />
      ))}
    </div>
    <Skeleton className="h-16 rounded-xl" />
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-48 rounded-xl" />
      ))}
    </div>
  </div>
);

const Dashboard = () => {
  const { isAdmin } = useAuth();
  const { tickets, users, loading, markTicketAsRead } = useData();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const getUserById = (id: string) => users.find(u => u.id === id);

  const filteredTickets = useMemo(() => {
    if (!isAdmin) return [];
    const filtered = tickets.filter(ticket => {
      const userName = getUserById(ticket.user_id)?.name?.toLowerCase() || '';
      const matchesSearch = userName.includes(search.toLowerCase()) ||
                           ticket.title.toLowerCase().includes(search.toLowerCase()) ||
                           (ticket.description?.toLowerCase().includes(search.toLowerCase()) ?? false);
      const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
      const matchesCategory = categoryFilter === 'all' || ticket.category === categoryFilter;
      return matchesSearch && matchesStatus && matchesCategory;
    });

    filtered.sort((a, b) => {
      const aResolved = a.status === 'resolved' ? 1 : 0;
      const bResolved = b.status === 'resolved' ? 1 : 0;
      if (aResolved !== bResolved) return aResolved - bResolved;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return filtered;
  }, [tickets, search, statusFilter, categoryFilter, users, isAdmin]);

  if (!isAdmin) {
    return <Navigate to="/meus-chamados" replace />;
  }

  if (loading) {
    return <DashboardSkeleton />;
  }

  const totalTickets = tickets.length;
  const openTickets = tickets.filter(t => t.status === 'open').length;
  const inProgressTickets = tickets.filter(t => t.status === 'in_progress').length;
  const resolvedTickets = tickets.filter(t => t.status === 'resolved').length;
  const criticalTickets = tickets.filter(t => t.status === 'critical').length;

  const totalPages = Math.max(1, Math.ceil(filteredTickets.length / ITEMS_PER_PAGE));
  const paginatedTickets = filteredTickets.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const handleTicketClick = async (ticket: Ticket) => {
    if (ticket.is_new) {
      await markTicketAsRead(ticket.id);
    }
    setSelectedTicket(ticket);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="cursor-pointer" onClick={() => handleStatusFilterChange('all')}>
          <StatusCard title="Total" value={totalTickets} icon={FileText} variant="total" />
        </div>
        <div className="cursor-pointer" onClick={() => handleStatusFilterChange('open')}>
          <StatusCard title="Abertos" value={openTickets} icon={FolderOpen} variant="open" />
        </div>
        <div className="cursor-pointer" onClick={() => handleStatusFilterChange('in_progress')}>
          <StatusCard title="Em Andamento" value={inProgressTickets} icon={Clock} variant="in_progress" />
        </div>
        <div className="cursor-pointer" onClick={() => handleStatusFilterChange('resolved')}>
          <StatusCard title="Resolvidos" value={resolvedTickets} icon={CheckCircle} variant="resolved" />
        </div>
        <div className="cursor-pointer" onClick={() => handleStatusFilterChange('critical')}>
          <StatusCard title="Críticos" value={criticalTickets} icon={AlertTriangle} variant="critical" />
        </div>
      </div>

      <div className="bg-card rounded-xl p-4 border border-border glow-border">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome do usuário..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              className="pl-10 bg-secondary/50"
            />
          </div>
          <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setCurrentPage(1); }}>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {paginatedTickets.map((ticket) => (
          <TicketCard 
            key={ticket.id} 
            ticket={ticket} 
            user={getUserById(ticket.user_id)}
            onClick={() => handleTicketClick(ticket)}
          />
        ))}
      </div>

      {filteredTickets.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          Nenhum chamado encontrado
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(page => {
                if (totalPages <= 7) return true;
                if (page === 1 || page === totalPages) return true;
                if (Math.abs(page - currentPage) <= 1) return true;
                return false;
              })
              .map((page, idx, arr) => {
                const showEllipsis = idx > 0 && page - arr[idx - 1] > 1;
                return (
                  <span key={page} className="flex items-center gap-1">
                    {showEllipsis && <span className="px-2 text-muted-foreground">...</span>}
                    <Button
                      variant={currentPage === page ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className="w-8 h-8 p-0"
                    >
                      {page}
                    </Button>
                  </span>
                );
              })}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          <span className="text-xs text-muted-foreground ml-2">
            {filteredTickets.length} chamado(s)
          </span>
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

export default Dashboard;
