import { useState, useEffect, useRef, useCallback } from 'react';
import { Ticket, User, TicketStatus } from '@/types';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Star, Save, Paperclip, UserCheck, ArrowDown } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface TicketModalProps {
  ticket: Ticket;
  user?: User;
  onClose: () => void;
}

const statusLabels = {
  open: 'Aberto',
  in_progress: 'Em Andamento',
  resolved: 'Resolvido',
  critical: 'Crítico',
  pending: 'Pendente',
};

const statusStyles = {
  open: 'bg-open/10 text-open',
  in_progress: 'bg-warning/10 text-warning',
  resolved: 'bg-success/10 text-success',
  critical: 'bg-critical/10 text-critical',
  pending: 'bg-muted text-muted-foreground',
};

const TicketModal = ({ ticket, user, onClose }: TicketModalProps) => {
  const { updateTicket, messages, addMessage, users, refetchMessages } = useData();
  const { user: currentUser, isAdmin } = useAuth();
  const [newMessage, setNewMessage] = useState('');
  const [rating, setRating] = useState(ticket.rating || 0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<TicketStatus>(ticket.status);
  const [isSavingStatus, setIsSavingStatus] = useState(false);

  const hasStatusChanged = selectedStatus !== ticket.status;

  useEffect(() => {
    refetchMessages(ticket.id);
  }, [ticket.id]);

  useEffect(() => {
    setSelectedStatus(ticket.status);
  }, [ticket.status]);

  const ticketMessages = messages.filter(m => m.ticket_id === ticket.id);

  const handleSaveStatus = async () => {
    if (!hasStatusChanged || !currentUser) return;
    setIsSavingStatus(true);
    try {
      // Update status and record who changed it
      const { error } = await supabase
        .from('tickets')
        .update({
          status: selectedStatus,
          updated_at: new Date().toISOString(),
          status_changed_by: currentUser.name,
          status_changed_at: new Date().toISOString(),
        })
        .eq('id', ticket.id);

      if (error) throw error;
      toast.success('Status atualizado!');
    } catch (error) {
      toast.error('Erro ao atualizar status');
    } finally {
      setIsSavingStatus(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !currentUser || isSending) return;
    
    setIsSending(true);
    try {
      await addMessage({
        ticket_id: ticket.id,
        user_id: currentUser.id,
        content: newMessage.trim(),
      });
      setNewMessage('');
      toast.success('Mensagem enviada!');
    } catch (error) {
      toast.error('Erro ao enviar mensagem');
    } finally {
      setIsSending(false);
    }
  };

  const handleRating = async (value: number) => {
    try {
      setRating(value);
      await updateTicket(ticket.id, { rating: value });
      toast.success('Avaliação enviada!');
    } catch (error) {
      toast.error('Erro ao enviar avaliação');
    }
  };

  const getUserById = (id: string) => users.find(u => u.id === id);

  const alreadyRated = ticket.rating !== null && ticket.rating !== undefined && ticket.rating > 0;
  const canRate = !isAdmin && ticket.status === 'resolved' && ticket.user_id === currentUser?.id && !alreadyRated;

  // Get status_changed_by from the ticket (may come from DB)
  const statusChangedBy = (ticket as any).status_changed_by;
  const statusChangedAt = (ticket as any).status_changed_at;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-3">
            {ticket.title}
            <Badge className={cn('text-xs', statusStyles[ticket.status])}>
              {statusLabels[ticket.status]}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Detalhes do chamado e histórico de mensagens
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-secondary/30 rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">Descrição</p>
            <p className="text-foreground">{ticket.description}</p>
            {ticket.attachment_url && (
              <div className="mt-3 flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-muted-foreground" />
                <a
                  href={ticket.attachment_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  Ver anexo
                </a>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Criado por: <span className="text-foreground">{user?.name}</span>
            </span>
            <span className="text-muted-foreground">
              {format(new Date(ticket.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </span>
          </div>

          {/* Status change audit */}
          {statusChangedBy && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/20">
              <UserCheck className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">
                Atendido por: <span className="text-foreground font-medium">{statusChangedBy}</span>
                {statusChangedAt && (
                  <> em {format(new Date(statusChangedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</>
                )}
              </span>
            </div>
          )}

          {isAdmin && (
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">Alterar Status:</span>
              <Select value={selectedStatus} onValueChange={(v) => setSelectedStatus(v as TicketStatus)}>
                <SelectTrigger className="w-48 bg-secondary/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Aberto</SelectItem>
                  <SelectItem value="in_progress">Em Andamento</SelectItem>
                  <SelectItem value="resolved">Resolvido</SelectItem>
                  <SelectItem value="critical">Crítico</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                </SelectContent>
              </Select>
              {hasStatusChanged && (
                <Button variant="glow" size="sm" onClick={handleSaveStatus} disabled={isSavingStatus}>
                  <Save className="w-4 h-4 mr-1" />
                  {isSavingStatus ? 'Salvando...' : 'Salvar'}
                </Button>
              )}
            </div>
          )}

          {canRate && (
            <div className="p-4 bg-success/10 rounded-lg border border-success/30">
              <p className="text-sm text-success mb-2">Avalie o atendimento:</p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    onMouseEnter={() => setHoveredRating(value)}
                    onMouseLeave={() => setHoveredRating(0)}
                    onClick={() => handleRating(value)}
                    className="p-1"
                  >
                    <Star
                      className={cn(
                        'w-6 h-6 transition-colors',
                        (hoveredRating || rating) >= value
                          ? 'fill-warning text-warning'
                          : 'text-muted-foreground'
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {ticket.rating && ticket.rating > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Avaliação:</span>
              <div className="flex">
                {[1, 2, 3, 4, 5].map((value) => (
                  <Star
                    key={value}
                    className={cn(
                      'w-4 h-4',
                      ticket.rating! >= value
                        ? 'fill-warning text-warning'
                        : 'text-muted-foreground'
                    )}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-border pt-4">
            <p className="text-sm font-medium text-foreground mb-3">Chat</p>
            <ScrollArea className="h-48 pr-4">
              <div className="space-y-3">
                {ticketMessages.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhuma mensagem ainda
                  </p>
                ) : (
                  ticketMessages.map((msg) => {
                    const msgUser = getUserById(msg.user_id);
                    const isCurrentUser = msg.user_id === currentUser?.id;
                    return (
                      <div
                        key={msg.id}
                        className={cn(
                          'p-3 rounded-lg max-w-[80%]',
                          isCurrentUser
                            ? 'bg-primary/10 ml-auto'
                            : 'bg-secondary/50'
                        )}
                      >
                        <p className="text-xs text-muted-foreground mb-1">
                          {msgUser?.name || 'Usuário'} • {format(new Date(msg.created_at), 'HH:mm')}
                        </p>
                        <p className="text-sm text-foreground">{msg.content}</p>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>

            <div className="flex gap-2 mt-3">
              <Textarea
                placeholder="Digite sua mensagem..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="bg-secondary/50 min-h-[60px]"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <Button variant="glow" size="icon" onClick={handleSendMessage} disabled={isSending}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TicketModal;
