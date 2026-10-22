import { describe, it, expect } from 'vitest';
import { isPastTime, needsExceptionalJustification } from '@/lib/meetingTime';

const at = (h: number, m: number) => {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
};

describe('agendamento excepcional do administrador', () => {
  it('exige justificativa com 5 minutos de antecedência (12:20 → 12:25)', () => {
    expect(needsExceptionalJustification('12:25', '13:00', at(12, 20), at(12, 20))).toBe(true);
  });

  it('não exige justificativa com exatamente 10 minutos de antecedência em horário padrão', () => {
    expect(needsExceptionalJustification('12:30', '13:00', at(12, 20), at(12, 20))).toBe(false);
  });

  it('exige justificativa fora do horário padrão (antes das 07:30)', () => {
    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);
    expect(needsExceptionalJustification('06:00', '07:00', amanha)).toBe(true);
  });

  it('exige justificativa fora do horário padrão (depois das 17:00)', () => {
    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);
    expect(needsExceptionalJustification('18:00', '19:00', amanha)).toBe(true);
  });

  it('não exige justificativa em horário padrão com antecedência suficiente', () => {
    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);
    expect(needsExceptionalJustification('10:00', '11:00', amanha)).toBe(false);
  });
});

describe('bloqueio de horários passados (vale para todos)', () => {
  it('bloqueia horário que já passou no mesmo dia', () => {
    expect(isPastTime('10:00', at(11, 0), at(11, 0))).toBe(true);
  });

  it('bloqueia datas passadas independente do horário', () => {
    const ontem = new Date();
    ontem.setDate(ontem.getDate() - 1);
    expect(isPastTime('14:00', ontem)).toBe(true);
  });

  it('permite o horário atual (ainda não passou)', () => {
    expect(isPastTime('11:00', at(11, 0), at(11, 0))).toBe(false);
  });

  it('permite horário futuro no mesmo dia', () => {
    expect(isPastTime('11:05', at(11, 0), at(11, 0))).toBe(false);
  });
});
