export const EQUIPMENT_OPTIONS = [
  { id: 'sem_equipamentos', label: 'Sem Equipamentos' },
  { id: 'notebook', label: 'Notebook' },
  { id: 'webcam', label: 'Webcam' },
  { id: 'microfone', label: 'Microfone' },
  { id: 'link_reuniao', label: 'Link de Reunião' },
  { id: 'caixa_som', label: 'Caixa de Som' },
];

export function toggleEquipment(selected: string[], id: string): string[] {
  if (id === 'sem_equipamentos') return selected.includes(id) ? [] : [id];
  const others = selected.filter(item => item !== 'sem_equipamentos');
  return others.includes(id) ? others.filter(item => item !== id) : [...others, id];
}

export function locationDescription(location: string, description: string): string | null {
  return location === 'Outro Local' ? description.trim() || null : null;
}