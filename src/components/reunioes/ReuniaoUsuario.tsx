import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Send, Clock, MapPin, Monitor } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const TIME_SLOTS = [
  '07:30', '08:30', '09:30', '10:30', '11:30',
  '12:30', '13:30', '14:30', '15:30', '16:30', '17:30',
];

const LOCATIONS = ['3° Andar', '2° Andar', 'Auditório'];

const EQUIPMENT_OPTIONS = [
  { id: 'notebook', label: 'Notebook' },
  { id: 'webcam', label: 'Webcam' },
  { id: 'microfone', label: 'Microfone' },
  { id: 'link_reuniao', label: 'Link de Reunião' },
  { id: 'caixa_som', label: 'Caixa de Som' },
  { id: 'outros', label: 'Outros' },
];

interface ExistingMeeting {
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
  created_at: string;
  equipment: string[];
}

const ReuniaoUsuario = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [date, setDate] = useState<Date>();
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [otherDescription, setOtherDescription] = useState('');
  const [existingMeetings, setExistingMeetings] = useState<ExistingMeeting[]>([]);
  const [myMeetings, setMyMeetings] = useState<UserMeeting[]>([]);
  const [loading, setLoading] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  useEffect(() => {
    fetchExistingMeetings();
    fetchMyMeetings();
  }, []);

  const fetchExistingMeetings = async () => {
    const { data } = await supabase
      .from('meetings')
      .select('meeting_date, start_time, end_time, location');
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
      const enriched: UserMeeting[] = [];
      for (const m of meetings) {
        const { data: eqData } = await supabase
          .from('meeting_equipment')
          .select('equipment')
          .eq('meeting_id', m.id);
        enriched.push({
          ...m,
          equipment: eqData?.map(e => e.equipment) || [],
        });
      }
      setMyMeetings(enriched);
    }
  };

  // Check if a time slot is taken for a given date and location
  const isTimeSlotTaken = (time: string, forLocation: string) => {
    if (!date) return false;
    const dateStr = format(date, 'yyyy-MM-dd');
    return existingMeetings.some(
      m => m.meeting_date === dateStr && m.location === forLocation &&
        time >= m.start_time && time < m.end_time
    );
  };

  // Check if location is fully booked for selected time range
  const isLocationAvailable = (loc: string) => {
    if (!date || !startTime || !endTime) return true;
    const dateStr = format(date, 'yyyy-MM-dd');
    return !existingMeetings.some(
      m => m.meeting_date === dateStr && m.location === loc &&
        ((startTime >= m.start_time && startTime < m.end_time) ||
         (endTime > m.start_time && endTime <= m.end_time) ||
         (startTime <= m.start_time && endTime >= m.end_time))
    );
  };

  const handleEquipmentToggle = (equipmentId: string) => {
    setSelectedEquipment(prev =>
      prev.includes(equipmentId)
        ? prev.filter(e => e !== equipmentId)
        : [...prev, equipmentId]
    );
    if (equipmentId === 'outros' && selectedEquipment.includes('outros')) {
      setOtherDescription('');
    }
  };

  const handleSubmit = async () => {
    if (!user || !date || !startTime || !endTime || !location) {
      toast({ title: 'Preencha todos os campos obrigatórios', variant: 'destructive' });
      return;
    }

    if (startTime >= endTime) {
      toast({ title: 'Horário de término deve ser após o início', variant: 'destructive' });
      return;
    }

    if (selectedEquipment.length === 0) {
      toast({ title: 'Selecione pelo menos um equipamento', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { data: meeting, error } = await supabase.from('meetings').insert({
        user_id: user.id,
        meeting_date: format(date, 'yyyy-MM-dd'),
        start_time: startTime,
        end_time: endTime,
        location,
        other_description: selectedEquipment.includes('outros') ? otherDescription : null,
      }).select().single();

      if (error) throw error;

      const equipmentRows = selectedEquipment.map(eq => ({
        meeting_id: meeting.id,
        equipment: eq,
      }));

      const { error: eqError } = await supabase.from('meeting_equipment').insert(equipmentRows);
      if (eqError) throw eqError;

      toast({ title: 'Solicitação enviada com sucesso!' });
      setDate(undefined);
      setStartTime('');
      setEndTime('');
      setLocation('');
      setSelectedEquipment([]);
      setOtherDescription('');
      fetchExistingMeetings();
      fetchMyMeetings();
    } catch (err: any) {
      toast({ title: 'Erro ao enviar solicitação', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const getEquipmentLabel = (id: string) =>
    EQUIPMENT_OPTIONS.find(e => e.id === id)?.label || id;

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
          {/* Date */}
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
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => { setDate(d); setCalendarOpen(false); }}
                    disabled={(d) => d < new Date(new Date().setHours(0,0,0,0))}
                    locale={ptBR}
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Start Time */}
            <div className="space-y-2">
              <Label>Horário Início</Label>
              <Select value={startTime} onValueChange={setStartTime}>
                <SelectTrigger>
                  <SelectValue placeholder="Início" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_SLOTS.map(t => {
                    const taken = location ? isTimeSlotTaken(t, location) : false;
                    return (
                      <SelectItem key={t} value={t} disabled={taken}>
                        <span className="flex items-center gap-2">
                          {t}
                          {taken && <span className="text-destructive text-xs">Indisponível</span>}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* End Time */}
            <div className="space-y-2">
              <Label>Horário Término</Label>
              <Select value={endTime} onValueChange={setEndTime}>
                <SelectTrigger>
                  <SelectValue placeholder="Término" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_SLOTS.map(t => {
                    const taken = location ? isTimeSlotTaken(t, location) : false;
                    return (
                      <SelectItem key={t} value={t} disabled={taken || (!!startTime && t <= startTime)}>
                        <span className="flex items-center gap-2">
                          {t}
                          {taken && <span className="text-destructive text-xs">Indisponível</span>}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label>Local da Reunião</Label>
              <Select value={location} onValueChange={setLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="Local" />
                </SelectTrigger>
                <SelectContent>
                  {LOCATIONS.map(loc => {
                    const available = isLocationAvailable(loc);
                    return (
                      <SelectItem key={loc} value={loc} disabled={!available}>
                        <span className="flex items-center gap-2">
                          {loc}
                          {!available && <span className="text-destructive text-xs">Indisponível</span>}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
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
                  <Checkbox
                    id={eq.id}
                    checked={selectedEquipment.includes(eq.id)}
                    onCheckedChange={() => handleEquipmentToggle(eq.id)}
                  />
                  <label htmlFor={eq.id} className="text-sm font-medium text-foreground cursor-pointer">
                    {eq.label}
                  </label>
                </div>
              ))}
            </div>
            {selectedEquipment.includes('outros') && (
              <Textarea
                placeholder="Descreva o equipamento necessário..."
                value={otherDescription}
                onChange={(e) => setOtherDescription(e.target.value)}
                className="mt-2"
              />
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myMeetings.map(m => (
              <Card key={m.id} className={cn(
                'border-border transition-all',
                m.status === 'em_uso' ? 'bg-card glow-card' : 'bg-muted/30 opacity-60'
              )}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">
                      {format(new Date(m.meeting_date + 'T00:00:00'), 'dd/MM/yyyy')}
                    </span>
                    <Badge variant={m.status === 'em_uso' ? 'default' : 'secondary'}>
                      {m.status === 'em_uso' ? 'Em Uso' : 'Devolvido'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {m.start_time} - {m.end_time}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {m.location}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {m.equipment.map(eq => (
                      <Badge key={eq} variant="outline" className="text-xs">
                        {getEquipmentLabel(eq)}
                      </Badge>
                    ))}
                  </div>
                  {m.other_description && (
                    <p className="text-xs text-muted-foreground">Outros: {m.other_description}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReuniaoUsuario;
