import { describe, it, expect } from 'vitest';
import { ADMIN_TIME_SLOTS, canScheduleHours } from '@/lib/meetingTime';

describe('horários administrativos e comuns na criação e edição', () => {
  it('permite o intervalo padrão 07:30–17:00 sem justificativa', () => expect(canScheduleHours('07:30', '17:00', false, '')).toBe(true));
  it('impede usuário comum de agendar à noite mesmo com justificativa', () => expect(canScheduleHours('20:00', '21:00', false, 'Evento')).toBe(false));
  it('permite administrador à noite com justificativa', () => expect(canScheduleHours('20:00', '21:00', true, 'Evento')).toBe(true));
  it('permite administrador de madrugada com justificativa', () => expect(canScheduleHours('01:00', '02:00', true, 'Manutenção')).toBe(true));
  it('impede justificativa vazia em horário excepcional', () => expect(canScheduleHours('01:00', '02:00', true, '  ')).toBe(false));
  it('impede término anterior ao início', () => expect(canScheduleHours('20:00', '19:00', true, 'Evento')).toBe(false));
  it('mantém o horário excepcional ao editar com justificativa preservada', () => expect(canScheduleHours('21:15', '22:15', true, 'Justificativa existente')).toBe(true));
  it('disponibiliza meia-noite e 23:30 ao administrador', () => { expect(ADMIN_TIME_SLOTS[0]).toBe('00:00'); expect(ADMIN_TIME_SLOTS.at(-1)).toBe('23:30'); });
});