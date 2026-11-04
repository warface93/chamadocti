import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Package, X } from 'lucide-react';
import { isValidQuantity } from '@/lib/equipmentQuantity';

interface LoanItem {
  id: string; description: string; quantity: number; tombamento: string | null;
  equipment_id: string | null; returned_at: string | null; loaned_at: string;
  equipment_inventory?: { type: string; brand: string; tombamento: string | null } | null;
}
interface ReturnRequest {
  id: string; item_id: string; quantity: number; reason: string; status: string;
  requested_by_name: string | null; admin_name: string | null; admin_note: string | null; created_at: string;
}

const statusLabel: Record<string, string> = { pendente: 'Devolução pendente', aprovada: 'Devolução confirmada', recusada: 'Devolução recusada' };

/** Borrowed equipment of a meeting, with user return requests and admin confirmation. */
const MeetingLoans = ({ meetingId, mode, onChanged }: { meetingId: string; mode: 'user' | 'admin'; onChanged?: () => void }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<LoanItem[]>([]);
  const [requests, setRequests] = useState<ReturnRequest[]>([]);
  const [requestFor, setRequestFor] = useState<LoanItem | null>(null);
  const [reason, setReason] = useState('');
  const [qty, setQty] = useState('1');
  const [refuseFor, setRefuseFor] = useState<string | null>(null);
  const [refuseNote, setRefuseNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [{ data: it }, { data: rq }] = await Promise.all([
      supabase.from('meeting_admin_items').select('*, equipment_inventory(type, brand, tombamento)').eq('meeting_id', meetingId).order('loaned_at'),
      supabase.from('return_requests').select('*').eq('meeting_id', meetingId).order('created_at', { ascending: false }),
    ]);
    setItems((it as any) || []);
    setRequests((rq as any) || []);
  }, [meetingId]);

  useEffect(() => {
    load();
    const ch = supabase.channel(`loans-${meetingId}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'return_requests', filter: `meeting_id=eq.${meetingId}` }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meeting_admin_items', filter: `meeting_id=eq.${meetingId}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [meetingId, load]);

  // Each loan row is one batch; partial returns split rows, so returned rows count as returned units.
  const groups = new Map<string, { name: string; brand: string; tomb: string | null; loaned: number; returned: number; open: LoanItem[] }>();
  items.forEach(i => {
    const key = i.equipment_id || i.description;
    const g = groups.get(key) || { name: i.equipment_inventory?.type || i.description, brand: i.equipment_inventory?.brand || '—', tomb: i.tombamento || i.equipment_inventory?.tombamento || null, loaned: 0, returned: 0, open: [] };
    g.loaned += i.quantity;
    if (i.returned_at) g.returned += i.quantity; else g.open.push(i);
    groups.set(key, g);
  });
  const pendingFor = (itemId: string) => requests.filter(r => r.item_id === itemId && r.status === 'pendente').reduce((s, r) => s + r.quantity, 0);

  const submitRequest = async () => {
    if (!requestFor || !user) return;
    const max = requestFor.quantity - pendingFor(requestFor.id);
    if (!reason.trim()) { toast({ title: 'Informe o motivo da devolução.', variant: 'destructive' }); return; }
    if (!isValidQuantity(qty, max)) { toast({ title: `Quantidade inválida (máximo ${max}).`, variant: 'destructive' }); return; }
    setBusy(true);
    const { error } = await supabase.from('return_requests').insert({ item_id: requestFor.id, meeting_id: meetingId, equipment_id: requestFor.equipment_id, requested_by: user.id, requested_by_name: user.name, quantity: Number(qty), reason: reason.trim() });
    setBusy(false);
    if (error) { toast({ title: 'Erro ao solicitar devolução', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Devolução solicitada. Aguardando confirmação do administrador.' });
    setRequestFor(null); setReason(''); setQty('1');
  };

  const confirm = async (r: ReturnRequest) => {
    setBusy(true);
    const { error } = await supabase.rpc('return_loan_item', { _item_id: r.item_id, _quantity: r.quantity });
    if (!error) await supabase.from('return_requests').update({ status: 'aprovada', admin_id: user?.id, admin_name: user?.name, resolved_at: new Date().toISOString() }).eq('id', r.id);
    setBusy(false);
    if (error) { toast({ title: 'Erro ao confirmar devolução', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Recebimento confirmado. Estoque atualizado.' });
    load(); onChanged?.();
  };

  const refuse = async (id: string) => {
    if (!refuseNote.trim()) { toast({ title: 'Informe o motivo da recusa.', variant: 'destructive' }); return; }
    setBusy(true);
    const { error } = await supabase.from('return_requests').update({ status: 'recusada', admin_id: user?.id, admin_name: user?.name, admin_note: refuseNote.trim(), resolved_at: new Date().toISOString() }).eq('id', id);
    setBusy(false);
    if (error) { toast({ title: 'Erro ao recusar', description: error.message, variant: 'destructive' }); return; }
    setRefuseFor(null); setRefuseNote('');
  };

  return (
    <div className="space-y-3 border-t border-border pt-4">
      <h4 className="text-sm font-semibold text-foreground flex items-center gap-2"><Package className="w-4 h-4 text-primary" /> Equipamentos emprestados</h4>
      {groups.size === 0 && <p className="text-sm text-muted-foreground">Nenhum equipamento emprestado.</p>}
      {[...groups.values()].map((g, idx) => {
        const pending = g.loaned - g.returned;
        return (
          <div key={idx} className="rounded-lg border border-border p-3 space-y-2 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium text-foreground">{g.name} — {g.brand}{g.tomb ? ` (Tomb. ${g.tomb})` : ''}</span>
              <Badge variant={pending === 0 ? 'secondary' : 'outline'}>{pending === 0 ? 'Devolvido' : g.returned > 0 ? 'Parcialmente devolvido' : 'Em Empréstimo'}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">Emprestado: {g.loaned} • Devolvido: {g.returned} • Pendente: {pending}</p>
            {g.open.map(item => {
              const reqPending = pendingFor(item.id);
              return (
                <div key={item.id} className="flex flex-wrap items-center gap-2">
                  {reqPending > 0 && <Badge variant="outline" className="text-warning border-warning/40">{reqPending} un. aguardando confirmação</Badge>}
                  {mode === 'user' && item.quantity - reqPending > 0 && (
                    <Button size="sm" variant="outline" onClick={() => { setRequestFor(item); setQty(String(item.quantity - reqPending)); }}><X className="w-3 h-3 mr-1" /> Solicitar devolução</Button>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}

      {requestFor && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
          <p className="text-sm font-medium">Solicitar devolução</p>
          <div className="space-y-1"><Label htmlFor="ret-qty" className="text-xs">Quantidade</Label><Input id="ret-qty" className="w-24" type="number" min="1" step="1" value={qty} onChange={e => setQty(e.target.value)} /></div>
          <div className="space-y-1"><Label htmlFor="ret-reason" className="text-xs">Motivo <span className="text-destructive">*</span></Label><Textarea id="ret-reason" value={reason} onChange={e => setReason(e.target.value)} placeholder="Ex: Reunião encerrada, equipamento entregue na CTI." /></div>
          <p className="text-xs text-muted-foreground">O estoque só é liberado após o administrador confirmar o recebimento.</p>
          <div className="flex gap-2"><Button size="sm" disabled={busy} onClick={submitRequest}>Enviar solicitação</Button><Button size="sm" variant="ghost" onClick={() => setRequestFor(null)}>Voltar</Button></div>
        </div>
      )}

      {requests.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">Solicitações de devolução</p>
          {requests.map(r => (
            <div key={r.id} className="rounded border border-border p-2 text-xs space-y-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>{r.quantity} un. — {r.requested_by_name || 'Usuário'} • {new Date(r.created_at).toLocaleString('pt-BR')}</span>
                <Badge variant={r.status === 'pendente' ? 'outline' : r.status === 'aprovada' ? 'secondary' : 'destructive'}>{statusLabel[r.status] || r.status}</Badge>
              </div>
              <p className="text-muted-foreground">Motivo: {r.reason}</p>
              {r.admin_name && <p className="text-muted-foreground">Analisado por {r.admin_name}{r.admin_note ? ` — ${r.admin_note}` : ''}</p>}
              {mode === 'admin' && r.status === 'pendente' && (refuseFor === r.id ? (
                <div className="space-y-1">
                  <Textarea value={refuseNote} onChange={e => setRefuseNote(e.target.value)} placeholder="Motivo da recusa" />
                  <div className="flex gap-2"><Button size="sm" variant="destructive" disabled={busy} onClick={() => refuse(r.id)}>Recusar</Button><Button size="sm" variant="ghost" onClick={() => setRefuseFor(null)}>Voltar</Button></div>
                </div>
              ) : (
                <div className="flex gap-2"><Button size="sm" disabled={busy} onClick={() => confirm(r)}>Confirmar recebimento</Button><Button size="sm" variant="outline" onClick={() => setRefuseFor(r.id)}>Recusar</Button></div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MeetingLoans;
