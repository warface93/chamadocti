export const TICKET_CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: 'internet', label: 'Internet' },
  { value: 'computador', label: 'Computador' },
  { value: 'telefone', label: 'Telefone' },
  { value: 'conta', label: 'Login/Senha' },
  { value: 'sistema', label: 'Sistema' },
  { value: 'outros', label: 'Outros' },
  { value: 'software', label: 'Software' },
  { value: 'hardware', label: 'Hardware' },
  { value: 'network', label: 'Rede' },
];

export const TICKET_STATUS_LABELS: Record<string, string> = {
  open: 'Aberto', in_progress: 'Em Andamento', resolved: 'Resolvido', critical: 'Crítico', pending: 'Pendente',
};

export const categoryLabel = (v: string) => TICKET_CATEGORY_OPTIONS.find(o => o.value === v)?.label || v;

export interface HistoryEntry { action: string; old_value: string | null; new_value: string | null }

/** Builds one history entry per field that actually changed. */
export function diffTicket(
  before: Record<string, any>,
  after: Record<string, any>,
): HistoryEntry[] {
  const fields: { key: string; action: string; fmt?: (v: string) => string }[] = [
    { key: 'status', action: 'Status alterado', fmt: v => TICKET_STATUS_LABELS[v] || v },
    { key: 'category', action: 'Categoria alterada', fmt: categoryLabel },
    { key: 'title', action: 'Título editado' },
    { key: 'description', action: 'Descrição editada' },
    { key: 'attachment_url', action: 'Anexo alterado' },
    { key: 'resolution_note', action: 'Detalhes da resolução' },
  ];
  const out: HistoryEntry[] = [];
  for (const f of fields) {
    if (!(f.key in after)) continue;
    const a = before[f.key] ?? null;
    const b = after[f.key] ?? null;
    if ((a || null) === (b || null)) continue;
    const fmt = (v: any) => (v == null || v === '' ? null : f.fmt ? f.fmt(String(v)) : String(v));
    out.push({ action: f.action, old_value: fmt(a), new_value: fmt(b) });
  }
  return out;
}
