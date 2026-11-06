import { describe, it, expect } from 'vitest';
import { mergeEditEquipment, canAddEquipment } from '@/lib/meetingOptions';

describe('edição de reunião: equipamentos só podem ser acrescentados', () => {
  const linked = ['notebook', 'microfone'];
  it('acrescenta a Webcam mantendo Notebook e Microfone', () => expect(mergeEditEquipment(linked, ['webcam'])).toEqual(['webcam']));
  it('não duplica equipamento já vinculado', () => expect(mergeEditEquipment(linked, ['notebook', 'webcam', 'webcam'])).toEqual(['webcam']));
  it('não permite remarcar o Notebook já vinculado', () => expect(canAddEquipment('notebook', linked, 5)).toBe(false));
  it('impede acrescentar equipamento sem estoque', () => expect(canAddEquipment('webcam', linked, 0)).toBe(false));
  it('permite acrescentar equipamento disponível', () => expect(canAddEquipment('webcam', linked, 3)).toBe(true));
  it('link de reunião não depende de estoque', () => expect(canAddEquipment('link_reuniao', linked, 0)).toBe(true));
});
