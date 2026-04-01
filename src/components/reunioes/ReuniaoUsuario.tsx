import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CalendarIcon, Send, Clock, MapPin, Monitor, Edit, CheckCircle, AlertTriangle, Phone, History, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { format, isAfter, parse, isToday, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const TIME_SLOTS = [
  '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00',
];

const LOCATIONS = ['3° Andar', '2° Andar', 'Auditório', 'Outro Local'];
const FIXED_LOCATIONS = ['3° Andar', '2° Andar', 'Auditório'];

const EQUIPMENT_OPTIONS = [
  { id: 'notebook', label: 'Notebook' },
  { id: 'webcam', label: 'Webcam' },
  { id: 'microfone', label: 'Microfone' },
  { id: 'link_reuniao', label: 'Link de Reunião' },
  { id: 'caixa_som', label: 'Caixa de Som' },
  { id: 'sem_equipamentos', label: 'Sem Equipamentos' },
];

const LINK_PLATFORMS = [
  { id: 'teams', label: 'TEAMS' },
  { id: 'zoom', label: 'ZOOM' },
  { id: 'meet', label: 'MEET' },
];

const MIN_TIME = '07:30';
const MAX_TIME = '17:00';

const USER_ITEMS_PER_PAGE = 6;

interface ExistingMeeting {
  id?: string;
  meeting_date: string;
  start_time: string;
  end_time: string;
  location: string;
}

interface UserMeeting {
  id: string;
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
  user_id: string;
  equipment: string[];
  user_name?: string;
  theme?: string | null;
}

const isMeetingOverdue = (meeting: UserMeeting) => {
  if (meeting.status !== 'em_uso') return false;
  const now = new Date();
  const meetingDate = new Date(meeting.meeting_date + 'T00:00:00');
  const [endH, endM] = meeting.end_time.split(':').map(Number);
  const endDateTime = new Date(meetingDate);
  endDateTime.setHours(endH, endM, 0, 0);
  return isAfter(now, endDateTime);
};

const isTimeInRange = (time: string) => {
  return time >= MIN_TIME && time <= MAX_TIME;
};

const isTimePassed = (time: string, selectedDate: Date | undefined) => {
  if (!selectedDate || !isToday(selectedDate)) return false;
  const now = new Date();
  const [h, m] = time.split(':').map(Number);
  const slotDate = new Date();
  slotDate.setHours(h, m, 0, 0);
  return isBefore(slotDate, now);
};

const ReuniaoUsuario = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [date, setDate] = useState<Date>();
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [theme, setTheme] = useState('');
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [otherDescription, setOtherDescription] = useState('');
  const [ramal, setRamal] = useState('');
  const [linkPlatform, setLinkPlatform] = useState('');
  const [linkCreator, setLinkCreator] = useState('');
  const [existingMeetings, setExistingMeetings] = useState<ExistingMeeting[]>([]);
  const [myMeetings, setMyMeetings] = useState<UserMeeting[]>([]);
  const [myHistory, setMyHistory] = useState<UserMeeting[]>([]);
  const [myAwaiting, setMyAwaiting] = useState<UserMeeting[]>([]);
  const [allActiveMeetings, setAllActiveMeetings] = useState<UserMeeting[]>([]);
  const [loading, setLoading] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [customStartTime, setCustomStartTime] = useState('');
  const [customEndTime, setCustomEndTime] = useState('');

  // Pagination
  const [myMeetingsPage, setMyMeetingsPage] = useState(1);

  // Edit state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<UserMeeting | null>(null);
  const [editDate, setEditDate] = useState<Date>();
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editCalendarOpen, setEditCalendarOpen] = useState(false);

  useEffect(() => {
    fetchExistingMeetings();
    fetchMyMeetings();
    fetchAllActiveMeetings();

    const channel = supabase
      .channel('meetings-user-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meetings' }, () => {
        fetchMyMeetings();
        fetchAllActiveMeetings();
        fetchExistingMeetings();
      })
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, []);

  const fetchAllActiveMeetings = async () => {
    const { data: meetings } = await supabase
      .from('meetings')
      .select('*')
      .eq('status', 'em_uso')
      .order('meeting_date', { ascending: true });

    if (meetings) {
      // Filter out "Outro Local" from active meetings display
      const fixedMeetings = meetings.filter(m => FIXED_LOCATIONS.includes(m.location));
      const [profilesRes, eqRes] = await Promise.all([
        supabase.from('profiles').select('id, name'),
        supabase.from('meeting_equipment').select('meeting_id, equipment'),
      ]);
      const profileMap = new Map((profilesRes.data || []).map(p => [p.id, p.name]));
      const eqMap = new Map<string, string[]>();
      (eqRes.data || []).forEach(e => {
        const arr = eqMap.get(e.meeting_id) || [];
        arr.push(e.equipment);
        eqMap.set(e.meeting_id, arr);
      });

      const enriched: UserMeeting[] = fixedMeetings.map(m => ({
        ...m,
        equipment: eqMap.get(m.id) || [],
        user_name: profileMap.get(m.user_id) || 'Desconhecido',
        theme: (m as any).theme || null,
      }));
      setAllActiveMeetings(enriched);
    }
  };

  const fetchExistingMeetings = async () => {
    const { data } = await supabase
      .from('meetings')
      .select('id, meeting_date, start_time, end_time, location')
      .eq('status', 'em_uso');
    if (data) setExistingMeetings(data);
  };

  const fetchMyMeetings = async () => {
    if (!user) return;
    const { data: meetings } = await supabase
      .from('meetings')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (meetings) {
      const { data: eqData } = await supabase.from('meeting_equipment').select('meeting_id, equipment');
      const eqMap = new Map<string, string[]>();
      (eqData || []).forEach(e => {
        const arr = eqMap.get(e.meeting_id) || [];
        arr.push(e.equipment);
        eqMap.set(e.meeting_id, arr);
      });

      const enriched: UserMeeting[] = meetings.map(m => ({
        ...m,
        equipment: eqMap.get(m.id) || [],
        theme: (m as any).theme || null,
      }));
      
      setMyMeetings(enriched.filter(m => m.status === 'em_uso'));
      setMyAwaiting(enriched.filter(m => m.status === 'finalizado'));
      setMyHistory(enriched.filter(m => m.status === 'devolvido'));
    }
  };

  const isTimeSlotTaken = (time: string, forLocation: string, excludeMeetingId?: string) => {
    if (!date && !editDate) return false;
    if (!FIXED_LOCATIONS.includes(forLocation)) return false;
    const currentDate = editDialogOpen ? editDate : date;
    if (!currentDate) return false;
    const dateStr = format(currentDate, 'yyyy-MM-dd');
    return existingMeetings.some(
      m => m.meeting_date === dateStr && m.location === forLocation &&
        time >= m.start_time && time < m.end_time &&
        (!excludeMeetingId || m.id !== excludeMeetingId)
    );
  };

  const isLocationAvailable = (loc: string, sTime?: string, eTime?: string, selectedDate?: Date, excludeMeetingId?: string) => {
    if (!FIXED_LOCATIONS.includes(loc)) return true;
    const d = selectedDate || date;
    const st = sTime || startTime || customStartTime;
    const et = eTime || endTime || customEndTime;
    if (!d || !st || !et) return true;
    const dateStr = format(d, 'yyyy-MM-dd');
    return !existingMeetings.some(
      m => m.meeting_date === dateStr && m.location === loc &&
        ((st >= m.start_time && st < m.end_time) ||
         (et > m.start_time && et <= m.end_time) ||
         (st <= m.start_time && et >= m.end_time)) &&
        (!excludeMeetingId || m.id !== excludeMeetingId)
    );
  };

  const handleEquipmentToggle = (equipmentId: string) => {
    if (equipmentId === 'sem_equipamentos') {
      if (selectedEquipment.includes('sem_equipamentos')) {
        setSelectedEquipment([]);
      } else {
        setSelectedEquipment(['sem_equipamentos']);
        setOtherDescription('');
        setLinkPlatform('');
        setLinkCreator('');
      }
      return;
    }
    setSelectedEquipment(prev => {
      const filtered = prev.filter(e => e !== 'sem_equipamentos');
      return filtered.includes(equipmentId)
        ? filtered.filter(e => e !== equipmentId)
        : [...filtered, equipmentId];
    });
    if (equipmentId === 'link_reuniao' && selectedEquipment.includes('link_reuniao')) {
      setLinkPlatform('');
      setLinkCreator('');
    }
  };

  const getEffectiveTime = (selected: string, custom: string) => {
    if (custom && /^\d{2}:\d{2}$/.test(custom)) return custom;
    return selected;
  };

  const handleCustomStartTimeChange = (value: string) => {
    setCustomStartTime(value);
    setStartTime('');
    if (value && /^\d{2}:\d{2}$/.test(value) && !isTimeInRange(value)) {
      toast({ title: 'Horário fora do intervalo permitido (07:30 - 17:00)', variant: 'destructive' });
    }
  };

  const handleCustomEndTimeChange = (value: string) => {
    setCustomEndTime(value);
    setEndTime('');
    if (value && /^\d{2}:\d{2}$/.test(value) && !isTimeInRange(value)) {
      toast({ title: 'Horário fora do intervalo permitido (07:30 - 17:00)', variant: 'destructive' });
    }
  };

  const handleSubmit = async () => {
    const effectiveStart = getEffectiveTime(startTime, customStartTime);
    const effectiveEnd = getEffectiveTime(endTime, customEndTime);

    if (!user || !date || !effectiveStart || !effectiveEnd || !location) {
      toast({ title: 'Preencha todos os campos obrigatórios', variant: 'destructive' });
      return;
    }

    if (!theme.trim()) {
      toast({ title: 'Informe o Tema da Reunião', variant: 'destructive' });
      return;
    }

    if (!ramal.trim()) {
      toast({ title: 'Informe o Ramal', variant: 'destructive' });
      return;
    }

    if (!isTimeInRange(effectiveStart) || !isTimeInRange(effectiveEnd)) {
      toast({ title: 'Horário deve estar entre 07:30 e 17:00', variant: 'destructive' });
      return;
    }

    if (effectiveStart >= effectiveEnd) {
      toast({ title: 'Horário de término deve ser após o início', variant: 'destructive' });
      return;
    }

    // Check past time for today
    if (isTimePassed(effectiveStart, date)) {
      toast({ title: 'Não é possível agendar reuniões em horários que já passaram.', variant: 'destructive' });
      return;
    }

    // Only validate conflict for fixed locations
    if (FIXED_LOCATIONS.includes(location) && !isLocationAvailable(location, effectiveStart, effectiveEnd, date)) {
      toast({ title: 'Conflito de horário! Já existe uma reunião neste local e horário.', variant: 'destructive' });
      return;
    }

    if (selectedEquipment.length === 0) {
      toast({ title: 'Selecione pelo menos uma opção de equipamento', variant: 'destructive' });
      return;
    }

    if (selectedEquipment.includes('link_reuniao') && !linkPlatform) {
      toast({ title: 'Selecione a plataforma do link de reunião', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { data: meeting, error } = await supabase.from('meetings').insert({
        user_id: user.id,
        meeting_date: format(date, 'yyyy-MM-dd'),
        start_time: effectiveStart,
        end_time: effectiveEnd,
        location,
        other_description: null,
        ramal: ramal.trim(),
        link_platform: selectedEquipment.includes('link_reuniao') ? linkPlatform : null,
        link_creator: selectedEquipment.includes('link_reuniao') ? linkCreator : null,
        theme: theme.trim(),
      } as any).select().single();

      if (error) throw error;

      const equipmentToSave = selectedEquipment.filter(e => e !== 'sem_equipamentos');
      if (equipmentToSave.length > 0) {
        const equipmentRows = equipmentToSave.map(eq => ({ meeting_id: meeting.id, equipment: eq }));
        await supabase.from('meeting_equipment').insert(equipmentRows);
      }

      toast({ title: 'Solicitação enviada com sucesso!' });
      setDate(undefined); setStartTime(''); setEndTime(''); setCustomStartTime(''); setCustomEndTime('');
      setLocation(''); setSelectedEquipment([]); setOtherDescription(''); setRamal('');
      setLinkPlatform(''); setLinkCreator(''); setTheme('');
      fetchExistingMeetings(); fetchMyMeetings(); fetchAllActiveMeetings();
    } catch (err: any) {
      toast({ title: 'Erro ao enviar solicitação', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleFinalize = async (meetingId: string) => {
    const meeting = myMeetings.find(m => m.id === meetingId);
    const isSemEquipamentos = meeting && (
      meeting.equipment.length === 0 ||
      (meeting.equipment.length === 1 && meeting.equipment[0] === 'sem_equipamentos')
    );
    const newStatus = isSemEquipamentos ? 'devolvido' : 'finalizado';

    const { error } = await supabase.from('meetings').update({ status: newStatus }).eq('id', meetingId);
    if (error) {
      toast({ title: 'Erro ao finalizar reunião', variant: 'destructive' });
    } else {
      toast({ title: 'Reunião finalizada com sucesso!' });
      fetchMyMeetings(); fetchAllActiveMeetings(); fetchExistingMeetings();
    }
  };

  const openEditDialog = (meeting: UserMeeting) => {
    setEditingMeeting(meeting);
    setEditDate(new Date(meeting.meeting_date + 'T00:00:00'));
    setEditStartTime(meeting.start_time);
    setEditEndTime(meeting.end_time);
    setEditLocation(meeting.location);
    setEditDialogOpen(true);
  };

  const handleEditSave = async () => {
    if (!editingMeeting || !editDate || !editStartTime || !editEndTime || !editLocation) {
      toast({ title: 'Preencha todos os campos', variant: 'destructive' });
      return;
    }
    if (!isTimeInRange(editStartTime) || !isTimeInRange(editEndTime)) {
      toast({ title: 'Horário deve estar entre 07:30 e 17:00', variant: 'destructive' });
      return;
    }
    if (editStartTime >= editEndTime) {
      toast({ title: 'Horário de término deve ser após o início', variant: 'destructive' });
      return;
    }

    if (FIXED_LOCATIONS.includes(editLocation)) {
      const dateStr = format(editDate, 'yyyy-MM-dd');
      const { data: otherMeetings } = await supabase
        .from('meetings')
        .select('meeting_date, start_time, end_time, location')
        .eq('status', 'em_uso')
        .neq('id', editingMeeting.id);

      const realConflict = (otherMeetings || []).some(
        m => m.meeting_date === dateStr && m.location === editLocation &&
          ((editStartTime >= m.start_time && editStartTime < m.end_time) ||
           (editEndTime > m.start_time && editEndTime <= m.end_time) ||
           (editStartTime <= m.start_time && editEndTime >= m.end_time))
      );
      if (realConflict) {
        toast({ title: 'Horário/local indisponível', variant: 'destructive' });
        return;
      }
    }

    const { error } = await supabase
      .from('meetings')
      .update({ meeting_date: format(editDate, 'yyyy-MM-dd'), start_time: editStartTime, end_time: editEndTime, location: editLocation })
      .eq('id', editingMeeting.id);

    if (error) {
      toast({ title: 'Erro ao editar reunião', variant: 'destructive' });
    } else {
      toast({ title: 'Reunião editada com sucesso!' });
      setEditDialogOpen(false); setEditingMeeting(null);
      fetchExistingMeetings(); fetchMyMeetings(); fetchAllActiveMeetings();
    }
  };

  const getEquipmentLabel = (id: string) =>
    EQUIPMENT_OPTIONS.find(e => e.id === id)?.label || LINK_PLATFORMS.find(p => p.id === id)?.label || id;

  const effectiveStartForDisplay = getEffectiveTime(startTime, customStartTime);
  const effectiveEndForDisplay = getEffectiveTime(endTime, customEndTime);

  // Pagination for my meetings
  const myMeetingsTotalPages = Math.max(1, Math.ceil(myMeetings.length / USER_ITEMS_PER_PAGE));
  const myMeetingsPaginated = myMeetings.slice((myMeetingsPage - 1) * USER_ITEMS_PER_PAGE, myMeetingsPage * USER_ITEMS_PER_PAGE);

  return (
    <div className="space-y-6">
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-primary" />
            Nova Solicitação de Reunião
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Data da Reunião</Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !date && 'text-muted-foreground')}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, 'dd/MM/yyyy') : 'Selecione a data'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={date} onSelect={(d) => { setDate(d); setCalendarOpen(false); }} disabled={(d) => d < new Date(new Date().setHours(0,0,0,0))} locale={ptBR} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-white" />
                Horário Início
              </Label>
              <div className="flex gap-2">
                <Select value={startTime} onValueChange={(v) => { setStartTime(v); setCustomStartTime(''); }}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Início" /></SelectTrigger>
                  <SelectContent>
                    {TIME_SLOTS.map(t => {
                      const taken = location && FIXED_LOCATIONS.includes(location) ? isTimeSlotTaken(t, location) : false;
                      const passed = isTimePassed(t, date);
                      return (
                        <SelectItem key={t} value={t} disabled={taken || passed}>
                          <span className="flex items-center gap-2">
                            {t}
                            {taken && <span className="text-destructive text-xs">Indisponível</span>}
                            {passed && !taken && <span className="text-muted-foreground text-xs">Passado</span>}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <Input type="time" value={customStartTime} onChange={(e) => handleCustomStartTimeChange(e.target.value)} min="07:30" max="17:00" className="w-24" placeholder="HH:MM" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-white" />
                Horário Término
              </Label>
              <div className="flex gap-2">
                <Select value={endTime} onValueChange={(v) => { setEndTime(v); setCustomEndTime(''); }}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Término" /></SelectTrigger>
                  <SelectContent>
                    {TIME_SLOTS.map(t => {
                      const effectiveStart = getEffectiveTime(startTime, customStartTime);
                      const taken = location && FIXED_LOCATIONS.includes(location) ? isTimeSlotTaken(t, location) : false;
                      return (
                        <SelectItem key={t} value={t} disabled={taken || (!!effectiveStart && t <= effectiveStart)}>
                          <span className="flex items-center gap-2">
                            {t}
                            {taken && <span className="text-destructive text-xs">Indisponível</span>}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <Input type="time" value={customEndTime} onChange={(e) => handleCustomEndTimeChange(e.target.value)} min="07:30" max="17:00" className="w-24" placeholder="HH:MM" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Local da Reunião</Label>
              <Select value={location} onValueChange={setLocation}>
                <SelectTrigger><SelectValue placeholder="Local" /></SelectTrigger>
                <SelectContent>
                  {LOCATIONS.map(loc => {
                    const isFixed = FIXED_LOCATIONS.includes(loc);
                    const available = isFixed ? isLocationAvailable(loc, effectiveStartForDisplay, effectiveEndForDisplay, date) : true;
                    return (
                      <SelectItem key={loc} value={loc} disabled={isFixed && !available}>
                        <span className="flex items-center gap-2">
                          {loc}
                          {isFixed && !available && <span className="text-destructive text-xs font-semibold">Indisponível</span>}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Theme */}
          <div className="space-y-2">
            <Label>Tema da Reunião <span className="text-destructive">*</span></Label>
            <Input value={theme} onChange={(e) => setTheme(e.target.value)} placeholder="Informe o tema da reunião..." className="max-w-md" />
          </div>

          {/* Ramal */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-primary" />
              Ramal <span className="text-destructive">*</span>
            </Label>
            <Input value={ramal} onChange={(e) => setRamal(e.target.value)} placeholder="Informe o ramal..." className="max-w-xs" />
          </div>

          {/* Equipment */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Monitor className="w-4 h-4 text-primary" />
              Escolher Equipamento
            </Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {EQUIPMENT_OPTIONS.map(eq => (
                <div key={eq.id} className="flex items-center space-x-2">
                  <Checkbox id={eq.id} checked={selectedEquipment.includes(eq.id)} onCheckedChange={() => handleEquipmentToggle(eq.id)} />
                  <label htmlFor={eq.id} className="text-sm font-medium text-foreground cursor-pointer">{eq.label}</label>
                </div>
              ))}
            </div>

            {selectedEquipment.includes('link_reuniao') && (
              <div className="ml-6 space-y-3 p-3 rounded-lg border border-border bg-secondary/20">
                <Label className="text-sm">Plataforma do Link:</Label>
                <div className="flex gap-4">
                  {LINK_PLATFORMS.map(p => (
                    <div key={p.id} className="flex items-center space-x-2">
                      <Checkbox id={`link-${p.id}`} checked={linkPlatform === p.id} onCheckedChange={() => setLinkPlatform(linkPlatform === p.id ? '' : p.id)} />
                      <label htmlFor={`link-${p.id}`} className="text-sm font-medium text-foreground cursor-pointer">{p.label}</label>
                    </div>
                  ))}
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">Quem vai criar o link?</Label>
                  <Textarea placeholder="Informe quem será responsável por criar o link..." value={linkCreator} onChange={(e) => setLinkCreator(e.target.value)} />
                </div>
              </div>
            )}
          </div>

          <Button onClick={handleSubmit} disabled={loading} className="w-full md:w-auto">
            <Send className="w-4 h-4 mr-2" />
            {loading ? 'Enviando...' : 'Enviar Solicitação'}
          </Button>
        </CardContent>
      </Card>

      {/* My meetings list */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Minhas Solicitações</h2>
        {myMeetings.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nenhuma solicitação encontrada.</p>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myMeetingsPaginated.map(m => {
                const overdue = isMeetingOverdue(m);
                return (
                  <Card key={m.id} className={cn('border-border transition-all', overdue ? 'bg-warning/10 border-warning/50' : 'bg-card glow-card')}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground flex items-center gap-2">
                          {overdue && <AlertTriangle className="w-4 h-4 text-warning animate-pulse" />}
                          {format(new Date(m.meeting_date + 'T00:00:00'), 'dd/MM/yyyy')}
                        </span>
                        <Badge variant="default">Em Uso</Badge>
                      </div>
                      {m.theme && <p className="text-xs text-primary font-medium">Tema: {m.theme}</p>}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-white" /> {m.start_time} - {m.end_time}</span>
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {m.location}</span>
                      </div>
                      {m.ramal && <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" /> Ramal: {m.ramal}</p>}
                      <div className="flex flex-wrap gap-1">
                        {m.equipment.map(eq => <Badge key={eq} variant="outline" className="text-xs">{getEquipmentLabel(eq)}</Badge>)}
                      </div>
                      {m.link_platform && (
                        <p className="text-xs text-muted-foreground">
                          Plataforma: {m.link_platform.toUpperCase()}{m.link_creator && ` — Responsável: ${m.link_creator}`}
                        </p>
                      )}
                      {m.status === 'em_uso' && m.user_id === user?.id && (
                        <div className="flex gap-2 pt-2 border-t border-border">
                          <Button size="sm" variant="outline" onClick={() => openEditDialog(m)}><Edit className="w-3 h-3 mr-1" /> Editar</Button>
                          <Button size="sm" variant="warning" onClick={() => handleFinalize(m.id)}><CheckCircle className="w-3 h-3 mr-1" /> Finalizar Reunião</Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            {myMeetingsTotalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <Button variant="outline" size="sm" disabled={myMeetingsPage <= 1} onClick={() => setMyMeetingsPage(p => p - 1)}><ChevronLeft className="w-4 h-4" /></Button>
                {Array.from({ length: myMeetingsTotalPages }, (_, i) => i + 1).map(p => (
                  <Button key={p} variant={p === myMeetingsPage ? 'default' : 'outline'} size="sm" className="w-8 h-8 p-0" onClick={() => setMyMeetingsPage(p)}>{p}</Button>
                ))}
                <Button variant="outline" size="sm" disabled={myMeetingsPage >= myMeetingsTotalPages} onClick={() => setMyMeetingsPage(p => p + 1)}><ChevronRight className="w-4 h-4" /></Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Awaiting return meetings */}
      {myAwaiting.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning" />
            Reuniões Finalizadas em Aguardo
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myAwaiting.map(m => (
              <Card key={m.id} className="border-border bg-warning/5 border-warning/30">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{format(new Date(m.meeting_date + 'T00:00:00'), 'dd/MM/yyyy')}</span>
                    <Badge variant="secondary" className="bg-warning/20 text-warning">Aguardando Devolução</Badge>
                  </div>
                  {m.theme && <p className="text-xs text-primary font-medium">Tema: {m.theme}</p>}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-white" /> {m.start_time} - {m.end_time}</span>
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {m.location}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {m.equipment.map(eq => <Badge key={eq} variant="outline" className="text-xs">{getEquipmentLabel(eq)}</Badge>)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Finalized meetings history */}
      {myHistory.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <History className="w-5 h-5 text-muted-foreground" />
            Reuniões Finalizadas
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myHistory.map(m => (
              <Card key={m.id} className="border-border bg-muted/20 opacity-70">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{format(new Date(m.meeting_date + 'T00:00:00'), 'dd/MM/yyyy')}</span>
                    <Badge variant="secondary">Devolvido</Badge>
                  </div>
                  {m.theme && <p className="text-xs text-primary font-medium">Tema: {m.theme}</p>}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-white" /> {m.start_time} - {m.end_time}</span>
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {m.location}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {m.equipment.map(eq => <Badge key={eq} variant="outline" className="text-xs">{getEquipmentLabel(eq)}</Badge>)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* All active meetings (only fixed locations) */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-primary" />
          Reuniões em Aberto ({allActiveMeetings.length})
        </h2>
        {allActiveMeetings.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nenhuma reunião em aberto no momento.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allActiveMeetings.map(m => {
              const overdue = isMeetingOverdue(m);
              return (
                <Card key={m.id} className={cn('border-border transition-all', overdue ? 'bg-warning/10 border-warning/50' : 'bg-card glow-card')}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground flex items-center gap-2">
                        {overdue && <AlertTriangle className="w-4 h-4 text-warning animate-pulse" />}
                        {format(new Date(m.meeting_date + 'T00:00:00'), 'dd/MM/yyyy')}
                      </span>
                      <Badge variant="default">Em Uso</Badge>
                    </div>
                    {m.theme && <p className="text-xs text-primary font-medium">Tema: {m.theme}</p>}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-white" /> {m.start_time} - {m.end_time}</span>
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {m.location}</span>
                    </div>
                    {m.user_name && <p className="text-xs text-muted-foreground">Solicitante: {m.user_name}</p>}
                    <div className="flex flex-wrap gap-1">
                      {m.equipment.map(eq => <Badge key={eq} variant="outline" className="text-xs">{getEquipmentLabel(eq)}</Badge>)}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

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
              <div className="space-y-2">
                <Label>Início</Label>
                <Input type="time" value={editStartTime} onChange={(e) => setEditStartTime(e.target.value)} min="07:30" max="17:00" />
              </div>
              <div className="space-y-2">
                <Label>Término</Label>
                <Input type="time" value={editEndTime} onChange={(e) => setEditEndTime(e.target.value)} min="07:30" max="17:00" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Local</Label>
              <Select value={editLocation} onValueChange={setEditLocation}>
                <SelectTrigger><SelectValue placeholder="Local" /></SelectTrigger>
                <SelectContent>
                  {LOCATIONS.map(loc => {
                    const isFixed = FIXED_LOCATIONS.includes(loc);
                    const available = isFixed && editDate && editStartTime && editEndTime
                      ? isLocationAvailable(loc, editStartTime, editEndTime, editDate, editingMeeting?.id)
                      : true;
                    return (
                      <SelectItem key={loc} value={loc} disabled={isFixed && !available}>
                        <span className="flex items-center gap-2">{loc}{isFixed && !available && <span className="text-destructive text-xs font-semibold">Indisponível</span>}</span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleEditSave} className="w-full">Salvar Alterações</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReuniaoUsuario;
