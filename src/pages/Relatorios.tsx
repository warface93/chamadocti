import { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Star, ArrowLeft, User, Building2, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const COLORS = ['hsl(190, 95%, 50%)', 'hsl(142, 76%, 36%)', 'hsl(38, 92%, 50%)', 'hsl(0, 84%, 60%)', 'hsl(217, 33%, 50%)'];

type DrilldownType = 'sector' | 'user' | 'category' | null;

const Relatorios = () => {
  const { isAdmin } = useAuth();
  const { tickets, users, sectors } = useData();
  const [drilldownType, setDrilldownType] = useState<DrilldownType>(null);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  if (!isAdmin) {
    return <Navigate to="/meus-chamados" replace />;
  }

  // Calcular dados para gráficos
  const ratedTickets = tickets.filter(t => t.rating && t.rating > 0);
  const averageRating = ratedTickets.length > 0 
    ? ratedTickets.reduce((acc, t) => acc + (t.rating || 0), 0) / ratedTickets.length 
    : 0;

  // Distribuição de avaliações
  const ratingDistribution = [1, 2, 3, 4, 5].map(rating => ({
    rating: `${rating} ★`,
    count: ratedTickets.filter(t => t.rating === rating).length,
  }));

  // Chamados por status
  const statusData = [
    { name: 'Abertos', value: tickets.filter(t => t.status === 'open').length },
    { name: 'Em Andamento', value: tickets.filter(t => t.status === 'in_progress').length },
    { name: 'Resolvidos', value: tickets.filter(t => t.status === 'resolved').length },
    { name: 'Críticos', value: tickets.filter(t => t.status === 'critical').length },
    { name: 'Pendentes', value: tickets.filter(t => t.status === 'pending').length },
  ].filter(d => d.value > 0);

  // Chamados por categoria
  const categoryData = [
    { name: 'Software', key: 'software', value: tickets.filter(t => t.category === 'software').length },
    { name: 'Hardware', key: 'hardware', value: tickets.filter(t => t.category === 'hardware').length },
    { name: 'Rede', key: 'network', value: tickets.filter(t => t.category === 'network').length },
    { name: 'Outro', key: 'other', value: tickets.filter(t => t.category === 'other').length },
  ].filter(d => d.value > 0);

  // Avaliações por setor
  const sectorRatings = sectors.map(sector => {
    const sectorUsers = users.filter(u => u.sector_id === sector.id);
    const sectorUserIds = sectorUsers.map(u => u.id);
    const sectorTickets = ratedTickets.filter(t => sectorUserIds.includes(t.user_id));
    const avgRating = sectorTickets.length > 0
      ? sectorTickets.reduce((acc, t) => acc + (t.rating || 0), 0) / sectorTickets.length
      : 0;
    return {
      id: sector.id,
      name: sector.name,
      rating: Number(avgRating.toFixed(1)),
      count: sectorTickets.length,
    };
  }).filter(s => s.count > 0);

  // Avaliações por usuário
  const userRatings = users.map(user => {
    const userTickets = ratedTickets.filter(t => t.user_id === user.id);
    const avgRating = userTickets.length > 0
      ? userTickets.reduce((acc, t) => acc + (t.rating || 0), 0) / userTickets.length
      : 0;
    return {
      id: user.id,
      name: user.name,
      rating: Number(avgRating.toFixed(1)),
      count: userTickets.length,
    };
  }).filter(u => u.count > 0);

  // Get drilldown data
  const getDrilldownTickets = () => {
    if (!selectedItem) return [];
    
    switch (drilldownType) {
      case 'sector': {
        const sectorUsers = users.filter(u => u.sector_id === selectedItem);
        const sectorUserIds = sectorUsers.map(u => u.id);
        return ratedTickets.filter(t => sectorUserIds.includes(t.user_id));
      }
      case 'user':
        return ratedTickets.filter(t => t.user_id === selectedItem);
      case 'category':
        return ratedTickets.filter(t => t.category === selectedItem);
      default:
        return [];
    }
  };

  const getDrilldownTitle = () => {
    if (!selectedItem) return '';
    
    switch (drilldownType) {
      case 'sector':
        return `Avaliações - ${sectors.find(s => s.id === selectedItem)?.name || 'Setor'}`;
      case 'user':
        return `Avaliações - ${users.find(u => u.id === selectedItem)?.name || 'Usuário'}`;
      case 'category': {
        const categoryNames: Record<string, string> = {
          software: 'Software',
          hardware: 'Hardware',
          network: 'Rede',
          other: 'Outro'
        };
        return `Avaliações - ${categoryNames[selectedItem] || 'Categoria'}`;
      }
      default:
        return '';
    }
  };

  const handleDrilldown = (type: DrilldownType, id: string) => {
    setDrilldownType(type);
    setSelectedItem(id);
    setIsDialogOpen(true);
  };

  const drilldownTickets = getDrilldownTickets();
  const getUserById = (id: string) => users.find(u => u.id === id);

  return (
    <div className="space-y-6">
      {/* Média geral */}
      <div className="bg-card rounded-xl p-6 border border-border glow-card">
        <h2 className="text-lg font-semibold text-foreground mb-4">Média Geral de Avaliações</h2>
        <div className="flex items-center gap-4">
          <span className="text-5xl font-bold gradient-text">{averageRating.toFixed(1)}</span>
          <div className="flex">
            {[1, 2, 3, 4, 5].map((value) => (
              <Star
                key={value}
                className={cn(
                  'w-8 h-8',
                  averageRating >= value
                    ? 'fill-warning text-warning'
                    : 'text-muted-foreground'
                )}
              />
            ))}
          </div>
          <span className="text-muted-foreground ml-4">
            ({ratedTickets.length} avaliações)
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribuição de avaliações */}
        <div className="bg-card rounded-xl p-6 border border-border glow-card">
          <h2 className="text-lg font-semibold text-foreground mb-4">Distribuição de Avaliações</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={ratingDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(217, 33%, 20%)" />
              <XAxis dataKey="rating" stroke="hsl(215, 20%, 55%)" />
              <YAxis stroke="hsl(215, 20%, 55%)" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(222, 47%, 8%)', 
                  border: '1px solid hsl(217, 33%, 20%)',
                  borderRadius: '8px'
                }} 
              />
              <Bar dataKey="count" fill="hsl(190, 95%, 50%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Chamados por status */}
        <div className="bg-card rounded-xl p-6 border border-border glow-card">
          <h2 className="text-lg font-semibold text-foreground mb-4">Chamados por Status</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
                isAnimationActive={false}
              >
                {statusData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Chamados por categoria - CLICÁVEL */}
        <div className="bg-card rounded-xl p-6 border border-border glow-card">
          <div className="flex items-center gap-2 mb-4">
            <Tag className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Avaliações por Categoria</h2>
            <span className="text-xs text-muted-foreground">(clique para detalhes)</span>
          </div>
          <div className="space-y-3">
            {categoryData.map((category) => {
              const categoryTickets = ratedTickets.filter(t => t.category === category.key);
              const avgRating = categoryTickets.length > 0
                ? categoryTickets.reduce((acc, t) => acc + (t.rating || 0), 0) / categoryTickets.length
                : 0;
              return (
                <div
                  key={category.key}
                  onClick={() => handleDrilldown('category', category.key)}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 cursor-pointer transition-colors"
                >
                  <span className="text-foreground font-medium">{category.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-sm">
                      {categoryTickets.length} avaliações
                    </span>
                    <div className="flex items-center gap-1">
                      <Star className={cn(
                        'w-4 h-4',
                        avgRating > 0 ? 'fill-warning text-warning' : 'text-muted-foreground'
                      )} />
                      <span className="text-foreground">{avgRating.toFixed(1)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Avaliações por setor - CLICÁVEL */}
        <div className="bg-card rounded-xl p-6 border border-border glow-card">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Avaliações por Setor</h2>
            <span className="text-xs text-muted-foreground">(clique para detalhes)</span>
          </div>
          {sectorRatings.length > 0 ? (
            <div className="space-y-3">
              {sectorRatings.map((sector) => (
                <div
                  key={sector.id}
                  onClick={() => handleDrilldown('sector', sector.id)}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 cursor-pointer transition-colors"
                >
                  <span className="text-foreground font-medium">{sector.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-sm">
                      {sector.count} avaliações
                    </span>
                    <div className="flex items-center gap-1">
                      <Star className={cn(
                        'w-4 h-4',
                        sector.rating > 0 ? 'fill-warning text-warning' : 'text-muted-foreground'
                      )} />
                      <span className="text-foreground">{sector.rating}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
              Nenhuma avaliação por setor ainda
            </div>
          )}
        </div>

        {/* Avaliações por usuário - CLICÁVEL */}
        <div className="bg-card rounded-xl p-6 border border-border glow-card lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Avaliações por Usuário</h2>
            <span className="text-xs text-muted-foreground">(clique para detalhes)</span>
          </div>
          {userRatings.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {userRatings.map((userRating) => (
                <div
                  key={userRating.id}
                  onClick={() => handleDrilldown('user', userRating.id)}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 cursor-pointer transition-colors"
                >
                  <span className="text-foreground font-medium truncate">{userRating.name}</span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-muted-foreground text-sm">
                      {userRating.count}
                    </span>
                    <div className="flex items-center gap-1">
                      <Star className={cn(
                        'w-4 h-4',
                        userRating.rating > 0 ? 'fill-warning text-warning' : 'text-muted-foreground'
                      )} />
                      <span className="text-foreground">{userRating.rating}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-[100px] flex items-center justify-center text-muted-foreground">
              Nenhuma avaliação por usuário ainda
            </div>
          )}
        </div>
      </div>

      {/* Drilldown Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsDialogOpen(false)}
                className="h-8 w-8"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              {getDrilldownTitle()}
            </DialogTitle>
            <DialogDescription>
              Lista detalhada de chamados avaliados
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[60vh]">
            {drilldownTickets.length > 0 ? (
              <div className="space-y-3 pr-4">
                {drilldownTickets.map((ticket) => {
                  const ticketUser = getUserById(ticket.user_id);
                  return (
                    <div key={ticket.id} className="p-4 rounded-lg bg-secondary/30 border border-border">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-foreground">{ticket.title}</h4>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((value) => (
                            <Star
                              key={value}
                              className={cn(
                                'w-4 h-4',
                                (ticket.rating || 0) >= value
                                  ? 'fill-warning text-warning'
                                  : 'text-muted-foreground'
                              )}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                        {ticket.description}
                      </p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Por: {ticketUser?.name || 'Usuário'}</span>
                        <span>{format(new Date(ticket.created_at), "dd/MM/yyyy", { locale: ptBR })}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma avaliação encontrada
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Relatorios;
