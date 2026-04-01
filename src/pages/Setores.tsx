import { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Sector } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Dialog as UsersDialog, DialogContent as UsersDialogContent, DialogHeader as UsersDialogHeader, DialogTitle as UsersDialogTitle, DialogDescription as UsersDialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Plus, Edit, Trash2, Power, Monitor, Users, DollarSign, 
  ShoppingBag, Wrench, Headphones, Building, FileText, 
  Mail, Phone, Package, Settings, Search,
  Flame, Zap, Truck, Crown, Landmark, Droplets, Scale
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const iconOptions = [
  { name: 'Monitor', icon: Monitor },
  { name: 'Users', icon: Users },
  { name: 'DollarSign', icon: DollarSign },
  { name: 'ShoppingBag', icon: ShoppingBag },
  { name: 'Wrench', icon: Wrench },
  { name: 'Headphones', icon: Headphones },
  { name: 'Building', icon: Building },
  { name: 'FileText', icon: FileText },
  { name: 'Mail', icon: Mail },
  { name: 'Phone', icon: Phone },
  { name: 'Package', icon: Package },
  { name: 'Settings', icon: Settings },
  { name: 'Flame', icon: Flame },
  { name: 'Zap', icon: Zap },
  { name: 'Truck', icon: Truck },
  { name: 'Crown', icon: Crown },
  { name: 'Landmark', icon: Landmark },
  { name: 'Droplets', icon: Droplets },
  { name: 'Scale', icon: Scale },
];

const getIcon = (iconName: string) => {
  const found = iconOptions.find(i => i.name === iconName);
  return found ? found.icon : Monitor;
};

const SetoresSkeleton = () => (
  <div className="space-y-6">
    <div className="flex justify-between items-center">
      <Skeleton className="h-7 w-48" />
      <Skeleton className="h-10 w-36" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-40 rounded-xl" />
      ))}
    </div>
  </div>
);

const Setores = () => {
  const { isAdmin } = useAuth();
  const { sectors, users, loading, addSector, updateSector, deleteSector } = useData();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSector, setEditingSector] = useState<Sector | null>(null);
  const [selectedSector, setSelectedSector] = useState<Sector | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    icon: 'Monitor',
  });

  if (!isAdmin) {
    return <Navigate to="/meus-chamados" replace />;
  }

  if (loading) {
    return <SetoresSkeleton />;
  }

  const filteredSectors = sectors.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const duplicate = sectors.find(
      s => s.name.toLowerCase() === formData.name.trim().toLowerCase() &&
        s.id !== editingSector?.id
    );
    if (duplicate) {
      toast.error('Já existe um setor com este nome!');
      return;
    }
    
    if (editingSector) {
      updateSector(editingSector.id, { name: formData.name.trim(), icon: formData.icon });
      toast.success('Setor atualizado!');
    } else {
      addSector({ name: formData.name.trim(), icon: formData.icon, active: true });
      toast.success('Setor criado!');
    }
    resetForm();
  };

  const resetForm = () => {
    setFormData({ name: '', icon: 'Monitor' });
    setEditingSector(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (sector: Sector) => {
    setEditingSector(sector);
    setFormData({ name: sector.name, icon: sector.icon });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este setor?')) {
      deleteSector(id);
      toast.success('Setor excluído!');
    }
  };

  const handleToggleActive = (sector: Sector) => {
    updateSector(sector.id, { active: !sector.active });
    toast.success(sector.active ? 'Setor desativado!' : 'Setor ativado!');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-lg font-semibold text-foreground">Gerenciar Setores</h2>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar setor..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 bg-secondary/50" />
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="glow" onClick={() => resetForm()}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Setor
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-foreground">
                  {editingSector ? 'Editar Setor' : 'Novo Setor'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome do Setor</Label>
                  <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="bg-secondary/50" required />
                </div>
                <div className="space-y-2">
                  <Label>Ícone</Label>
                  <div className="grid grid-cols-6 gap-2">
                    {iconOptions.map((option) => {
                      const Icon = option.icon;
                      return (
                        <button
                          key={option.name}
                          type="button"
                          onClick={() => setFormData({ ...formData, icon: option.name })}
                          className={cn(
                            'p-3 rounded-lg border transition-all',
                            formData.icon === option.name
                              ? 'bg-primary/20 border-primary text-primary'
                              : 'bg-secondary/50 border-border text-muted-foreground hover:bg-secondary'
                          )}
                        >
                          <Icon className="w-5 h-5 mx-auto" />
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>
                  <Button type="submit" variant="glow">{editingSector ? 'Salvar' : 'Criar'}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredSectors.map((sector) => {
          const Icon = getIcon(sector.icon);
          return (
            <div key={sector.id} className={cn('bg-card rounded-xl p-5 border glow-card card-hover-effect', !sector.active && 'opacity-60')}>
              <div className="flex items-center gap-4 mb-4 cursor-pointer" onClick={() => setSelectedSector(sector)}>
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Icon className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{sector.name}</h3>
                  <p className={cn('text-sm', sector.active ? 'text-success' : 'text-critical')}>
                    {sector.active ? 'Ativo' : 'Inativo'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {users.filter(u => u.sector_id === sector.id).length} usuários
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => handleEdit(sector)} className="flex-1">
                  <Edit className="w-3 h-3 mr-1" /> Editar
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleToggleActive(sector)}>
                  <Power className="w-3 h-3" />
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleDelete(sector.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredSectors.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">Nenhum setor encontrado</div>
      )}

      <UsersDialog open={!!selectedSector} onOpenChange={() => setSelectedSector(null)}>
        <UsersDialogContent className="bg-card border-border max-w-md">
          <UsersDialogHeader>
            <UsersDialogTitle className="text-foreground">Usuários - {selectedSector?.name}</UsersDialogTitle>
            <UsersDialogDescription>Lista de usuários cadastrados neste setor</UsersDialogDescription>
          </UsersDialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {(() => {
              const sectorUsers = users.filter(u => u.sector_id === selectedSector?.id);
              return sectorUsers.length > 0 ? (
                <div className="space-y-2 pr-4">
                  {sectorUsers.map(u => (
                    <div key={u.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                      <div>
                        <p className="text-sm font-medium text-foreground">{u.name}</p>
                        <p className="text-xs text-muted-foreground">@{u.username}</p>
                      </div>
                      <span className={cn('text-xs px-2 py-1 rounded-full', u.active ? 'bg-success/10 text-success' : 'bg-critical/10 text-critical')}>
                        {u.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum usuário neste setor</p>
              );
            })()}
          </ScrollArea>
        </UsersDialogContent>
      </UsersDialog>
    </div>
  );
};

export default Setores;
