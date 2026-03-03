import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CalendarIcon, Clock, MapPin, User, Package, Save, Filter } from 'lucide-react';
import { format } from 'date-fns';
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
  created_at: string;
  user_name: string;
  equipment: string[];
  admin_items: AdminItem[];
}

interface AdminItem {
  id: string;
  meeting_id: string;
  description: string;
  quantity: number;
  tombamento: string | null;
}

const EQUIPMENT_LABELS: Record<string, string> = {
  notebook: 'Notebook',
  webcam: 'Webcam',
  microfone: 'Microfone',
  link_reuniao: 'Link de Reunião',
  caixa_som: 'Caixa de Som',
  outros: 'Outros',
};

const ReuniaoAdmin = () => {
  const { toast } = useToast();
  const [meetings, setMeetings] = useState<MeetingWithDetails[]>([]);
  const [filter, setFilter] = useState<string>('todas');
  const [selectedMeeting, setSelectedMeeting] = useState<MeetingWithDetails | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemQty, setNewItemQty] = useState('1');
  const [newItemTomb, setNewItemTomb] = useState('');
  const [savingStatus, setSavingStatus] = useState(false);

  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetings = async () => {
    const { data: meetingsData } = await supabase
      .from('meetings')
      .select('*')
      .order('created_at', { ascending: false });

    if (!meetingsData) return;

    const enriched: MeetingWithDetails[] = [];
    for (const m of meetingsData) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', m.user_id)
        .maybeSingle();

      const { data: eqData } = await supabase
        .from('meeting_equipment')
        .select('equipment')
        .eq('meeting_id', m.id);

      const { data: adminItems } = await supabase
        .from('meeting_admin_items')
        .select('*')
        .eq('meeting_id', m.id);

      enriched.push({
        ...m,
        user_name: profile?.name || 'Desconhecido',
        equipment: eqData?.map(e => e.equipment) || [],
        admin_items: (adminItems as AdminItem[]) || [],
      });
    }
    setMeetings(enriched);
  };

  const filteredMeetings = meetings.filter(m => {
    if (filter === 'em_uso') return m.status === 'em_uso';
    if (filter === 'devolvido') return m.status === 'devolvido';
    return true;
  });

  const handleStatusChange = async (meetingId: string, newStatus: string) => {
    setSavingStatus(true);
    const { error } = await supabase
      .from('meetings')
      .update({ status: newStatus })
      .eq('id', meetingId);

    if (error) {
      toast({ title: 'Erro ao atualizar status', variant: 'destructive' });
    } else {
      toast({ title: 'Status atualizado com sucesso!' });
      fetchMeetings();
      if (selectedMeeting?.id === meetingId) {
        setSelectedMeeting(prev => prev ? { ...prev, status: newStatus } : null);
      }
    }
    setSavingStatus(false);
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
      setNewItemDesc('');
      setNewItemQty('1');
      setNewItemTomb('');
      fetchMeetings();
      // Refresh selected meeting
      const { data: items } = await supabase
        .from('meeting_admin_items')
        .select('*')
        .eq('meeting_id', selectedMeeting.id);
      setSelectedMeeting(prev => prev ? { ...prev, admin_items: (items as AdminItem[]) || [] } : null);
    }
  };

  const openDetail = (meeting: MeetingWithDetails) => {
    setSelectedMeeting(meeting);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Filter */}
      <div className="flex items-center gap-3">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <div className="flex gap-2">
          {[
            { value: 'todas', label: 'Todas Reuniões' },
            { value: 'em_uso', label: 'Em Uso' },
            { value: 'devolvido', label: 'Devolvido' },
          ].map(f => (
            <Button
              key={f.value}
              variant={filter === f.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Meetings grid */}
      {filteredMeetings.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nenhuma reunião encontrada.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMeetings.map(m => (
            <Card
              key={m.id}
              className={cn(
                'border-border cursor-pointer transition-all hover:-translate-y-1',
                m.status === 'em_uso'
                  ? 'bg-card glow-card'
                  : 'bg-muted/20 opacity-50'
              )}
              onClick={() => openDetail(m)}
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">
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
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <User className="w-3 h-3" />
                  <span>{m.user_name}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {m.equipment.map(eq => (
                    <Badge key={eq} variant="outline" className="text-xs">
                      {EQUIPMENT_LABELS[eq] || eq}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Reunião</DialogTitle>
          </DialogHeader>
          {selectedMeeting && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Data:</span>
                  <p className="font-medium text-foreground">
                    {format(new Date(selectedMeeting.meeting_date + 'T00:00:00'), 'dd/MM/yyyy')}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Horário:</span>
                  <p className="font-medium text-foreground">{selectedMeeting.start_time} - {selectedMeeting.end_time}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Local:</span>
                  <p className="font-medium text-foreground">{selectedMeeting.location}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Solicitante:</span>
                  <p className="font-medium text-foreground">{selectedMeeting.user_name}</p>
                </div>
              </div>

              <div>
                <span className="text-sm text-muted-foreground">Equipamentos solicitados:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedMeeting.equipment.map(eq => (
                    <Badge key={eq} variant="outline">{EQUIPMENT_LABELS[eq] || eq}</Badge>
                  ))}
                </div>
                {selectedMeeting.other_description && (
                  <p className="text-xs text-muted-foreground mt-1">Outros: {selectedMeeting.other_description}</p>
                )}
              </div>

              {/* Status control */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
                <Label className="text-sm">Status:</Label>
                <Select
                  value={selectedMeeting.status}
                  onValueChange={(v) => setSelectedMeeting(prev => prev ? { ...prev, status: v } : null)}
                >
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="em_uso">Em Uso</SelectItem>
                    <SelectItem value="devolvido">Devolvido</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  disabled={savingStatus}
                  onClick={() => handleStatusChange(selectedMeeting.id, selectedMeeting.status)}
                >
                  <Save className="w-4 h-4 mr-1" />
                  Salvar
                </Button>
              </div>

              {/* Admin equipment registration */}
              <div className="space-y-3 border-t border-border pt-4">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Package className="w-4 h-4 text-primary" />
                  Cadastrar Equipamento Emprestado
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Descrição</Label>
                    <Input
                      value={newItemDesc}
                      onChange={e => setNewItemDesc(e.target.value)}
                      placeholder="Ex: Notebook Dell"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Quantidade</Label>
                    <Input
                      type="number"
                      min="1"
                      value={newItemQty}
                      onChange={e => setNewItemQty(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Tombamento</Label>
                    <Input
                      value={newItemTomb}
                      onChange={e => setNewItemTomb(e.target.value)}
                      placeholder="Opcional"
                    />
                  </div>
                </div>
                <Button size="sm" onClick={handleAddItem} disabled={!newItemDesc.trim()}>
                  Adicionar
                </Button>
              </div>

              {/* Registered items */}
              {selectedMeeting.admin_items.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-foreground">Equipamentos Registrados</h4>
                  <div className="space-y-1">
                    {selectedMeeting.admin_items.map(item => (
                      <div key={item.id} className="flex items-center justify-between text-sm p-2 rounded bg-secondary/20">
                        <span className="text-foreground">{item.description} (x{item.quantity})</span>
                        {item.tombamento && (
                          <span className="text-xs text-muted-foreground">Tomb: {item.tombamento}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReuniaoAdmin;
