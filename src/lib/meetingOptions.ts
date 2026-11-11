export const EQUIPMENT_OPTIONS = [
  { id: 'sem_equipamentos', label: 'Sem Equipamentos' },
  { id: 'notebook', label: 'Notebook' },
  { id: 'webcam', label: 'Webcam' },
  { id: 'microfone', label: 'Microfone' },
  { id: 'link_reuniao', label: 'Link de Reunião' },
  { id: 'caixa_som', label: 'Caixa de Som' },
  { id: 'fone_headset', label: 'Fone Headset' },
  { id: 'caixinha_som', label: 'Caixinha de Som' },
  { id: 'passador_slider', label: 'Passador Slider' },
];

export const PHYSICAL_EQUIPMENT = EQUIPMENT_OPTIONS.filter(o => !['sem_equipamentos', 'link_reuniao'].includes(o.id));

export function equipmentLabel(id: string): string {
  return EQUIPMENT_OPTIONS.find(o => o.id === id)?.label || id;
}

export function toggleEquipment(selected: string[], id: string): string[] {
  if (id === 'sem_equipamentos') return selected.includes(id) ? [] : [id];
  const others = selected.filter(item => item !== 'sem_equipamentos');
  return others.includes(id) ? others.filter(item => item !== id) : [...others, id];
}

export function locationDescription(location: string, description: string): string | null {
  return location === 'Outro Local' ? description.trim() || null : null;
}
/** Equipment ids that can be ADDED while editing: already linked items stay locked and are never removable. */
export const ADDABLE_EQUIPMENT = EQUIPMENT_OPTIONS.filter(o => o.id !== 'sem_equipamentos').map(o => o.id);

export function mergeEditEquipment(linked: string[], added: string[]): string[] {
  const extra = added.filter(id => ADDABLE_EQUIPMENT.includes(id) && !linked.includes(id));
  return [...new Set(extra)];
}

export function canAddEquipment(id: string, linked: string[], available: number): boolean {
  if (!ADDABLE_EQUIPMENT.includes(id) || linked.includes(id)) return false;
  return id === 'link_reuniao' || available > 0;
}
