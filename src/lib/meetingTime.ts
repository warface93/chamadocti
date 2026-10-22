export const MIN_ADVANCE_MINUTES = 10;

export const MIN_ADVANCE_MESSAGE =
  'Não foi possível realizar o agendamento. Para garantir a organização e a preparação dos recursos necessários, as reuniões devem ser solicitadas com pelo menos 10 minutos de antecedência. Solicitações feitas em um prazo menor podem não permitir que a equipe de TI prepare os equipamentos e atenda à demanda a tempo. Por favor, escolha um horário posterior. Agradecemos a compreensão.';

export const STANDARD_START = '07:30';
export const STANDARD_END = '17:00';

export const ADMIN_TIME_SLOTS = Array.from({ length: 48 }, (_, index) =>
  `${String(Math.floor(index / 2)).padStart(2, '0')}:${index % 2 ? '30' : '00'}`
);

export function canScheduleHours(start: string, end: string, isAdmin: boolean, justification: string): boolean {
  const validTime = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
  if (!validTime.test(start) || !validTime.test(end) || end <= start) return false;
  return !isOutsideStandardHours(start, end) || (isAdmin && justification.trim().length > 0);
}

/** Retorna true quando o horário está fora do padrão 07:30–17:00 (exige justificativa do admin). */
export function isOutsideStandardHours(start: string, end: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end)) return false;
  return start < STANDARD_START || end > STANDARD_END;
}

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

/**
 * Retorna true quando o agendamento viola a antecedência mínima:
 * - data no passado, ou
 * - data de hoje com início a menos de MIN_ADVANCE_MINUTES do horário atual.
 */
export function violatesMinAdvance(
  time: string,
  date: Date | undefined,
  now: Date = new Date()
): boolean {
  if (!date || !/^\d{2}:\d{2}$/.test(time)) return false;

  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  if (dayStart < todayStart) return true;
  if (!isSameDay(date, now)) return false;

  const [h, m] = time.split(':').map(Number);
  const slot = new Date(now);
  slot.setHours(h, m, 0, 0);
  const minStart = new Date(now.getTime() + MIN_ADVANCE_MINUTES * 60_000);
  return slot < minStart;
}

/**
 * Retorna true quando o horário de início já passou (data passada ou
 * horário anterior ao atual no dia de hoje). Bloqueado para todos.
 */
export function isPastTime(
  time: string,
  date: Date | undefined,
  now: Date = new Date()
): boolean {
  if (!date || !/^\d{2}:\d{2}$/.test(time)) return false;

  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  if (dayStart < todayStart) return true;
  if (!isSameDay(date, now)) return false;

  const [h, m] = time.split(':').map(Number);
  const slot = new Date(now);
  slot.setHours(h, m, 0, 0);
  return slot < now;
}

/**
 * Agendamento excepcional (exige justificativa do administrador):
 * fora do horário padrão 07:30–17:00 OU com menos de 10 minutos de
 * antecedência (mas ainda não passado).
 */
export function needsExceptionalJustification(
  start: string,
  end: string,
  date: Date | undefined,
  now: Date = new Date()
): boolean {
  if (isOutsideStandardHours(start, end)) return true;
  return violatesMinAdvance(start, date, now) && !isPastTime(start, date, now);
}
