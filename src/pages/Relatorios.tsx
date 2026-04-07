import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Star, ArrowLeft, User, Building2, Tag, TicketCheck, Calendar, Trophy, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { format, isToday, isThisMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const STATUS_COLORS: Record<string, string> = {
  'Abertos': 'hsl(190, 95%, 50%)',
  'Em Andamento': 'hsl(38, 92%, 50%)',
  'Resolvidos': 'hsl(142, 76%, 36%)',
  'Críticos': 'hsl(0, 84%, 60%)',
  'Pendentes': 'hsl(217, 33%, 50%)',
};

const COLORS = ['hsl(190, 95%, 50%)', 'hsl(142, 76%, 36%)', 'hsl(38, 92%, 50%)', 'hsl(0, 84%, 60%)', 'hsl(217, 33%, 50%)'];

const RANKING_COLORS = [
  'hsl(190, 95%, 50%)', 'hsl(142, 76%, 36%)', 'hsl(38, 92%, 50%)', 'hsl(0, 84%, 60%)',
  'hsl(270, 70%, 55%)', 'hsl(25, 95%, 53%)', 'hsl(330, 80%, 50%)', 'hsl(200, 80%, 40%)',
];

const CATEGORY_LABELS: Record<string, string> = {
  internet: 'Internet', computador: 'Computador', telefone: 'Telefone', conta: 'Conta',
  sistema: 'Sistema', outros: 'Outros', software: 'Software', hardware: 'Hardware',
  network: 'Rede', other: 'Outro',
};

const STATUS_LABELS: Record<string, string> = {
  open: 'Aberto', in_progress: 'Em Andamento', resolved: 'Resolvido', critical: 'Crítico', pending: 'Pendente',
};

type DrilldownType = 'sector' | 'user' | 'category' | null;
type TicketFilter = 'total' | 'month' | 'day' | 'year';

const RelatoriosSkeleton = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Skeleton className="h-32 rounded-xl" />
      <Skeleton className="h-32 rounded-xl" />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-xl" />)}
    </div>
  </div>
);

