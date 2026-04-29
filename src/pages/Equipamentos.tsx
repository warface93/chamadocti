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
import { Plus, Edit, Trash2, Search, Monitor, ChevronLeft, ChevronRight } from 'lucide-react';
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
  created_at: string;
}

const ITEMS_PER_PAGE = 15;

const Equipamentos = () => {
  const { isAdmin } = useAuth();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Equipment | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [formData, setFormData] = useState({ type: '', brand: '', tombamento: '' });

  useEffect(() => {
    fetchEquipment();
    const channel = supabase
      .channel('equipment-inventory-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'equipment_inventory' }, () => {
        fetchEquipment();
      })
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, []);

  const fetchEquipment = async () => {
    const { data, error } = await supabase
      .from('equipment_inventory')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setEquipment(data as Equipment[]);
    setLoading(false);
  };

  if (!isAdmin) return <Navigate to="/meus-chamados" replace />;

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
    if (editingItem) {
      const { error } = await supabase
        .from('equipment_inventory')
        .update({ type: formData.type.trim(), brand: formData.brand.trim(), tombamento: formData.tombamento.trim() || null })
        .eq('id', editingItem.id);
      if (error) { toast.error('Erro ao atualizar'); return; }
      toast.success('Equipamento atualizado!');
    } else {
      const { error } = await supabase
        .from('equipment_inventory')
        .insert({ type: formData.type.trim(), brand: formData.brand.trim(), tombamento: formData.tombamento.trim() || null });
      if (error) { toast.error('Erro ao cadastrar'); return; }
      toast.success('Equipamento cadastrado!');
    }
    resetForm();
    fetchEquipment();
  };

  const resetForm = () => {
    setFormData({ type: '', brand: '', tombamento: '' });
    setEditingItem(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (item: Equipment) => {
    setEditingItem(item);
    setFormData({ type: item.type, brand: item.brand, tombamento: item.tombamento || '' });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este equipamento?')) return;
    const { error } = await supabase.from('equipment_inventory').delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir'); return; }
    toast.success('Equipamento excluído!');
    fetchEquipment();
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
              <DialogDescription>Preencha as informações do equipamento.</DialogDescription>
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

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="grid grid-cols-5 gap-4 p-4 border-b border-border text-sm font-semibold text-muted-foreground">
          <span>Tipo</span>
          <span>Marca</span>
          <span>Tombamento</span>
          <span>Status</span>
          <span className="text-right">Ações</span>
        </div>
        {paginated.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">Nenhum equipamento encontrado</div>
        ) : (
          paginated.map(item => (
            <div key={item.id} className={cn(
              "grid grid-cols-5 gap-4 p-4 border-b border-border/50 hover:bg-secondary/20 transition-colors items-center",
              item.status === 'em_emprestimo' && 'opacity-60'
            )}>
              <span className="text-foreground font-medium flex items-center gap-2">
                <Monitor className="w-4 h-4 text-primary" />
                {item.type}
              </span>
              <span className="text-foreground">{item.brand}</span>
              <span className="text-muted-foreground">{item.tombamento || '—'}</span>
              <span>
                <Badge variant={item.status === 'disponivel' ? 'default' : 'secondary'} className={cn(
                  item.status === 'disponivel' ? 'bg-success text-success-foreground' : 'bg-warning text-warning-foreground'
                )}>
                  {item.status === 'disponivel' ? 'Disponível' : 'Em Empréstimo'}
                </Badge>
              </span>
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="outline" onClick={() => handleEdit(item)}>
                  <Edit className="w-3 h-3" />
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleDelete(item.id)} disabled={item.status === 'em_emprestimo'}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))
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
    </div>
  );
};

export default Equipamentos;
