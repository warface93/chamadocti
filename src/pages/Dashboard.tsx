import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import StatusCard from '@/components/tickets/StatusCard';
import TicketCard from '@/components/tickets/TicketCard';
import { FileText, FolderOpen, Clock, CheckCircle, AlertTriangle } from 'lucide-react';

const Dashboard = () => {
  const { isAdmin } = useAuth();
  const { tickets, users } = useData();

  if (!isAdmin) {
    return <Navigate to="/meus-chamados" replace />;
  }

  const totalTickets = tickets.length;
  const openTickets = tickets.filter(t => t.status === 'open').length;
  const inProgressTickets = tickets.filter(t => t.status === 'in_progress').length;
  const resolvedTickets = tickets.filter(t => t.status === 'resolved').length;
  const criticalTickets = tickets.filter(t => t.status === 'critical').length;

  const recentTickets = [...tickets]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 6);

  const getUserById = (id: string) => users.find(u => u.id === id);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatusCard title="Total" value={totalTickets} icon={FileText} variant="total" />
        <StatusCard title="Abertos" value={openTickets} icon={FolderOpen} variant="open" />
        <StatusCard title="Em Andamento" value={inProgressTickets} icon={Clock} variant="in_progress" />
        <StatusCard title="Resolvidos" value={resolvedTickets} icon={CheckCircle} variant="resolved" />
        <StatusCard title="Críticos" value={criticalTickets} icon={AlertTriangle} variant="critical" />
      </div>

      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Chamados Recentes</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recentTickets.map((ticket) => (
            <TicketCard 
              key={ticket.id} 
              ticket={ticket} 
              user={getUserById(ticket.user_id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
