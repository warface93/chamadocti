import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Edit, Trash2, Search, Monitor, ChevronLeft, ChevronRight, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Equipment {
  id: string;
  type: string;
  brand: string;
  tombamento: string | null;
  active: boolean;
  status: string;
  current_meeting_id: string | null;
  total_quantity: number;
  created_at: string;
}

interface LoanInfo {
  item_id: string;
  meeting_id: string;
  quantity: number;
  loaned_at: string;
  location: string;
  meeting_date: string;
  start_time: string;
  end_time: string;
  theme: string | null;
  user_name: string;
}

const ITEMS_PER_PAGE = 15;

const Equipamentos = () => {
  const { isAdmin } = useAuth();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loanedMap, setLoanedMap] = useState<Map<string, number>>(new Map());
  const [loansByEquipment, setLoansByEquipment] = useState<Map<string, LoanInfo[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Equipment | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [formData, setFormData] = useState({ type: '', brand: '', tombamento: '', quantity: '1' });
  const [loanDetails, setLoanDetails] = useState<Equipment | null>(null);

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel('equipment-inventory-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'equipment_inventory' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meeting_admin_items' }, () => fetchData())
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, []);

  const fetchData = async () => {
    const [eqRes, loansRes, meetingsRes, profilesRes] = await Promise.all([
      supabase.from('equipment_inventory').select('*').eq('active', true).order('created_at', { ascending: false }),
      supabase.from('meeting_admin_items').select('id, meeting_id, equipment_id, quantity, loaned_at').is('returned_at', null).not('equipment_id', 'is', null),
      supabase.from('meetings').select('id, user_id, location, meeting_date, start_time, end_time, theme'),
      supabase.rpc('get_meeting_user_names'),
    ]);

    if (!eqRes.error && eqRes.data) setEquipment(eqRes.data as Equipment[]);

    const meetingMap = new Map((meetingsRes.data || []).map(m => [m.id, m]));
    const nameMap = new Map(((profilesRes.data as any[]) || []).map(p => [p.user_id, p.name]));

    const loaned = new Map<string, number>();
    const byEquipment = new Map<string, LoanInfo[]>();
    (loansRes.data || []).forEach((item: any) => {
      const eqId = item.equipment_id as string;
      loaned.set(eqId, (loaned.get(eqId) || 0) + item.quantity);
      const meeting = meetingMap.get(item.meeting_id);
      const arr = byEquipment.get(eqId) || [];
      arr.push({
        item_id: item.id,
        meeting_id: item.meeting_id,
        quantity: item.quantity,
        loaned_at: item.loaned_at,
        location: meeting?.location || '—',
        meeting_date: meeting?.meeting_date || '',
        start_time: meeting?.start_time || '',
        end_time: meeting?.end_time || '',
        theme: meeting?.theme || null,
        user_name: meeting ? (nameMap.get(meeting.user_id) || 'Desconhecido') : '—',
      });
      byEquipment.set(eqId, arr);
    });
    setLoanedMap(loaned);
    setLoansByEquipment(byEquipment);
    setLoading(false);
  };

  if (!isAdmin) return <Navigate to="/meus-chamados" replace />;

  const getLoaned = (id: string) => loanedMap.get(id) || 0;
  const getAvailable = (item: Equipment) => item.total_quantity - getLoaned(item.id);

  const getStatus = (item: Equipment) => {
    const loaned = getLoaned(item.id);
    if (loaned === 0) return 'disponivel';
    if (loaned >= item.total_quantity) return 'em_emprestimo';
    return 'parcial';
  };

  const STATUS_LABEL: Record<string, string> = {
    disponivel: 'Disponível',
    em_emprestimo: 'Em Empréstimo',
    parcial: 'Parcialmente emprestado',
  };

  const STATUS_CLASS: Record<string, string> = {
    disponivel: 'bg-success text-success-foreground',
    em_emprestimo: 'bg-warning text-warning-foreground',
    parcial: 'bg-primary text-primary-foreground',
  };

  const filtered = equipment.filter(e =>
    e.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.tombamento?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const type = formData.type.trim();
    const brand = formData.brand.trim();
    const tombamento = formData.tombamento.trim() || null;
    const quantity = parseInt(formData.quantity) || 1;

    if (quantity < 1) { toast.error('Quantidade inválida'); return; }
    if (tombamento && quantity !== 1) { toast.error('Equipamentos com tombamento devem ter quantidade 1'); return; }

    if (editingItem) {
      const { error } = await supabase
        .from('equipment_inventory')
        .update({ type, brand, tombamento, total_quantity: quantity } as any)
        .eq('id', editingItem.id);
      if (error) { toast.error(error.message || 'Erro ao atualizar'); return; }
      toast.success('Equipamento atualizado!');
    } else if (!tombamento) {
      // Untagged: merge into existing group with same type+brand
      const existing = equipment.find(eq =>
        !eq.tombamento &&
        eq.type.trim().toLowerCase() === type.toLowerCase() &&
        eq.brand.trim().toLowerCase() === brand.toLowerCase()
      );
      if (existing) {
        const { error } = await supabase
          .from('equipment_inventory')
          .update({ total_quantity: existing.total_quantity + quantity } as any)
          .eq('id', existing.id);
        if (error) { toast.error(error.message || 'Erro ao adicionar unidades'); return; }
        toast.success(`${quantity} unidade(s) adicionada(s) ao item existente!`);
      } else {
        const { error } = await supabase
          .from('equipment_inventory')
          .insert({ type, brand, tombamento, total_quantity: quantity } as any);
        if (error) { toast.error(error.message || 'Erro ao cadastrar'); return; }
        toast.success('Equipamento cadastrado!');
      }
    } else {
      const { error } = await supabase
        .from('equipment_inventory')
        .insert({ type, brand, tombamento, total_quantity: 1 } as any);
      if (error) { toast.error(error.message || 'Erro ao cadastrar'); return; }
      toast.success('Equipamento cadastrado!');
    }
    resetForm();
    fetchData();
  };

  const resetForm = () => {
    setFormData({ type: '', brand: '', tombamento: '', quantity: '1' });
    setEditingItem(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (item: Equipment) => {
    setEditingItem(item);
    setFormData({ type: item.type, brand: item.brand, tombamento: item.tombamento || '', quantity: String(item.total_quantity) });
    setIsDialogOpen(true);
  };

  const handleDelete = async (item: Equipment) => {
    if (getLoaned(item.id) > 0) { toast.error('Não é possível excluir: há unidades emprestadas deste equipamento.'); return; }
    if (!confirm('Tem certeza que deseja excluir este equipamento?')) return;
    const { error } = await supabase.from('equipment_inventory').delete().eq('id', item.id);
    if (error) { toast.error(error.message || 'Erro ao excluir'); return; }
    toast.success('Equipamento excluído!');
    fetchData();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-10 w-44" />
        </div>
        <Skeleton className="h-10 max-w-sm" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-lg font-semibold text-foreground">Gerenciar Equipamentos</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="glow" onClick={() => resetForm()}>
              <Plus className="w-4 h-4 mr-2" /> Novo Equipamento
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Editar Equipamento' : 'Novo Equipamento'}</DialogTitle>
              <DialogDescription>
                {editingItem
                  ? 'Atualize as informações do equipamento.'
                  : 'Itens sem tombamento com mesmo tipo e marca somam unidades ao item existente.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo do Equipamento</Label>
                <Input value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} placeholder="Ex: Notebook, Webcam, Projetor" className="bg-secondary/50" required />
              </div>
              <div className="space-y-2">
                <Label>Marca</Label>
                <Input value={formData.brand} onChange={(e) => setFormData({ ...formData, brand: e.target.value })} placeholder="Ex: Dell, Logitech, Epson" className="bg-secondary/50" required />
              </div>
              <div className="space-y-2">
                <Label>Tombamento <span className="text-muted-foreground text-xs">(opcional)</span></Label>
                <Input value={formData.tombamento} onChange={(e) => setFormData({ ...formData, tombamento: e.target.value })} placeholder="Número do tombamento" className="bg-secondary/50" />
              </div>
              <div className="space-y-2">
                <Label>Quantidade</Label>
                <Input
                  type="number" min="1" value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  disabled={!!formData.tombamento.trim()}
                  className="bg-secondary/50" required
                />
                {formData.tombamento.trim() && (
                  <p className="text-xs text-muted-foreground">Equipamentos com tombamento têm quantidade fixa de 1.</p>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>
                <Button type="submit" variant="glow">{editingItem ? 'Salvar' : 'Cadastrar'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar equipamento..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} className="pl-10 bg-secondary/50" />
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden overflow-x-auto">
        <div className="grid grid-cols-6 gap-4 p-4 border-b border-border text-sm font-semibold text-muted-foreground min-w-[720px]">
          <span>Tipo</span>
          <span>Marca</span>
          <span>Tombamento</span>
          <span>Quantidade</span>
          <span>Status</span>
          <span className="text-right">Ações</span>
        </div>
        {paginated.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">Nenhum equipamento encontrado</div>
        ) : (
          paginated.map(item => {
            const loaned = getLoaned(item.id);
            const status = getStatus(item);
            return (
              <div
                key={item.id}
                onClick={() => loaned > 0 && setLoanDetails(item)}
                className={cn(
                  "grid grid-cols-6 gap-4 p-4 border-b border-border/50 hover:bg-secondary/20 transition-colors items-center min-w-[720px]",
                  loaned > 0 && 'cursor-pointer'
                )}
              >
                <span className="text-foreground font-medium flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-primary" />
                  {item.type}
                </span>
                <span className="text-foreground">{item.brand}</span>
                <span className="text-muted-foreground">{item.tombamento || '—'}</span>
                <span className="text-sm text-muted-foreground">
                  <span className="text-foreground font-medium">{getAvailable(item)}</span> disp. / {loaned} empr. / {item.total_quantity} total
                </span>
                <span>
                  <Badge variant="secondary" className={STATUS_CLASS[status]}>
                    {STATUS_LABEL[status]}
                  </Badge>
                </span>
                <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                  <Button size="sm" variant="outline" onClick={() => handleEdit(item)}>
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(item)} disabled={loaned > 0}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button variant="outline" size="sm" disabled={safePage <= 1} onClick={() => setCurrentPage(safePage - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <Button key={page} variant={page === safePage ? 'default' : 'outline'} size="sm" className="w-8 h-8 p-0" onClick={() => setCurrentPage(page)}>
              {page}
            </Button>
          ))}
          <Button variant="outline" size="sm" disabled={safePage >= totalPages} onClick={() => setCurrentPage(safePage + 1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground ml-2">{filtered.length} equipamento(s)</span>
        </div>
      )}

      <Dialog open={!!loanDetails} onOpenChange={(o) => !o && setLoanDetails(null)}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle>Empréstimos em Andamento</DialogTitle>
            <DialogDescription>
              {loanDetails && `${loanDetails.type} — ${loanDetails.brand}${loanDetails.tombamento ? ` (${loanDetails.tombamento})` : ''}`}
            </DialogDescription>
          </DialogHeader>
          {loanDetails && (
            <div className="space-y-3 py-2">
              {(loansByEquipment.get(loanDetails.id) || []).map(loan => (
                <div key={loan.item_id} className="p-3 rounded-lg bg-secondary/20 border border-border space-y-1 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-foreground font-medium flex items-center gap-2">
                      <Package className="w-4 h-4 text-primary" />
                      {loan.quantity} unidade(s)
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Emprestado em {new Date(loan.loaned_at).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <p><span className="text-muted-foreground">Local:</span> <span className="text-foreground font-medium">{loan.location}</span></p>
                  <p><span className="text-muted-foreground">Solicitante:</span> <span className="text-foreground font-medium">{loan.user_name}</span></p>
                  {loan.theme && <p><span className="text-muted-foreground">Tema:</span> <span className="text-foreground">{loan.theme}</span></p>}
                  {loan.meeting_date && (
                    <p><span className="text-muted-foreground">Data:</span> <span className="text-foreground">{loan.meeting_date} • {loan.start_time} - {loan.end_time}</span></p>
                  )}
                </div>
              ))}
              {(loansByEquipment.get(loanDetails.id) || []).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum empréstimo ativo.</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Equipamentos;
