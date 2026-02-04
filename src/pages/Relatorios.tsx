import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

const COLORS = ['hsl(190, 95%, 50%)', 'hsl(142, 76%, 36%)', 'hsl(38, 92%, 50%)', 'hsl(0, 84%, 60%)', 'hsl(217, 33%, 50%)'];

const Relatorios = () => {
  const { isAdmin } = useAuth();
  const { tickets, users, sectors } = useData();

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
    { name: 'Software', value: tickets.filter(t => t.category === 'software').length },
    { name: 'Hardware', value: tickets.filter(t => t.category === 'hardware').length },
    { name: 'Rede', value: tickets.filter(t => t.category === 'network').length },
    { name: 'Outro', value: tickets.filter(t => t.category === 'other').length },
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
      name: sector.name,
      rating: Number(avgRating.toFixed(1)),
      count: sectorTickets.length,
    };
  }).filter(s => s.count > 0);

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
              >
                {statusData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(222, 47%, 8%)', 
                  border: '1px solid hsl(217, 33%, 20%)',
                  borderRadius: '8px'
                }} 
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Chamados por categoria */}
        <div className="bg-card rounded-xl p-6 border border-border glow-card">
          <h2 className="text-lg font-semibold text-foreground mb-4">Chamados por Categoria</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={categoryData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(217, 33%, 20%)" />
              <XAxis type="number" stroke="hsl(215, 20%, 55%)" />
              <YAxis dataKey="name" type="category" stroke="hsl(215, 20%, 55%)" width={80} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(222, 47%, 8%)', 
                  border: '1px solid hsl(217, 33%, 20%)',
                  borderRadius: '8px'
                }} 
              />
              <Bar dataKey="value" fill="hsl(142, 76%, 36%)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Avaliações por setor */}
        <div className="bg-card rounded-xl p-6 border border-border glow-card">
          <h2 className="text-lg font-semibold text-foreground mb-4">Avaliações por Setor</h2>
          {sectorRatings.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={sectorRatings}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(217, 33%, 20%)" />
                <XAxis dataKey="name" stroke="hsl(215, 20%, 55%)" />
                <YAxis domain={[0, 5]} stroke="hsl(215, 20%, 55%)" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(222, 47%, 8%)', 
                    border: '1px solid hsl(217, 33%, 20%)',
                    borderRadius: '8px'
                  }} 
                  formatter={(value: number) => [`${value} ★`, 'Média']}
                />
                <Bar dataKey="rating" fill="hsl(38, 92%, 50%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground">
              Nenhuma avaliação por setor ainda
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Relatorios;
