import { useEquipmentAvailability } from '@/hooks/useEquipmentAvailability';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Lock } from 'lucide-react';
import { EQUIPMENT_OPTIONS, ADDABLE_EQUIPMENT, canAddEquipment } from '@/lib/meetingOptions';

interface Props {
  linked: string[];
  theme: string; onTheme: (v: string) => void;
  ramal: string; onRamal: (v: string) => void;
  added: string[]; onAdded: (v: string[]) => void;
}

/** Theme, ramal and add-only equipment fields shared by user and admin edit dialogs. */
const MeetingEditExtras = ({ linked, theme, onTheme, ramal, onRamal, added, onAdded }: Props) => {
  const { available } = useEquipmentAvailability();

  return (
    <>
      <div className="space-y-2"><Label htmlFor="edit-theme">Tema</Label><Input id="edit-theme" value={theme} onChange={e => onTheme(e.target.value)} placeholder="Tema da reunião" /></div>
      <div className="space-y-2"><Label htmlFor="edit-ramal">Ramal</Label><Input id="edit-ramal" value={ramal} onChange={e => onRamal(e.target.value)} placeholder="Ramal do solicitante" /></div>
      <div className="space-y-2">
        <Label>Equipamentos</Label>
        <p className="text-xs text-muted-foreground">Os já vinculados não podem ser removidos aqui; use "Solicitar devolução" nos detalhes da reunião.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {EQUIPMENT_OPTIONS.filter(o => ADDABLE_EQUIPMENT.includes(o.id)).map(o => {
            const isLinked = linked.includes(o.id);
            const qty = available[o.id] ?? 0;
            const enabled = canAddEquipment(o.id, linked, o.id === 'link_reuniao' ? 1 : qty);
            return (
              <label key={o.id} className="flex items-center gap-2 rounded-md border border-border p-2 text-sm">
                <Checkbox checked={isLinked || added.includes(o.id)} disabled={!enabled}
                  onCheckedChange={c => onAdded(c ? [...added, o.id] : added.filter(i => i !== o.id))} />
                <span className="flex-1">{o.label}</span>
                {isLinked ? <Lock className="w-3 h-3 text-muted-foreground" aria-label="Vinculado" />
                  : o.id !== 'link_reuniao' && <span className={qty > 0 ? 'text-xs text-muted-foreground' : 'text-xs text-destructive'}>{qty > 0 ? `${qty} disp.` : 'Indisponível'}</span>}
              </label>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default MeetingEditExtras;
