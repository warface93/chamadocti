import { describe, expect, it } from 'vitest';
import { EQUIPMENT_OPTIONS, PHYSICAL_EQUIPMENT, canAddEquipment, mergeEditEquipment, toggleEquipment } from '@/lib/meetingOptions';

describe('novos equipamentos integrados ao catálogo existente', () => {
  for (const [id, label] of [['fone_headset', 'Fone Headset'], ['caixinha_som', 'Caixinha de Som'], ['passador_slider', 'Passador Slider']]) {
    it(`${label}: seleção, estoque e edição`, () => {
      expect(PHYSICAL_EQUIPMENT.find(o => o.id === id)?.label).toBe(label);
      expect(toggleEquipment(['sem_equipamentos'], id)).toEqual([id]);
      expect(canAddEquipment(id, [], 0)).toBe(false);
      expect(canAddEquipment(id, [], 1)).toBe(true);
      expect(canAddEquipment(id, [id], 5)).toBe(false);
      expect(mergeEditEquipment(['notebook'], [id, id])).toEqual([id]);
    });
  }
  it('preserva as seis opções originais e distingue as duas caixas de som', () => {
    expect(EQUIPMENT_OPTIONS.slice(0, 6).map(o => o.label)).toEqual(['Sem Equipamentos', 'Notebook', 'Webcam', 'Microfone', 'Link de Reunião', 'Caixa de Som']);
    expect(EQUIPMENT_OPTIONS.find(o => o.label === 'Caixinha de Som')?.id).not.toBe('caixa_som');
  });
});