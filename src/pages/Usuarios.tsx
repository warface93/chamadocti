import { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { User, UserRole } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, UserX, Shield, ShieldOff, User as UserIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const Usuarios = () => {
  const { isAdmin } = useAuth();
  const { users, sectors, addUser, updateUser, deleteUser } = useData();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    sector_id: '',
    role: 'user' as UserRole,
    password: '',
  });

  if (!isAdmin) {
    return <Navigate to="/meus-chamados" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      if (editingUser) {
        await updateUser(editingUser.id, {
          name: formData.name,
          username: formData.username,
          email: formData.email || undefined,
          sector_id: formData.sector_id,
          role: formData.role,
        });
        toast.success('Usuário atualizado!');
      } else {
        if (!formData.password || formData.password.length < 6) {
          toast.error('A senha deve ter pelo menos 6 caracteres');
          setIsLoading(false);
          return;
        }
        
        await addUser({
          name: formData.name,
          username: formData.username,
          email: formData.email || undefined,
          sector_id: formData.sector_id,
          role: formData.role,
          active: true,
          password: formData.password,
        });
        toast.success('Usuário criado! Ele pode fazer login com o username e senha cadastrados.');
      }
      
      resetForm();
    } catch (error: any) {
      console.error('Error:', error);
      if (error.message?.includes('already registered')) {
        toast.error('Este email já está cadastrado no sistema');
      } else {
        toast.error('Erro ao salvar usuário: ' + (error.message || 'Erro desconhecido'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', username: '', email: '', sector_id: '', role: 'user', password: '' });
    setEditingUser(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      username: user.username,
      email: user.email || '',
      sector_id: user.sector_id,
      role: user.role,
      password: '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este usuário?')) {
      try {
        await deleteUser(id);
        toast.success('Usuário excluído!');
      } catch (error) {
        toast.error('Erro ao excluir usuário');
      }
    }
  };

  const handleToggleActive = async (user: User) => {
    try {
      await updateUser(user.id, { active: !user.active });
      toast.success(user.active ? 'Usuário desativado!' : 'Usuário ativado!');
    } catch (error) {
      toast.error('Erro ao atualizar usuário');
    }
  };

  const handleToggleRole = async (user: User) => {
    try {
      const newRole: UserRole = user.role === 'admin' ? 'user' : 'admin';
      await updateUser(user.id, { role: newRole });
      toast.success(newRole === 'admin' ? 'Usuário promovido!' : 'Usuário rebaixado!');
    } catch (error) {
      toast.error('Erro ao atualizar função');
    }
  };

  const getSectorName = (id: string) => sectors.find(s => s.id === id)?.name || 'N/A';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-foreground">Gerenciar Usuários</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="glow" onClick={() => resetForm()}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">
                {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
              </DialogTitle>
              <DialogDescription>
                {editingUser 
                  ? 'Edite as informações do usuário abaixo.'
                  : 'Preencha os dados para criar um novo usuário. O usuário poderá fazer login com o username e senha.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-secondary/50"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Username (para login)</Label>
                <Input
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="bg-secondary/50"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="bg-secondary/50"
                  placeholder="usuario@empresa.com"
                  required
                />
                <p className="text-xs text-muted-foreground">O email é usado para autenticação</p>
              </div>
              <div className="space-y-2">
                <Label>Setor</Label>
                <Select value={formData.sector_id} onValueChange={(v) => setFormData({ ...formData, sector_id: v })}>
                  <SelectTrigger className="bg-secondary/50">
                    <SelectValue placeholder="Selecione o setor" />
                  </SelectTrigger>
                  <SelectContent>
                    {sectors.filter(s => s.active).map((sector) => (
                      <SelectItem key={sector.id} value={sector.id}>{sector.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Função</Label>
                <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v as UserRole })}>
                  <SelectTrigger className="bg-secondary/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Usuário</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {!editingUser && (
                <div className="space-y-2">
                  <Label>Senha</Label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="bg-secondary/50"
                    required={!editingUser}
                    minLength={6}
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>
              )}
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button type="submit" variant="glow" disabled={isLoading}>
                  {isLoading ? 'Salvando...' : editingUser ? 'Salvar' : 'Criar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map((user) => (
          <div
            key={user.id}
            className={cn(
              'bg-card rounded-xl p-5 border glow-card card-hover-effect',
              !user.active && 'opacity-60'
            )}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  'w-12 h-12 rounded-full flex items-center justify-center',
                  user.role === 'admin' ? 'bg-primary/20' : 'bg-secondary'
                )}>
                  {user.role === 'admin' ? (
                    <Shield className="w-6 h-6 text-primary" />
                  ) : (
                    <UserIcon className="w-6 h-6 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{user.name}</h3>
                  <p className="text-sm text-muted-foreground">@{user.username}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Setor:</span>
                <span className="text-foreground">{getSectorName(user.sector_id)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Função:</span>
                <span className={cn(
                  user.role === 'admin' ? 'text-primary' : 'text-foreground'
                )}>
                  {user.role === 'admin' ? 'Administrador' : 'Usuário'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <span className={user.active ? 'text-success' : 'text-critical'}>
                  {user.active ? 'Ativo' : 'Inativo'}
                </span>
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button size="sm" variant="outline" onClick={() => handleEdit(user)}>
                <Edit className="w-3 h-3 mr-1" />
                Editar
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleToggleActive(user)}>
                <UserX className="w-3 h-3 mr-1" />
                {user.active ? 'Desativar' : 'Ativar'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleToggleRole(user)}>
                {user.role === 'admin' ? (
                  <><ShieldOff className="w-3 h-3 mr-1" />Rebaixar</>
                ) : (
                  <><Shield className="w-3 h-3 mr-1" />Promover</>
                )}
              </Button>
              <Button size="sm" variant="destructive" onClick={() => handleDelete(user.id)}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Usuarios;
