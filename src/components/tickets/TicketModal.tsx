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
import { markTicketSeen } from '@/hooks/useTicketUnread';
import { Input } from '@/components/ui/input';
import { diffTicket, TICKET_CATEGORY_OPTIONS, categoryLabel } from '@/lib/ticketHistory';
import { Pencil, History } from 'lucide-react';

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
  const [selectedCategory, setSelectedCategory] = useState<string>(ticket.category);
  const [resolutionNote, setResolutionNote] = useState((ticket as any).resolution_note || '');
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(ticket.title);
  const [editDescription, setEditDescription] = useState(ticket.description || '');
  const [editFile, setEditFile] = useState<File | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [hasNewMessages, setHasNewMessages] = useState(false);

  const hasStatusChanged = selectedStatus !== ticket.status || selectedCategory !== ticket.category;

  const loadHistory = useCallback(async () => {
    const { data } = await supabase.from('ticket_history').select('*').eq('ticket_id', ticket.id).order('created_at', { ascending: false });
    setHistory(data || []);
  }, [ticket.id]);

  useEffect(() => {
    loadHistory();
    const ch = supabase.channel(`ticket-history-${ticket.id}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ticket_history', filter: `ticket_id=eq.${ticket.id}` }, loadHistory)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [ticket.id, loadHistory]);

  const recordHistory = async (before: Record<string, any>, after: Record<string, any>) => {
    if (!currentUser) return;
    const entries = diffTicket(before, after).map(e => ({ ...e, ticket_id: ticket.id, actor_id: currentUser.id, actor_name: currentUser.name }));
    if (entries.length) await supabase.from('ticket_history').insert(entries);
  };

  const isOwner = currentUser?.id === ticket.user_id;
  const canEdit = isOwner && ticket.status !== 'resolved';

  const handleSaveEdit = async () => {
    if (!currentUser || !editTitle.trim()) { toast.error('Informe o título'); return; }
    setSavingEdit(true);
    try {
      const after: Record<string, any> = { title: editTitle.trim(), description: editDescription.trim() };
      if (editFile) {
        const ext = editFile.name.split('.').pop();
        const path = `${currentUser.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('ticket-attachments').upload(path, editFile);
        if (upErr) throw upErr;
        after.attachment_url = supabase.storage.from('ticket-attachments').getPublicUrl(path).data.publicUrl;
      }
      const { error } = await supabase.from('tickets').update({ ...after, updated_at: new Date().toISOString() }).eq('id', ticket.id);
      if (error) throw error;
      await recordHistory(ticket as any, after);
      toast.success('Chamado atualizado!');
      setEditing(false); setEditFile(null);
    } catch {
      toast.error('Erro ao atualizar chamado');
    } finally {
      setSavingEdit(false);
    }
  };

  // Auto-assign admin on first interaction (open) and mark messages as seen
  useEffect(() => {
    refetchMessages(ticket.id);
    if (currentUser) markTicketSeen(ticket.id, currentUser.id);
    if (currentUser) {
      const now = new Date().toISOString();
      const updates: any = isAdmin
        ? { admin_last_read_at: now }
        : { user_last_read_at: now };

      if (isAdmin) {
        // Always set this admin as responsible when interacting with the ticket
        if (ticket.assigned_admin_id !== currentUser.id) {
          updates.assigned_admin_id = currentUser.id;
          updates.assigned_admin_name = currentUser.name;
        }
      }

      supabase.from('tickets').update(updates).eq('id', ticket.id).then(() => {});
    }
  }, [ticket.id]);

  // Mark seen whenever new messages arrive while modal is open
  const ticketMessagesLen = messages.filter(m => m.ticket_id === ticket.id).length;
  useEffect(() => {
    if (!currentUser) return;
    markTicketSeen(ticket.id, currentUser.id);
    const field = isAdmin ? 'admin_last_read_at' : 'user_last_read_at';
    supabase
      .from('tickets')
      .update({ [field]: new Date().toISOString() })
      .eq('id', ticket.id)
      .then(() => {});
  }, [ticketMessagesLen, currentUser?.id, ticket.id, isAdmin]);


  useEffect(() => {
    setSelectedStatus(ticket.status);
  }, [ticket.status]);
  useEffect(() => { setSelectedCategory(ticket.category); }, [ticket.category]);

  const ticketMessages = messages.filter(m => m.ticket_id === ticket.id);

  const getViewport = () =>
    (scrollRef.current as any)?.querySelector?.('[data-radix-scroll-area-viewport]') as HTMLDivElement | null;

  const scrollToBottom = useCallback(() => {
    const v = getViewport();
    if (v) {
      v.scrollTo({ top: v.scrollHeight, behavior: 'smooth' });
      setHasNewMessages(false);
      setAutoScroll(true);
    }
  }, []);

  useEffect(() => {
    const v = getViewport();
    if (!v) return;
    const onScroll = () => {
      const nearBottom = v.scrollHeight - v.scrollTop - v.clientHeight < 40;
      setAutoScroll(nearBottom);
      if (nearBottom) setHasNewMessages(false);
    };
    v.addEventListener('scroll', onScroll);
    return () => v.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const v = getViewport();
    if (!v) return;
    if (autoScroll) {
      v.scrollTo({ top: v.scrollHeight, behavior: 'smooth' });
    } else {
      const last = ticketMessages[ticketMessages.length - 1];
      if (last && last.user_id !== currentUser?.id) {
        setHasNewMessages(true);
      }
    }
  }, [ticketMessages.length, autoScroll]);

  const handleSaveStatus = async () => {
    if (!hasStatusChanged || !currentUser) return;
    setIsSavingStatus(true);
    try {
      const updateData: any = {
        status: selectedStatus,
        category: selectedCategory,
        updated_at: new Date().toISOString(),
        status_changed_by: currentUser.name,
        status_changed_at: new Date().toISOString(),
      };
      if (selectedStatus === 'resolved' && selectedStatus !== ticket.status) {
        updateData.resolution_note = resolutionNote.trim() || null;
      }
      if (isAdmin) {
        updateData.assigned_admin_id = currentUser.id;
        updateData.assigned_admin_name = currentUser.name;
        updateData.admin_last_read_at = new Date().toISOString();
      }
      const { error } = await supabase
        .from('tickets')
        .update(updateData)
        .eq('id', ticket.id);

      if (error) throw error;
      await recordHistory(ticket as any, { status: selectedStatus, category: selectedCategory, ...(selectedStatus === 'resolved' ? { resolution_note: updateData.resolution_note ?? null } : {}) });
      toast.success('Chamado atualizado!');
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
      // Always set this admin as responsible when sending a message
      if (isAdmin) {
        const updates: any = { admin_last_read_at: new Date().toISOString() };
        if (ticket.assigned_admin_id !== currentUser.id) {
          updates.assigned_admin_id = currentUser.id;
          updates.assigned_admin_name = currentUser.name;
        }
        await supabase.from('tickets').update(updates).eq('id', ticket.id);
      }
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
            {canEdit && !editing && (
              <Button type="button" variant="ghost" size="sm" className="ml-auto" onClick={() => setEditing(true)}>
                <Pencil className="w-4 h-4 mr-1" /> Editar
              </Button>
            )}
          </DialogTitle>
          <DialogDescription>
            Detalhes do chamado e histórico de mensagens
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {editing && (
            <div className="p-4 rounded-lg border border-primary/30 space-y-2">
              <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="Título" />
              <Textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} placeholder="Descrição" />
              <Input type="file" onChange={e => setEditFile(e.target.files?.[0] || null)} />
              <div className="flex gap-2">
                <Button size="sm" variant="glow" disabled={savingEdit} onClick={handleSaveEdit}>{savingEdit ? 'Salvando...' : 'Salvar alterações'}</Button>
                <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setEditTitle(ticket.title); setEditDescription(ticket.description || ''); }}>Cancelar</Button>
              </div>
            </div>
          )}
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

          {/* Responsável pelo atendimento */}
          {(ticket.assigned_admin_name || statusChangedBy) && (
            <div className="flex flex-col gap-1 p-2 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">
                  Responsável por: <span className="text-foreground font-medium">{ticket.assigned_admin_name || statusChangedBy}</span>
                </span>
              </div>
              <div className="text-xs text-muted-foreground pl-6 space-y-0.5">
                <div>Aberto por: <span className="text-foreground">{user?.name}</span></div>
                {ticket.assigned_admin_name && (
                  <div>Atendido por: <span className="text-foreground">{ticket.assigned_admin_name}</span></div>
                )}
                {statusChangedBy && (
                  <div>
                    Status ({statusLabels[ticket.status]}) alterado por: <span className="text-foreground">{statusChangedBy}</span>
                    {statusChangedAt && (
                      <> em {format(new Date(statusChangedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {isAdmin && (
            <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
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
              <span className="text-sm text-muted-foreground">Categoria:</span>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-44 bg-secondary/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TICKET_CATEGORY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
              {hasStatusChanged && (
                <Button variant="glow" size="sm" onClick={handleSaveStatus} disabled={isSavingStatus}>
                  <Save className="w-4 h-4 mr-1" />
                  {isSavingStatus ? 'Salvando...' : 'Salvar'}
                </Button>
              )}
            </div>
            {selectedStatus === 'resolved' && ticket.status !== 'resolved' && (
              <Textarea value={resolutionNote} onChange={e => setResolutionNote(e.target.value)} placeholder="Detalhes da resolução (opcional)" className="bg-secondary/50" />
            )}
            </div>
          )}
          {(ticket as any).resolution_note && (
            <div className="p-3 rounded-lg bg-success/10 border border-success/30 text-sm">
              <p className="text-xs text-muted-foreground mb-1">Detalhes da resolução</p>
              <p className="text-foreground whitespace-pre-wrap">{(ticket as any).resolution_note}</p>
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

          {history.length > 0 && (
            <details className="rounded-lg border border-border p-3">
              <summary className="cursor-pointer text-sm font-medium text-foreground flex items-center gap-2"><History className="w-4 h-4 text-primary" /> Histórico de alterações ({history.length})</summary>
              <ul className="mt-2 space-y-1 max-h-40 overflow-y-auto text-xs text-muted-foreground">
                {history.map(h => (
                  <li key={h.id}>
                    <span className="text-foreground">{h.action}</span>
                    {(h.old_value || h.new_value) && h.action !== 'Descrição editada' && <>: {h.old_value || '—'} → {h.new_value || '—'}</>}
                    {' '}• {h.actor_name || 'Usuário'} • {format(new Date(h.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </li>
                ))}
              </ul>
            </details>
          )}

          <div className="border-t border-border pt-4">
            <p className="text-sm font-medium text-foreground mb-3">Chat</p>
            <div className="relative">
              <ScrollArea ref={scrollRef} className="h-48 pr-4">
                <div className="space-y-3">
                  {ticketMessages.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhuma mensagem ainda
                    </p>
                  ) : (
                    ticketMessages.map((msg) => {
                      const msgUser = getUserById(msg.user_id);
                      const isCurrentUser = msg.user_id === currentUser?.id;
                      const isFromOwner = msg.user_id === ticket.user_id;
                      // Admin viewers see real names; regular users see "Suporte" for admin replies
                      const displayName = isFromOwner
                        ? (msgUser?.name || user?.name || 'Usuário')
                        : (isAdmin ? (msgUser?.name || 'Suporte') : 'Suporte');
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
                            {displayName} • {format(new Date(msg.created_at), 'HH:mm')}
                          </p>
                          <p className="text-sm text-foreground">{msg.content}</p>
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
              {hasNewMessages && (
                <Button
                  type="button"
                  size="sm"
                  variant="glow"
                  onClick={scrollToBottom}
                  className="absolute bottom-2 left-1/2 -translate-x-1/2 h-7 px-3 text-xs shadow-lg animate-in fade-in slide-in-from-bottom-2"
                >
                  <ArrowDown className="w-3 h-3 mr-1" />
                  Novas mensagens
                </Button>
              )}
            </div>

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
