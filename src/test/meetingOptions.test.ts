import { describe, it, expect } from 'vitest';
import { EQUIPMENT_OPTIONS, toggleEquipment, locationDescription } from '@/lib/meetingOptions';
import { ADMIN_TIME_SLOTS, USER_TIME_SLOTS } from '@/lib/meetingTime';

describe('Sem Equipamentos', () => {
  it('é a primeira opção', () => expect(EQUIPMENT_OPTIONS[0].id).toBe('sem_equipamentos'));
  it('limpa os demais ao ser marcado', () =>
    expect(toggleEquipment(['notebook', 'webcam'], 'sem_equipamentos')).toEqual(['sem_equipamentos']));
  it('é desmarcado ao escolher um equipamento', () =>
    expect(toggleEquipment(['sem_equipamentos'], 'notebook')).toEqual(['notebook']));
});

describe('horários de 15 minutos', () => {
  it('usuário comum: 07:30 a 17:00', () => {
    expect(USER_TIME_SLOTS[0]).toBe('07:30');
    expect(USER_TIME_SLOTS.at(-1)).toBe('17:00');
    expect(USER_TIME_SLOTS).toContain('07:45');
    expect(USER_TIME_SLOTS).toHaveLength(39);
  });
  it('administrador: dia inteiro', () => {
    expect(ADMIN_TIME_SLOTS).toHaveLength(96);
    expect(ADMIN_TIME_SLOTS.at(-1)).toBe('23:45');
  });
});

describe('Outro Local', () => {
  it('guarda a descrição sem espaços extras', () =>
    expect(locationDescription('Outro Local', '  Sala 5 ')).toBe('Sala 5'));
  it('descrição vazia é inválida', () => expect(locationDescription('Outro Local', '   ')).toBeNull());
  it('outros locais não guardam descrição', () => expect(locationDescription('Auditório', 'x')).toBeNull());
});
