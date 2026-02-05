import { useState, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import TicketCard from '@/components/tickets/TicketCard';
import TicketModal from '@/components/tickets/TicketModal';
import { Ticket } from '@/types';
import { FileText, Calendar } from 'lucide-react';

const MeusChamados = () => {
  const { user, isAdmin } = useAuth();
  const { tickets, users, markTicketAsRead } = useData();
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  // Filter tickets for current user (moved before conditional returns)
  const myTickets = useMemo(() => {
    if (!user) return [];
    return tickets.filter(t => t.user_id === user.id);
  }, [tickets, user]);
  
  // Find the most recent ticket (to glow only that one)
  const mostRecentTicketId = useMemo(() => {
    if (myTickets.length === 0) return null;
    const sorted = [...myTickets].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    return sorted[0]?.id;
  }, [myTickets]);

  // Count tickets created this month
  const ticketsThisMonth = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return myTickets.filter(t => new Date(t.created_at) >= startOfMonth).length;
  }, [myTickets]);

  // Conditional returns after all hooks
  if (isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

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
      {/* Monthly stats card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl p-5 border border-border glow-card">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total de Chamados</p>
              <p className="text-2xl font-bold text-foreground">{myTickets.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-card rounded-xl p-5 border border-border glow-card">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Chamados este Mês</p>
              <p className="text-2xl font-bold text-foreground">{ticketsThisMonth}</p>
            </div>
          </div>
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
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {myTickets.map((ticket) => (
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
