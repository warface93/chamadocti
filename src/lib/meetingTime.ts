export const MIN_ADVANCE_MINUTES = 10;

export const MIN_ADVANCE_MESSAGE =
  'Não foi possível realizar o agendamento. Para garantir a organização e a preparação dos recursos necessários, as reuniões devem ser solicitadas com pelo menos 10 minutos de antecedência. Solicitações feitas em um prazo menor podem não permitir que a equipe de TI prepare os equipamentos e atenda à demanda a tempo. Por favor, escolha um horário posterior. Agradecemos a compreensão.';

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
