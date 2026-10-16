import { describe, it, expect } from 'vitest';
import { violatesMinAdvance, MIN_ADVANCE_MINUTES } from '@/lib/meetingTime';

const at = (h: number, m: number) => {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
};

describe('antecedência mínima de 10 minutos', () => {
  it('bloqueia agendamento com 5 minutos de antecedência (12:20 → 12:25)', () => {
    expect(violatesMinAdvance('12:25', at(12, 20), at(12, 20))).toBe(true);
  });

  it('permite agendamento com exatamente 10 minutos de antecedência (12:20 → 12:30)', () => {
    expect(violatesMinAdvance('12:30', at(12, 20), at(12, 20))).toBe(false);
  });

  it('bloqueia horário que já passou no mesmo dia', () => {
    expect(violatesMinAdvance('10:00', at(11, 0), at(11, 0))).toBe(true);
  });

  it('bloqueia datas passadas independente do horário', () => {
    const ontem = new Date();
    ontem.setDate(ontem.getDate() - 1);
    expect(violatesMinAdvance('14:00', ontem)).toBe(true);
  });

  it('permite qualquer horário válido em data futura', () => {
    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);
    expect(violatesMinAdvance('07:30', amanha)).toBe(false);
  });

  it('a constante de antecedência é 10 minutos', () => {
    expect(MIN_ADVANCE_MINUTES).toBe(10);
  });
});