const Relatorios = () => {
  const { isAdmin } = useAuth();
  const { tickets, users, sectors, loading } = useData();
  const [drilldownType, setDrilldownType] = useState<DrilldownType>(null);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeStatusIndex, setActiveStatusIndex] = useState<number | null>(null);
  const [activeBarIndex, setActiveBarIndex] = useState<number | null>(null);
  const [ticketFilter, setTicketFilter] = useState<TicketFilter>('total');
  const [selectedYear, setSelectedYear] = useState<string>('');

  // Export state
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportDay, setExportDay] = useState('');
  const [exportMonth, setExportMonth] = useState('todos');
  const [exportYear, setExportYear] = useState('todos');

  const availableYears = useMemo(() => {
    const yearsSet = new Set(tickets.map(t => new Date(t.created_at).getFullYear().toString()));
    const currentYear = new Date().getFullYear();
    for (let y = 2026; y <= currentYear + 1; y++) yearsSet.add(y.toString());
    return [...yearsSet].sort().reverse();
  }, [tickets]);

  const filteredTicketsCount = useMemo(() => {
    switch (ticketFilter) {
      case 'day': return tickets.filter(t => isToday(new Date(t.created_at))).length;
      case 'month': return tickets.filter(t => isThisMonth(new Date(t.created_at))).length;
      case 'year': return selectedYear ? tickets.filter(t => new Date(t.created_at).getFullYear().toString() === selectedYear).length : tickets.length;
      default: return tickets.length;
    }
  }, [tickets, ticketFilter, selectedYear]);

  const sectorTicketRanking = useMemo(() => {
    return sectors.map(sector => {
      const sectorUsers = users.filter(u => u.sector_id === sector.id);
      const count = tickets.filter(t => sectorUsers.some(u => u.id === t.user_id)).length;
      return { name: sector.name, count };
    }).filter(s => s.count > 0).sort((a, b) => b.count - a.count).slice(0, 8);
  }, [sectors, users, tickets]);

  const categoryTicketRanking = useMemo(() => {
    const catMap: Record<string, number> = {};
    tickets.forEach(t => { const label = CATEGORY_LABELS[t.category] || t.category; catMap[label] = (catMap[label] || 0) + 1; });
    return Object.entries(catMap).map(([name, count]) => ({ name, count }))
      .filter(c => c.count > 0 && c.name !== 'Outro' && c.name !== 'Outros')
      .sort((a, b) => b.count - a.count).slice(0, 8);
  }, [tickets]);

  if (!isAdmin) return <Navigate to="/meus-chamados" replace />;
  if (loading) return <RelatoriosSkeleton />;

  const ratedTickets = tickets.filter(t => t.rating && t.rating > 0);
  const averageRating = ratedTickets.length > 0 ? ratedTickets.reduce((acc, t) => acc + (t.rating || 0), 0) / ratedTickets.length : 0;

  const RATING_BAR_COLORS = ['hsl(0, 84%, 60%)', 'hsl(25, 95%, 53%)', 'hsl(38, 92%, 50%)', 'hsl(142, 76%, 36%)', 'hsl(190, 95%, 50%)'];
  const ratingDistribution = [1, 2, 3, 4, 5].map((rating, i) => ({
    rating: `${rating} ★`, quantidade: ratedTickets.filter(t => t.rating === rating).length, ratingValue: rating, color: RATING_BAR_COLORS[i],
  }));

  const statusData = [
    { name: 'Abertos', value: tickets.filter(t => t.status === 'open').length },
    { name: 'Em Andamento', value: tickets.filter(t => t.status === 'in_progress').length },
    { name: 'Resolvidos', value: tickets.filter(t => t.status === 'resolved').length },
    { name: 'Críticos', value: tickets.filter(t => t.status === 'critical').length },
    { name: 'Pendentes', value: tickets.filter(t => t.status === 'pending').length },
  ].filter(d => d.value > 0);

  const categoryData = [
    { name: 'Software', key: 'software', value: tickets.filter(t => t.category === 'software').length },
    { name: 'Hardware', key: 'hardware', value: tickets.filter(t => t.category === 'hardware').length },
    { name: 'Rede', key: 'network', value: tickets.filter(t => t.category === 'network').length },
    { name: 'Outro', key: 'other', value: tickets.filter(t => t.category === 'other').length },
  ].filter(d => d.value > 0);

  const sectorRatings = sectors.map(sector => {
    const sectorUsers = users.filter(u => u.sector_id === sector.id);
    const sectorTickets = ratedTickets.filter(t => sectorUsers.some(u => u.id === t.user_id));
    const avgRating = sectorTickets.length > 0 ? sectorTickets.reduce((acc, t) => acc + (t.rating || 0), 0) / sectorTickets.length : 0;
    return { id: sector.id, name: sector.name, rating: Number(avgRating.toFixed(1)), count: sectorTickets.length };
  }).filter(s => s.count > 0);

  const userRatings = users.map(user => {
    const userTickets = ratedTickets.filter(t => t.user_id === user.id);
    const avgRating = userTickets.length > 0 ? userTickets.reduce((acc, t) => acc + (t.rating || 0), 0) / userTickets.length : 0;
    return { id: user.id, name: user.name, rating: Number(avgRating.toFixed(1)), count: userTickets.length };
  }).filter(u => u.count > 0);

  const getDrilldownTickets = () => {
    if (!selectedItem) return [];
    switch (drilldownType) {
      case 'sector': { const ids = users.filter(u => u.sector_id === selectedItem).map(u => u.id); return ratedTickets.filter(t => ids.includes(t.user_id)); }
      case 'user': return ratedTickets.filter(t => t.user_id === selectedItem);
      case 'category': return ratedTickets.filter(t => t.category === selectedItem);
      default: return [];
    }
  };

  const getDrilldownTitle = () => {
    if (!selectedItem) return '';
    switch (drilldownType) {
      case 'sector': return `Avaliações - ${sectors.find(s => s.id === selectedItem)?.name || 'Setor'}`;
      case 'user': return `Avaliações - ${users.find(u => u.id === selectedItem)?.name || 'Usuário'}`;
      case 'category': return `Avaliações - ${({ software: 'Software', hardware: 'Hardware', network: 'Rede', other: 'Outro' } as any)[selectedItem] || 'Categoria'}`;
      default: return '';
    }
  };

  const handleDrilldown = (type: DrilldownType, id: string) => { setDrilldownType(type); setSelectedItem(id); setIsDialogOpen(true); };
  const handlePieClick = (_: any, index: number) => { setActiveStatusIndex(prev => prev === index ? null : index); };
  const handleBarClick = (_: any, index: number) => { setActiveBarIndex(prev => prev === index ? null : index); };

  const drilldownTickets = getDrilldownTickets();
  const getUserById = (id: string) => users.find(u => u.id === id);
  const filterLabel = ticketFilter === 'total' ? 'Total' : ticketFilter === 'month' ? 'Este Mês' : ticketFilter === 'year' ? `Ano ${selectedYear}` : 'Hoje';

  // Export function with full data
  const handleExport = (formatType: 'csv' | 'xlsx') => {
    let filtered = [...tickets];
    if (exportYear !== 'todos') filtered = filtered.filter(t => new Date(t.created_at).getFullYear().toString() === exportYear);
    if (exportMonth !== 'todos') filtered = filtered.filter(t => (new Date(t.created_at).getMonth() + 1).toString().padStart(2, '0') === exportMonth);
    if (exportDay) filtered = filtered.filter(t => new Date(t.created_at).getDate().toString().padStart(2, '0') === exportDay.padStart(2, '0'));

    if (filtered.length === 0) {
      toast.error('Nenhum chamado encontrado para o período selecionado.');
      return;
    }

    toast.info('O relatório será gerado com base nos filtros aplicados.');

    // Build comprehensive report
    const filteredRated = filtered.filter(t => t.rating && t.rating > 0);
    const filteredAvgRating = filteredRated.length > 0 ? filteredRated.reduce((acc, t) => acc + (t.rating || 0), 0) / filteredRated.length : 0;

    // Status counts
    const statusCounts: Record<string, number> = {};
    filtered.forEach(t => { const label = STATUS_LABELS[t.status] || t.status; statusCounts[label] = (statusCounts[label] || 0) + 1; });

    // Category counts
    const categoryCounts: Record<string, number> = {};
    filtered.forEach(t => { const label = CATEGORY_LABELS[t.category] || t.category; categoryCounts[label] = (categoryCounts[label] || 0) + 1; });

    // Sector counts
    const sectorCounts: Record<string, number> = {};
    filtered.forEach(t => {
      const u = users.find(u => u.id === t.user_id);
      const s = u ? sectors.find(s => s.id === u.sector_id) : null;
      const name = s?.name || 'Sem setor';
      sectorCounts[name] = (sectorCounts[name] || 0) + 1;
    });

    // Sector ratings
    const sectorRatingMap: Record<string, { total: number; count: number }> = {};
    filteredRated.forEach(t => {
      const u = users.find(u => u.id === t.user_id);
      const s = u ? sectors.find(s => s.id === u.sector_id) : null;
      const name = s?.name || 'Sem setor';
      if (!sectorRatingMap[name]) sectorRatingMap[name] = { total: 0, count: 0 };
      sectorRatingMap[name].total += t.rating || 0;
      sectorRatingMap[name].count += 1;
    });

    // User ratings
    const userRatingMap: Record<string, { total: number; count: number }> = {};
    filteredRated.forEach(t => {
      const u = users.find(u => u.id === t.user_id);
      const name = u?.name || 'Desconhecido';
      if (!userRatingMap[name]) userRatingMap[name] = { total: 0, count: 0 };
      userRatingMap[name].total += t.rating || 0;
      userRatingMap[name].count += 1;
    });

    // Category ratings
    const catRatingMap: Record<string, { total: number; count: number }> = {};
    filteredRated.forEach(t => {
      const label = CATEGORY_LABELS[t.category] || t.category;
      if (!catRatingMap[label]) catRatingMap[label] = { total: 0, count: 0 };
      catRatingMap[label].total += t.rating || 0;
      catRatingMap[label].count += 1;
    });

    const todayFiltered = filtered.filter(t => isToday(new Date(t.created_at))).length;
    const monthFiltered = filtered.filter(t => isThisMonth(new Date(t.created_at))).length;

    if (formatType === 'csv') {
      const lines: string[] = [];
      lines.push('=== RESUMO GERAL ===');
      lines.push(`Média Geral de Avaliações,${filteredAvgRating.toFixed(1)}`);
      lines.push(`Total de Chamados,${filtered.length}`);
      lines.push(`Chamados Hoje,${todayFiltered}`);
      lines.push(`Chamados Este Mês,${monthFiltered}`);
      lines.push(`Total de Avaliações,${filteredRated.length}`);
      lines.push('');
      lines.push('=== CHAMADOS POR STATUS ===');
      lines.push('Status,Quantidade');
      Object.entries(statusCounts).forEach(([k, v]) => lines.push(`${k},${v}`));
      lines.push('');
      lines.push('=== TOP SETORES ===');
      lines.push('Setor,Quantidade');
      Object.entries(sectorCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).forEach(([k, v]) => lines.push(`${k},${v}`));
      lines.push('');
      lines.push('=== TOP CATEGORIAS ===');
      lines.push('Categoria,Quantidade');
      Object.entries(categoryCounts).filter(([k]) => k !== 'Outro' && k !== 'Outros').sort((a, b) => b[1] - a[1]).slice(0, 8).forEach(([k, v]) => lines.push(`${k},${v}`));
      lines.push('');
      lines.push('=== AVALIAÇÃO POR CATEGORIA ===');
      lines.push('Categoria,Média,Avaliações');
      Object.entries(catRatingMap).forEach(([k, v]) => lines.push(`${k},${(v.total / v.count).toFixed(1)},${v.count}`));
      lines.push('');
      lines.push('=== AVALIAÇÃO POR SETOR ===');
      lines.push('Setor,Média,Avaliações');
      Object.entries(sectorRatingMap).forEach(([k, v]) => lines.push(`${k},${(v.total / v.count).toFixed(1)},${v.count}`));
      lines.push('');
      lines.push('=== AVALIAÇÃO POR USUÁRIO ===');
      lines.push('Usuário,Média,Avaliações');
      Object.entries(userRatingMap).forEach(([k, v]) => lines.push(`${k},${(v.total / v.count).toFixed(1)},${v.count}`));
      lines.push('');
      lines.push('=== LISTA DE CHAMADOS ===');
      lines.push('Nº,Título,Categoria,Descrição,Status,Data Abertura,Data Atualização,Solicitante,Avaliação');
      filtered.forEach((t, i) => {
        const vals = [
          i + 1, t.title, CATEGORY_LABELS[t.category] || t.category,
          t.description || '', STATUS_LABELS[t.status] || t.status,
          format(new Date(t.created_at), 'dd/MM/yyyy HH:mm'),
          format(new Date(t.updated_at), 'dd/MM/yyyy HH:mm'),
          getUserById(t.user_id)?.name || 'Desconhecido',
          t.rating ? `${t.rating} estrelas` : 'Sem avaliação',
        ];
        lines.push(vals.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
      });

      const csv = lines.join('\n');
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `relatorio_chamados_${format(new Date(), 'yyyyMMdd')}.csv`; a.click();
      URL.revokeObjectURL(url);
    } else {
      // Excel format using TSV with multiple sections
      const lines: string[] = [];
      lines.push('=== RESUMO GERAL ===');
      lines.push(`Métrica\tValor`);
      lines.push(`Média Geral de Avaliações\t${filteredAvgRating.toFixed(1)}`);
      lines.push(`Total de Chamados\t${filtered.length}`);
      lines.push(`Chamados Hoje\t${todayFiltered}`);
      lines.push(`Chamados Este Mês\t${monthFiltered}`);
      lines.push(`Total de Avaliações\t${filteredRated.length}`);
      lines.push('');
      lines.push('=== CHAMADOS POR STATUS ===');
      lines.push('Status\tQuantidade');
      Object.entries(statusCounts).forEach(([k, v]) => lines.push(`${k}\t${v}`));
      lines.push('');
      lines.push('=== TOP SETORES ===');
      lines.push('Setor\tQuantidade');
      Object.entries(sectorCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).forEach(([k, v]) => lines.push(`${k}\t${v}`));
      lines.push('');
      lines.push('=== TOP CATEGORIAS ===');
      lines.push('Categoria\tQuantidade');
      Object.entries(categoryCounts).filter(([k]) => k !== 'Outro' && k !== 'Outros').sort((a, b) => b[1] - a[1]).slice(0, 8).forEach(([k, v]) => lines.push(`${k}\t${v}`));
      lines.push('');
      lines.push('=== AVALIAÇÃO POR CATEGORIA ===');
      lines.push('Categoria\tMédia\tAvaliações');
      Object.entries(catRatingMap).forEach(([k, v]) => lines.push(`${k}\t${(v.total / v.count).toFixed(1)}\t${v.count}`));
      lines.push('');
      lines.push('=== AVALIAÇÃO POR SETOR ===');
      lines.push('Setor\tMédia\tAvaliações');
      Object.entries(sectorRatingMap).forEach(([k, v]) => lines.push(`${k}\t${(v.total / v.count).toFixed(1)}\t${v.count}`));
      lines.push('');
      lines.push('=== AVALIAÇÃO POR USUÁRIO ===');
      lines.push('Usuário\tMédia\tAvaliações');
      Object.entries(userRatingMap).forEach(([k, v]) => lines.push(`${k}\t${(v.total / v.count).toFixed(1)}\t${v.count}`));
      lines.push('');
      lines.push('=== LISTA DE CHAMADOS ===');
      lines.push('Nº\tTítulo\tCategoria\tDescrição\tStatus\tData Abertura\tData Atualização\tSolicitante\tAvaliação');
      filtered.forEach((t, i) => {
        lines.push([
          i + 1, t.title, CATEGORY_LABELS[t.category] || t.category,
          t.description || '', STATUS_LABELS[t.status] || t.status,
          format(new Date(t.created_at), 'dd/MM/yyyy HH:mm'),
          format(new Date(t.updated_at), 'dd/MM/yyyy HH:mm'),
          getUserById(t.user_id)?.name || 'Desconhecido',
          t.rating ? `${t.rating} estrelas` : 'Sem avaliação',
        ].join('\t'));
      });

      const tsv = lines.join('\n');
      const blob = new Blob(['\ufeff' + tsv], { type: 'application/vnd.ms-excel;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `relatorio_chamados_${format(new Date(), 'yyyyMMdd')}.xls`; a.click();
      URL.revokeObjectURL(url);
    }
    setExportDialogOpen(false);
    toast.success('Relatório exportado com sucesso!');
  };

  const months = Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1).padStart(2, '0'), label: format(new Date(2024, i, 1), 'MMMM', { locale: ptBR }) }));

  return (
    <div className="space-y-6">
      {/* Top stats bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-card rounded-xl p-4 md:p-6 border border-border glow-card">
          <h2 className="text-base md:text-lg font-semibold text-foreground mb-4">Média Geral de Avaliações</h2>
          <div className="flex items-center gap-3 md:gap-4 flex-wrap">
            <span className="text-4xl md:text-5xl font-bold gradient-text">{averageRating.toFixed(1)}</span>
            <div className="flex">
              {[1, 2, 3, 4, 5].map((value) => (
                <Star key={value} className={cn('w-6 h-6 md:w-8 md:h-8', averageRating >= value ? 'fill-warning text-warning' : 'text-muted-foreground')} />
              ))}
            </div>
            <span className="text-muted-foreground text-sm">({ratedTickets.length} avaliações)</span>
          </div>
        </div>

        <div className="bg-card rounded-xl p-4 md:p-6 border border-border glow-card">
          <div className="flex items-center justify-between mb-4 gap-2">
            <h2 className="text-base md:text-lg font-semibold text-foreground">Total de Chamados</h2>
            <Select value={ticketFilter} onValueChange={(v) => { setTicketFilter(v as TicketFilter); if (v === 'year' && !selectedYear) setSelectedYear(availableYears[0] || '2026'); }}>
              <SelectTrigger className="w-[130px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="total">Total</SelectItem>
                <SelectItem value="month">Este Mês</SelectItem>
                <SelectItem value="day">Hoje</SelectItem>
                <SelectItem value="year">Por Ano</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {ticketFilter === 'year' && (
            <div className="mb-3">
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-[120px] h-8"><SelectValue placeholder="Ano" /></SelectTrigger>
                <SelectContent>
                  {availableYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex items-center gap-3 md:gap-4">
            <span className="text-4xl md:text-5xl font-bold gradient-text">{filteredTicketsCount}</span>
            <TicketCheck className="w-6 h-6 md:w-8 md:h-8 text-primary" />
            <span className="text-muted-foreground text-sm">chamados ({filterLabel})</span>
          </div>
        </div>

        <div className="bg-card rounded-xl p-4 md:p-6 border border-border glow-card flex flex-col justify-center">
          <h2 className="text-base md:text-lg font-semibold text-foreground mb-4">Exportar Relatório</h2>
          <Button variant="glow" onClick={() => setExportDialogOpen(true)}>
            <Download className="w-4 h-4 mr-2" /> Baixar relatório de chamados
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Distribuição de avaliações */}
        <div className="bg-card rounded-xl p-4 md:p-6 border border-border glow-card">
          <h2 className="text-base md:text-lg font-semibold text-foreground mb-4">Distribuição de Avaliações</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={ratingDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(217, 33%, 20%)" />
              <XAxis dataKey="rating" stroke="hsl(215, 20%, 55%)" />
              <YAxis stroke="hsl(215, 20%, 55%)" />
              <Tooltip content={() => null} />
              <Bar dataKey="quantidade" radius={[4, 4, 0, 0]} onClick={handleBarClick} cursor="pointer">
                {ratingDistribution.map((entry, index) => (
                  <Cell key={`bar-cell-${index}`} fill={entry.color} fillOpacity={activeBarIndex !== null && activeBarIndex !== index ? 0.2 : 1} stroke={activeBarIndex === index ? entry.color : 'none'} strokeWidth={activeBarIndex === index ? 2 : 0} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Chamados por status */}
        <div className="bg-card rounded-xl p-4 md:p-6 border border-border glow-card">
          <h2 className="text-base md:text-lg font-semibold text-foreground mb-4">Chamados por Status</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" label={({ name, value }) => `${name}: ${value}`} isAnimationActive={false} onClick={handlePieClick} cursor="pointer">
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || COLORS[index % COLORS.length]} fillOpacity={activeStatusIndex !== null && activeStatusIndex !== index ? 0.2 : 1} stroke={activeStatusIndex === index ? STATUS_COLORS[entry.name] : 'none'} strokeWidth={activeStatusIndex === index ? 3 : 0} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Rankings */}
        <div className="bg-card rounded-xl p-4 md:p-6 border border-border glow-card">
          <div className="flex items-center gap-2 mb-4"><Trophy className="w-5 h-5 text-warning" /><h2 className="text-base md:text-lg font-semibold text-foreground">Top Setores - Chamados</h2></div>
          {sectorTicketRanking.length > 0 ? (
            <div className="space-y-2">
              {sectorTicketRanking.map((item, index) => {
                const maxCount = sectorTicketRanking[0]?.count || 1;
                const widthPct = Math.max(10, (item.count / maxCount) * 100);
                return (
                  <div key={item.name} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-muted-foreground w-5 text-right">{index + 1}°</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1"><span className="text-sm font-medium text-foreground truncate">{item.name}</span><span className="text-sm font-bold text-foreground ml-2">{item.count}</span></div>
                      <div className="h-2 rounded-full bg-secondary/30 overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width: `${widthPct}%`, backgroundColor: RANKING_COLORS[index % RANKING_COLORS.length] }} /></div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : <div className="h-[200px] flex items-center justify-center text-muted-foreground">Nenhum dado disponível</div>}
        </div>

        <div className="bg-card rounded-xl p-4 md:p-6 border border-border glow-card">
          <div className="flex items-center gap-2 mb-4"><Tag className="w-5 h-5 text-primary" /><h2 className="text-base md:text-lg font-semibold text-foreground">Top Categorias - Chamados</h2></div>
          {categoryTicketRanking.length > 0 ? (
            <div className="space-y-2">
              {categoryTicketRanking.map((item, index) => {
                const maxCount = categoryTicketRanking[0]?.count || 1;
                const widthPct = Math.max(10, (item.count / maxCount) * 100);
                return (
                  <div key={item.name} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-muted-foreground w-5 text-right">{index + 1}°</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1"><span className="text-sm font-medium text-foreground truncate">{item.name}</span><span className="text-sm font-bold text-foreground ml-2">{item.count}</span></div>
                      <div className="h-2 rounded-full bg-secondary/30 overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width: `${widthPct}%`, backgroundColor: RANKING_COLORS[index % RANKING_COLORS.length] }} /></div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : <div className="h-[200px] flex items-center justify-center text-muted-foreground">Nenhum dado disponível</div>}
        </div>

        {/* Avaliações por Categoria */}
        <div className="bg-card rounded-xl p-4 md:p-6 border border-border glow-card">
          <div className="flex items-center gap-2 mb-4"><Tag className="w-5 h-5 text-primary" /><h2 className="text-base md:text-lg font-semibold text-foreground">Avaliações por Categoria</h2><span className="text-xs text-muted-foreground">(clique para detalhes)</span></div>
          <div className="space-y-3">
            {categoryData.map((category) => {
              const categoryTickets = ratedTickets.filter(t => t.category === category.key);
              const avgRating = categoryTickets.length > 0 ? categoryTickets.reduce((acc, t) => acc + (t.rating || 0), 0) / categoryTickets.length : 0;
              return (
                <div key={category.key} onClick={() => handleDrilldown('category', category.key)} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 cursor-pointer transition-colors">
                  <span className="text-foreground font-medium">{category.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-sm">{categoryTickets.length} avaliações</span>
                    <div className="flex items-center gap-1"><Star className={cn('w-4 h-4', avgRating > 0 ? 'fill-warning text-warning' : 'text-muted-foreground')} /><span className="text-foreground">{avgRating.toFixed(1)}</span></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Avaliações por setor */}
        <div className="bg-card rounded-xl p-4 md:p-6 border border-border glow-card">
          <div className="flex items-center gap-2 mb-4"><Building2 className="w-5 h-5 text-primary" /><h2 className="text-base md:text-lg font-semibold text-foreground">Avaliações por Setor</h2><span className="text-xs text-muted-foreground">(clique para detalhes)</span></div>
          {sectorRatings.length > 0 ? (
            <div className="space-y-3">
              {sectorRatings.map((sector) => (
                <div key={sector.id} onClick={() => handleDrilldown('sector', sector.id)} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 cursor-pointer transition-colors">
                  <span className="text-foreground font-medium">{sector.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-sm">{sector.count} avaliações</span>
                    <div className="flex items-center gap-1"><Star className={cn('w-4 h-4', sector.rating > 0 ? 'fill-warning text-warning' : 'text-muted-foreground')} /><span className="text-foreground">{sector.rating}</span></div>
                  </div>
                </div>
              ))}
            </div>
          ) : <div className="h-[200px] flex items-center justify-center text-muted-foreground">Nenhuma avaliação por setor ainda</div>}
        </div>

        {/* Avaliações por usuário */}
        <div className="bg-card rounded-xl p-4 md:p-6 border border-border glow-card lg:col-span-2">
          <div className="flex items-center gap-2 mb-4"><User className="w-5 h-5 text-primary" /><h2 className="text-base md:text-lg font-semibold text-foreground">Avaliações por Usuário</h2><span className="text-xs text-muted-foreground">(clique para detalhes)</span></div>
          {userRatings.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {userRatings.map((userRating) => (
                <div key={userRating.id} onClick={() => handleDrilldown('user', userRating.id)} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 cursor-pointer transition-colors">
                  <span className="text-foreground font-medium truncate">{userRating.name}</span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-muted-foreground text-sm">{userRating.count}</span>
                    <div className="flex items-center gap-1"><Star className={cn('w-4 h-4', userRating.rating > 0 ? 'fill-warning text-warning' : 'text-muted-foreground')} /><span className="text-foreground">{userRating.rating}</span></div>
                  </div>
                </div>
              ))}
            </div>
          ) : <div className="h-[100px] flex items-center justify-center text-muted-foreground">Nenhuma avaliação por usuário ainda</div>}
        </div>
      </div>

      {/* Drilldown Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => setIsDialogOpen(false)} className="h-8 w-8"><ArrowLeft className="w-4 h-4" /></Button>
              {getDrilldownTitle()}
            </DialogTitle>
            <DialogDescription>Lista detalhada de chamados avaliados</DialogDescription>
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
                            <Star key={value} className={cn('w-4 h-4', (ticket.rating || 0) >= value ? 'fill-warning text-warning' : 'text-muted-foreground')} />
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{ticket.description}</p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Por: {ticketUser?.name || 'Usuário'}</span>
                        <span>{format(new Date(ticket.created_at), "dd/MM/yyyy", { locale: ptBR })}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : <div className="text-center py-8 text-muted-foreground">Nenhuma avaliação encontrada</div>}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle>Exportar Relatório de Chamados</DialogTitle>
            <DialogDescription>O relatório será gerado com base nos filtros aplicados. Inclui resumo geral, métricas, rankings e lista completa de chamados.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Dia</Label>
                <Input type="number" min="1" max="31" value={exportDay} onChange={(e) => setExportDay(e.target.value)} placeholder="DD" className="bg-secondary/50" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Mês</Label>
                <Select value={exportMonth} onValueChange={setExportMonth}>
                  <SelectTrigger className="bg-secondary/50"><SelectValue placeholder="Mês" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Ano</Label>
                <Select value={exportYear} onValueChange={setExportYear}>
                  <SelectTrigger className="bg-secondary/50"><SelectValue placeholder="Ano" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {availableYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="glow" className="flex-1" onClick={() => handleExport('xlsx')}>
                <Download className="w-4 h-4 mr-2" /> Excel (.xls)
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => handleExport('csv')}>
                <Download className="w-4 h-4 mr-2" /> CSV (.csv)
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Relatorios;
