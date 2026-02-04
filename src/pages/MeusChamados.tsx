import { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import TicketCard from '@/components/tickets/TicketCard';
import TicketModal from '@/components/tickets/TicketModal';
import { Ticket } from '@/types';

const MeusChamados = () => {
  const { user, isAdmin } = useAuth();
  const { tickets, users } = useData();
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  if (isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const myTickets = tickets.filter(t => t.user_id === user.id);
  const getUserById = (id: string) => users.find(u => u.id === id);

  return (
    <div className="space-y-6">
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
              onClick={() => setSelectedTicket(ticket)}
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
