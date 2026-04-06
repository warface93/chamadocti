import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarIcon, Clock, MapPin, User, Package, Save, Filter, Edit, CheckCircle, AlertTriangle, Bell, Phone, Loader2, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface MeetingWithDetails {
  id: string;
  user_id: string;
  meeting_date: string;
  start_time: string;
  end_time: string;
  location: string;
  status: string;
  other_description: string | null;
  ramal: string | null;
  link_platform: string | null;
  link_creator: string | null;
  created_at: string;
  user_name: string;
  equipment: string[];
  admin_items: AdminItem[];
  theme?: string | null;
}

interface AdminItem {
  id: string;
  meeting_id: string;
  description: string;
  quantity: number;
  tombamento: string | null;
}

interface InventoryEquipment {
  id: string;
  type: string;
  brand: string;
  tombamento: string | null;
  status: string;
  current_meeting_id: string | null;
}

const EQUIPMENT_LABELS: Record<string, string> = {
  notebook: 'Notebook', webcam: 'Webcam', microfone: 'Microfone',
  link_reuniao: 'Link de Reunião', caixa_som: 'Caixa de Som', sem_equipamentos: 'Sem Equipamentos',
};

const LOCATIONS = ['3° Andar', '2° Andar', 'Auditório', 'Outro Local'];

const ADMIN_ITEMS_PER_PAGE = 12;

const isMeetingOverdue = (meeting: MeetingWithDetails) => {
  if (meeting.status !== 'em_uso') return false;
  const now = new Date();
  const meetingDate = new Date(meeting.meeting_date + 'T00:00:00');
  const [endH, endM] = meeting.end_time.split(':').map(Number);
  const endDateTime = new Date(meetingDate);
  endDateTime.setHours(endH, endM, 0, 0);
  return isAfter(now, endDateTime);
};

const MeetingCardSkeleton = () => (
  <Card className="border-border">
    <CardContent className="p-4 space-y-3">
      <div className="flex items-center justify-between"><Skeleton className="h-4 w-24" /><Skeleton className="h-5 w-16 rounded-full" /></div>
      <div className="flex items-center gap-4"><Skeleton className="h-3 w-28" /><Skeleton className="h-3 w-20" /></div>
      <Skeleton className="h-3 w-32" />
      <div className="flex gap-1"><Skeleton className="h-5 w-16 rounded-full" /><Skeleton className="h-5 w-20 rounded-full" /></div>
    </CardContent>
  </Card>
);

