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
import { Plus, Edit, Trash2, UserX, Shield, ShieldOff, User as UserIcon, Phone, KeyRound, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const ITEMS_PER_PAGE = 15;

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
    phone: '',
    sector_id: '',
    role: 'user' as UserRole,
    password: '',
  });

  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordUserId, setPasswordUserId] = useState('');
  const [passwordUserName, setPasswordUserName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const [searchUser, setSearchUser] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'user'>('all');
  const [currentPage, setCurrentPage] = useState(1);

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
          phone: formData.phone || undefined,
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
          phone: formData.phone || undefined,
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
    setFormData({ name: '', username: '', email: '', phone: '', sector_id: '', role: 'user', password: '' });
    setEditingUser(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      username: user.username,
      email: user.email || '',
      phone: user.phone || '',
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

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }
    setIsResettingPassword(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke('admin-update-password', {
        body: { user_id: passwordUserId, new_password: newPassword },
      });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);
      toast.success('Senha alterada com sucesso!');
      setPasswordDialogOpen(false);
      setNewPassword('');
    } catch (error: any) {
      toast.error('Erro ao alterar senha: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setIsResettingPassword(false);
    }
  };

  const getSectorName = (id: string) => sectors.find(s => s.id === id)?.name || 'N/A';

  const filteredUsers = users
    .filter(u => u.name.toLowerCase().includes(searchUser.toLowerCase()))
    .filter(u => roleFilter === 'all' ? true : u.role === roleFilter);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedUsers = filteredUsers.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  // Reset page when filters change
  const handleSearchChange = (value: string) => {
    setSearchUser(value);
    setCurrentPage(1);
  };
  const handleRoleFilterChange = (value: 'all' | 'admin' | 'user') => {
    setRoleFilter(value);
    setCurrentPage(1);
  };

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
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="bg-secondary/50" required />
              </div>
              <div className="space-y-2">
                <Label>Username (para login)</Label>
                <Input value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} className="bg-secondary/50" required />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="bg-secondary/50" placeholder="(00) 00000-0000" />
              </div>
              <div className="space-y-2">
                <Label>Email <span className="text-muted-foreground text-xs">(opcional)</span></Label>
                <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="bg-secondary/50" placeholder="usuario@empresa.com" />
              </div>
              <div className="space-y-2">
                <Label>Setor</Label>
                <Select value={formData.sector_id} onValueChange={(v) => setFormData({ ...formData, sector_id: v })}>
                  <SelectTrigger className="bg-secondary/50"><SelectValue placeholder="Selecione o setor" /></SelectTrigger>
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
                  <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Usuário</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {!editingUser && (
                <div className="space-y-2">
                  <Label>Senha</Label>
                  <Input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="bg-secondary/50" required={!editingUser} minLength={6} placeholder="Mínimo 6 caracteres" />
                </div>
              )}
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>
                <Button type="submit" variant="glow" disabled={isLoading}>
                  {isLoading ? 'Salvando...' : editingUser ? 'Salvar' : 'Criar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Password Reset Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Alterar Senha - {passwordUserName}</DialogTitle>
            <DialogDescription>Digite a nova senha para o usuário.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nova Senha</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" minLength={6} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPasswordDialogOpen(false)}>Cancelar</Button>
              <Button variant="glow" onClick={handleResetPassword} disabled={isResettingPassword}>
                {isResettingPassword ? 'Salvando...' : 'Salvar Senha'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Pesquisar usuário pelo nome..." value={searchUser} onChange={(e) => handleSearchChange(e.target.value)} className="pl-10 bg-secondary/50" />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          {[
            { value: 'all' as const, label: 'Todos' },
            { value: 'admin' as const, label: 'Administradores' },
            { value: 'user' as const, label: 'Usuários' },
          ].map(f => (
            <Button key={f.value} variant={roleFilter === f.value ? 'default' : 'outline'} size="sm" onClick={() => handleRoleFilterChange(f.value)}>
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {paginatedUsers.map((user) => (
          <div key={user.id} className={cn('bg-card rounded-xl p-5 border glow-card card-hover-effect', !user.active && 'opacity-60')}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={cn('w-12 h-12 rounded-full flex items-center justify-center', user.role === 'admin' ? 'bg-primary/20' : 'bg-secondary')}>
                  {user.role === 'admin' ? <Shield className="w-6 h-6 text-primary" /> : <UserIcon className="w-6 h-6 text-muted-foreground" />}
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
              {user.phone && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Telefone:</span>
                  <span className="text-foreground">{user.phone}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Função:</span>
                <span className={cn(user.role === 'admin' ? 'text-primary' : 'text-foreground')}>
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
                <Edit className="w-3 h-3 mr-1" /> Editar
              </Button>
              <Button size="sm" variant="outline" onClick={() => {
                setPasswordUserId(user.id);
                setPasswordUserName(user.name);
                setNewPassword('');
                setPasswordDialogOpen(true);
              }}>
                <KeyRound className="w-3 h-3 mr-1" /> Senha
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleToggleActive(user)}>
                <UserX className="w-3 h-3 mr-1" /> {user.active ? 'Desativar' : 'Ativar'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleToggleRole(user)}>
                {user.role === 'admin' ? <><ShieldOff className="w-3 h-3 mr-1" />Rebaixar</> : <><Shield className="w-3 h-3 mr-1" />Promover</>}
              </Button>
              <Button size="sm" variant="destructive" onClick={() => handleDelete(user.id)}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button variant="outline" size="sm" disabled={safePage <= 1} onClick={() => setCurrentPage(safePage - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <Button
              key={page}
              variant={page === safePage ? 'default' : 'outline'}
              size="sm"
              className="w-8 h-8 p-0"
              onClick={() => setCurrentPage(page)}
            >
              {page}
            </Button>
          ))}
          <Button variant="outline" size="sm" disabled={safePage >= totalPages} onClick={() => setCurrentPage(safePage + 1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground ml-2">
            {filteredUsers.length} usuário(s)
          </span>
        </div>
      )}
    </div>
  );
};

export default Usuarios;
