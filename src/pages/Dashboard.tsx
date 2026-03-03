import { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import StatusCard from '@/components/tickets/StatusCard';
import TicketCard from '@/components/tickets/TicketCard';
import TicketModal from '@/components/tickets/TicketModal';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, FolderOpen, Clock, CheckCircle, AlertTriangle, Search } from 'lucide-react';
import { Ticket } from '@/types';

const Dashboard = () => {
  const { isAdmin } = useAuth();
  const { tickets, users, markTicketAsRead } = useData();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  if (!isAdmin) {
    return <Navigate to="/meus-chamados" replace />;
  }

  const totalTickets = tickets.length;
  const openTickets = tickets.filter(t => t.status === 'open').length;
  const inProgressTickets = tickets.filter(t => t.status === 'in_progress').length;
  const resolvedTickets = tickets.filter(t => t.status === 'resolved').length;
  const criticalTickets = tickets.filter(t => t.status === 'critical').length;

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.title.toLowerCase().includes(search.toLowerCase()) ||
                         (ticket.description?.toLowerCase().includes(search.toLowerCase()) ?? false);
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || ticket.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const getUserById = (id: string) => users.find(u => u.id === id);

  const handleTicketClick = async (ticket: Ticket) => {
    // Mark as read when clicking
    if (ticket.is_new) {
      await markTicketAsRead(ticket.id);
    }
    setSelectedTicket(ticket);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="cursor-pointer" onClick={() => setStatusFilter('all')}>
          <StatusCard title="Total" value={totalTickets} icon={FileText} variant="total" />
        </div>
        <div className="cursor-pointer" onClick={() => setStatusFilter('open')}>
          <StatusCard title="Abertos" value={openTickets} icon={FolderOpen} variant="open" />
        </div>
        <div className="cursor-pointer" onClick={() => setStatusFilter('in_progress')}>
          <StatusCard title="Em Andamento" value={inProgressTickets} icon={Clock} variant="in_progress" />
        </div>
        <div className="cursor-pointer" onClick={() => setStatusFilter('resolved')}>
          <StatusCard title="Resolvidos" value={resolvedTickets} icon={CheckCircle} variant="resolved" />
        </div>
        <div className="cursor-pointer" onClick={() => setStatusFilter('critical')}>
          <StatusCard title="Críticos" value={criticalTickets} icon={AlertTriangle} variant="critical" />
        </div>
      </div>

      <div className="bg-card rounded-xl p-4 border border-border glow-border">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar chamados..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-secondary/50"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-48 bg-secondary/50">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="open">Aberto</SelectItem>
              <SelectItem value="in_progress">Em Andamento</SelectItem>
              <SelectItem value="resolved">Resolvido</SelectItem>
              <SelectItem value="critical">Crítico</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full md:w-48 bg-secondary/50">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas Categorias</SelectItem>
              <SelectItem value="software">Software</SelectItem>
              <SelectItem value="hardware">Hardware</SelectItem>
              <SelectItem value="network">Rede</SelectItem>
              <SelectItem value="other">Outro</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTickets.map((ticket) => (
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