const ReuniaoAdmin = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [meetings, setMeetings] = useState<MeetingWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>('todas');
  const [selectedMeeting, setSelectedMeeting] = useState<MeetingWithDetails | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemQty, setNewItemQty] = useState('1');
  const [newItemTomb, setNewItemTomb] = useState('');
  const [savingStatus, setSavingStatus] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [inventoryEquipment, setInventoryEquipment] = useState<InventoryEquipment[]>([]);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState('');

  // Search filters
  const [searchDate, setSearchDate] = useState('');
  const [searchLocation, setSearchLocation] = useState('all');
  const [searchTheme, setSearchTheme] = useState('');

  // Edit state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<MeetingWithDetails | null>(null);
  const [editDate, setEditDate] = useState<Date>();
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editCalendarOpen, setEditCalendarOpen] = useState(false);

  useEffect(() => {
    fetchMeetings();
    const channel = supabase
      .channel('meetings-admin-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meetings' }, () => { fetchMeetings(); })
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, []);

  const fetchMeetings = async () => {
    try {
      const [meetingsRes, profilesRes, equipmentRes, adminItemsRes] = await Promise.all([
        supabase.from('meetings').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('id, name'),
        supabase.from('meeting_equipment').select('meeting_id, equipment'),
        supabase.from('meeting_admin_items').select('*'),
      ]);
      if (!meetingsRes.data) return;

      const profileMap = new Map((profilesRes.data || []).map(p => [p.id, p.name]));
      const equipmentMap = new Map<string, string[]>();
      (equipmentRes.data || []).forEach(e => {
        const arr = equipmentMap.get(e.meeting_id) || [];
        arr.push(e.equipment);
        equipmentMap.set(e.meeting_id, arr);
      });
      const adminItemsMap = new Map<string, AdminItem[]>();
      (adminItemsRes.data || []).forEach((item: AdminItem) => {
        const arr = adminItemsMap.get(item.meeting_id) || [];
        arr.push(item);
        adminItemsMap.set(item.meeting_id, arr);
      });

      setMeetings(meetingsRes.data.map(m => ({
        ...m,
        user_name: profileMap.get(m.user_id) || 'Desconhecido',
        equipment: equipmentMap.get(m.id) || [],
        admin_items: adminItemsMap.get(m.id) || [],
        theme: (m as any).theme || null,
      })));
    } finally {
      setIsLoading(false);
    }
  };

  const filteredMeetings = meetings.filter(m => {
    if (filter === 'em_uso' && m.status !== 'em_uso') return false;
    if (filter === 'devolvido' && m.status !== 'devolvido') return false;
    if (filter === 'finalizado' && m.status !== 'finalizado') return false;
    if (searchDate && m.meeting_date !== searchDate) return false;
    if (searchLocation !== 'all' && m.location !== searchLocation) return false;
    if (searchTheme && !(m.theme || '').toLowerCase().includes(searchTheme.toLowerCase())) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredMeetings.length / ADMIN_ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedMeetings = filteredMeetings.slice((safePage - 1) * ADMIN_ITEMS_PER_PAGE, safePage * ADMIN_ITEMS_PER_PAGE);

  const handleStatusChange = async (meetingId: string, newStatus: string) => {
    setSavingStatus(true);
    const { error } = await supabase.from('meetings').update({ status: newStatus }).eq('id', meetingId);
    if (error) {
      toast({ title: 'Erro ao atualizar status', variant: 'destructive' });
    } else {
      toast({ title: 'Status atualizado com sucesso!' });
      fetchMeetings();
      setDialogOpen(false);
      setSelectedMeeting(null);
    }
    setSavingStatus(false);
  };

  const handleFinalize = async (meetingId: string) => {
    const meeting = meetings.find(m => m.id === meetingId);
    const isSemEquipamentos = meeting && (
      meeting.equipment.length === 0 ||
      (meeting.equipment.length === 1 && meeting.equipment[0] === 'sem_equipamentos')
    );
    const newStatus = isSemEquipamentos ? 'devolvido' : 'finalizado';
    const { error } = await supabase.from('meetings').update({ status: newStatus }).eq('id', meetingId);
    if (error) {
      toast({ title: 'Erro ao finalizar reunião', variant: 'destructive' });
    } else {
      toast({ title: isSemEquipamentos ? 'Reunião finalizada e devolvida!' : 'Reunião finalizada!' });
      fetchMeetings();
    }
  };

  const handleAddItem = async () => {
    if (!selectedMeeting || !newItemDesc.trim()) return;
    const { error } = await supabase.from('meeting_admin_items').insert({
      meeting_id: selectedMeeting.id,
      description: newItemDesc.trim(),
      quantity: parseInt(newItemQty) || 1,
      tombamento: newItemTomb.trim() || null,
    });
    if (error) {
      toast({ title: 'Erro ao cadastrar equipamento', variant: 'destructive' });
    } else {
      toast({ title: 'Equipamento cadastrado!' });
      setNewItemDesc(''); setNewItemQty('1'); setNewItemTomb('');
      fetchMeetings();
      const { data: items } = await supabase.from('meeting_admin_items').select('*').eq('meeting_id', selectedMeeting.id);
      setSelectedMeeting(prev => prev ? { ...prev, admin_items: (items as AdminItem[]) || [] } : null);
    }
  };

  const openDetail = (meeting: MeetingWithDetails) => { setSelectedMeeting(meeting); setDialogOpen(true); };

  const openEditDialog = (meeting: MeetingWithDetails) => {
    setEditingMeeting(meeting);
    setEditDate(new Date(meeting.meeting_date + 'T00:00:00'));
    setEditStartTime(meeting.start_time); setEditEndTime(meeting.end_time); setEditLocation(meeting.location);
    setEditDialogOpen(true);
  };

  const handleEditSave = async () => {
    if (!editingMeeting || !editDate || !editStartTime || !editEndTime || !editLocation) {
      toast({ title: 'Preencha todos os campos', variant: 'destructive' }); return;
    }
    if (editStartTime >= editEndTime) {
      toast({ title: 'Horário de término deve ser após o início', variant: 'destructive' }); return;
    }
    const dateStr = format(editDate, 'yyyy-MM-dd');
    const FIXED = ['3° Andar', '2° Andar', 'Auditório'];
    if (FIXED.includes(editLocation)) {
      const { data: otherMeetings } = await supabase.from('meetings').select('meeting_date, start_time, end_time, location').eq('status', 'em_uso').neq('id', editingMeeting.id);
      const conflict = (otherMeetings || []).some(m => m.meeting_date === dateStr && m.location === editLocation &&
        ((editStartTime >= m.start_time && editStartTime < m.end_time) || (editEndTime > m.start_time && editEndTime <= m.end_time) || (editStartTime <= m.start_time && editEndTime >= m.end_time)));
      if (conflict) { toast({ title: 'Horário/local indisponível', variant: 'destructive' }); return; }
    }
    const { error } = await supabase.from('meetings').update({ meeting_date: dateStr, start_time: editStartTime, end_time: editEndTime, location: editLocation }).eq('id', editingMeeting.id);
    if (error) { toast({ title: 'Erro ao editar reunião', variant: 'destructive' }); }
    else { toast({ title: 'Reunião editada com sucesso!' }); setEditDialogOpen(false); setEditingMeeting(null); fetchMeetings(); }
  };

  const finalizedCount = meetings.filter(m => m.status === 'finalizado').length;

  return (
    <div className="space-y-6">
      {finalizedCount > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30 text-warning">
          <Bell className="w-5 h-5 animate-pulse" />
          <span className="text-sm font-medium">{finalizedCount} reunião(ões) finalizada(s) pelo usuário aguardando confirmação de devolução</span>
        </div>
      )}

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <Filter className="w-4 h-4 text-muted-foreground" />
          {[
            { value: 'todas', label: 'Todas Reuniões' },
            { value: 'em_uso', label: 'Em Uso' },
            { value: 'finalizado', label: 'Finalizadas' },
            { value: 'devolvido', label: 'Devolvido' },
          ].map(f => (
            <Button key={f.value} variant={filter === f.value ? 'default' : 'outline'} size="sm" onClick={() => { setFilter(f.value); setCurrentPage(1); }}>
              {f.label}
              {f.value === 'finalizado' && finalizedCount > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">{finalizedCount}</Badge>
              )}
            </Button>
          ))}
        </div>
        <div className="flex flex-col md:flex-row gap-3">
          <Input type="date" value={searchDate} onChange={(e) => { setSearchDate(e.target.value); setCurrentPage(1); }} className="w-full md:w-48 bg-secondary/50" placeholder="Data" />
          <Select value={searchLocation} onValueChange={(v) => { setSearchLocation(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-full md:w-48 bg-secondary/50"><SelectValue placeholder="Local" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Locais</SelectItem>
              {LOCATIONS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar por tema..." value={searchTheme} onChange={(e) => { setSearchTheme(e.target.value); setCurrentPage(1); }} className="pl-10 bg-secondary/50" />
          </div>
        </div>
      </div>

      {/* Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <MeetingCardSkeleton key={i} />)}
        </div>
      ) : paginatedMeetings.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nenhuma reunião encontrada.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedMeetings.map(m => {
              const overdue = isMeetingOverdue(m);
              const isFinalized = m.status === 'finalizado';
              return (
                <Card key={m.id} className={cn(
                  'border-border cursor-pointer transition-all hover:-translate-y-1',
                  overdue ? 'bg-warning/10 border-warning/50' :
                  isFinalized ? 'bg-primary/5 border-primary/30' :
                  m.status === 'em_uso' ? 'bg-card glow-card' : 'bg-muted/20 opacity-50'
                )} onClick={() => openDetail(m)}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                        {overdue && <AlertTriangle className="w-4 h-4 text-warning animate-pulse" />}
                        {isFinalized && <Bell className="w-4 h-4 text-primary animate-pulse" />}
                        {format(new Date(m.meeting_date + 'T00:00:00'), 'dd/MM/yyyy')}
                      </span>
                      <Badge variant={isFinalized ? 'default' : m.status === 'em_uso' ? 'default' : 'secondary'} className={isFinalized ? 'bg-primary' : ''}>
                        {isFinalized ? 'Finalizada' : m.status === 'em_uso' ? 'Em Uso' : 'Devolvido'}
                      </Badge>
                    </div>
                    {m.theme && <p className="text-xs text-primary font-medium truncate">Tema: {m.theme}</p>}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-white" /> {m.start_time} - {m.end_time}</span>
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {m.location}</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground"><User className="w-3 h-3" /><span>{m.user_name}</span></div>
                    {m.ramal && <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" /> Ramal: {m.ramal}</p>}
                    <div className="flex flex-wrap gap-1">
                      {m.equipment.map(eq => <Badge key={eq} variant="outline" className="text-xs">{EQUIPMENT_LABELS[eq] || eq}</Badge>)}
                    </div>
                    {(m.status === 'em_uso' || m.status === 'finalizado') && (
                      <div className="flex gap-2 pt-2 border-t border-border" onClick={e => e.stopPropagation()}>
                        {m.status === 'em_uso' && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => openEditDialog(m)}><Edit className="w-3 h-3 mr-1" /> Editar</Button>
                            <Button size="sm" variant="warning" onClick={() => handleFinalize(m.id)}><CheckCircle className="w-3 h-3 mr-1" /> Finalizar</Button>
                          </>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button variant="outline" size="sm" disabled={safePage <= 1} onClick={() => setCurrentPage(safePage - 1)}><ChevronLeft className="w-4 h-4" /></Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).filter(p => totalPages <= 7 || p === 1 || p === totalPages || Math.abs(p - safePage) <= 1).map((page, idx, arr) => {
                const showEllipsis = idx > 0 && page - arr[idx - 1] > 1;
                return (
                  <span key={page} className="flex items-center gap-1">
                    {showEllipsis && <span className="px-2 text-muted-foreground">...</span>}
                    <Button variant={safePage === page ? 'default' : 'outline'} size="sm" className="w-8 h-8 p-0" onClick={() => setCurrentPage(page)}>{page}</Button>
                  </span>
                );
              })}
              <Button variant="outline" size="sm" disabled={safePage >= totalPages} onClick={() => setCurrentPage(safePage + 1)}><ChevronRight className="w-4 h-4" /></Button>
              <span className="text-sm text-muted-foreground ml-2">{filteredMeetings.length} reunião(ões)</span>
            </div>
          )}
        </>
      )}

      {/* Detail dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Detalhes da Reunião</DialogTitle></DialogHeader>
          {selectedMeeting && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Data:</span><p className="font-medium text-foreground">{format(new Date(selectedMeeting.meeting_date + 'T00:00:00'), 'dd/MM/yyyy')}</p></div>
                <div><span className="text-muted-foreground">Horário:</span><p className="font-medium text-foreground">{selectedMeeting.start_time} - {selectedMeeting.end_time}</p></div>
                <div><span className="text-muted-foreground">Local:</span><p className="font-medium text-foreground">{selectedMeeting.location}</p></div>
                <div><span className="text-muted-foreground">Solicitante:</span><p className="font-medium text-foreground">{selectedMeeting.user_name}</p></div>
                {selectedMeeting.ramal && <div><span className="text-muted-foreground">Ramal:</span><p className="font-medium text-foreground">{selectedMeeting.ramal}</p></div>}
                {selectedMeeting.link_platform && <div><span className="text-muted-foreground">Plataforma:</span><p className="font-medium text-foreground">{selectedMeeting.link_platform.toUpperCase()}</p></div>}
              </div>

              {selectedMeeting.theme && (
                <div><span className="text-sm text-muted-foreground">Tema:</span><p className="text-sm text-foreground p-2 rounded bg-primary/5 border border-primary/20 mt-1">{selectedMeeting.theme}</p></div>
              )}

              {selectedMeeting.link_creator && (
                <div><span className="text-sm text-muted-foreground">Responsável pelo link:</span><p className="text-sm text-foreground p-2 rounded bg-primary/5 border border-primary/20 mt-1">{selectedMeeting.link_creator}</p></div>
              )}

              <div>
                <span className="text-sm text-muted-foreground">Equipamentos solicitados:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedMeeting.equipment.map(eq => <Badge key={eq} variant="outline">{EQUIPMENT_LABELS[eq] || eq}</Badge>)}
                </div>
                {selectedMeeting.other_description && (
                  <div className="mt-2">
                    <Badge variant="outline" className="border-primary/50 text-primary">Sem Equipamentos</Badge>
                    <p className="text-sm text-foreground mt-1 p-2 rounded bg-primary/5 border border-primary/20">{selectedMeeting.other_description}</p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
                <Label className="text-sm">Status:</Label>
                <Select value={selectedMeeting.status} onValueChange={(v) => setSelectedMeeting(prev => prev ? { ...prev, status: v } : null)}>
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="em_uso">Em Uso</SelectItem>
                    <SelectItem value="finalizado">Finalizada</SelectItem>
                    <SelectItem value="devolvido">Devolvido</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" disabled={savingStatus} onClick={() => handleStatusChange(selectedMeeting.id, selectedMeeting.status)}>
                  {savingStatus ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />} Salvar
                </Button>
              </div>

              <div className="space-y-3 border-t border-border pt-4">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2"><Package className="w-4 h-4 text-primary" /> Cadastrar Equipamento Emprestado</h4>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1"><Label className="text-xs">Descrição</Label><Input value={newItemDesc} onChange={e => setNewItemDesc(e.target.value)} placeholder="Ex: Notebook Dell" /></div>
                  <div className="space-y-1"><Label className="text-xs">Quantidade</Label><Input type="number" min="1" value={newItemQty} onChange={e => setNewItemQty(e.target.value)} /></div>
                  <div className="space-y-1"><Label className="text-xs">Tombamento</Label><Input value={newItemTomb} onChange={e => setNewItemTomb(e.target.value)} placeholder="Opcional" /></div>
                </div>
                <Button size="sm" onClick={handleAddItem} disabled={!newItemDesc.trim()}>Adicionar</Button>
              </div>

              {selectedMeeting.admin_items.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-foreground">Equipamentos Registrados</h4>
                  <div className="space-y-1">
                    {selectedMeeting.admin_items.map(item => (
                      <div key={item.id} className="flex items-center justify-between text-sm p-2 rounded bg-secondary/20">
                        <span className="text-foreground">{item.description} (x{item.quantity})</span>
                        {item.tombamento && <span className="text-xs text-muted-foreground">Tomb: {item.tombamento}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Editar Reunião</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Data</Label>
              <Popover open={editCalendarOpen} onOpenChange={setEditCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !editDate && 'text-muted-foreground')}>
                    <CalendarIcon className="mr-2 h-4 w-4" />{editDate ? format(editDate, 'dd/MM/yyyy') : 'Selecione a data'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={editDate} onSelect={(d) => { setEditDate(d); setEditCalendarOpen(false); }} disabled={(d) => d < new Date(new Date().setHours(0,0,0,0))} locale={ptBR} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Início</Label><Input type="time" value={editStartTime} onChange={(e) => setEditStartTime(e.target.value)} /></div>
              <div className="space-y-2"><Label>Término</Label><Input type="time" value={editEndTime} onChange={(e) => setEditEndTime(e.target.value)} /></div>
            </div>
            <div className="space-y-2">
              <Label>Local</Label>
              <Select value={editLocation} onValueChange={setEditLocation}>
                <SelectTrigger><SelectValue placeholder="Local" /></SelectTrigger>
                <SelectContent>{LOCATIONS.map(loc => <SelectItem key={loc} value={loc}>{loc}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button onClick={handleEditSave} className="w-full">Salvar Alterações</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReuniaoAdmin;
