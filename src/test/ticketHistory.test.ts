import { describe, it, expect } from 'vitest';
import { diffTicket } from '@/lib/ticketHistory';

describe('ticket history', () => {
  it('records category change with labels', () => {
    expect(diffTicket({ category: 'sistema' }, { category: 'conta' })).toEqual([
      { action: 'Categoria alterada', old_value: 'Sistema', new_value: 'Login/Senha' },
    ]);
  });
  it('records nothing when values are unchanged', () => {
    expect(diffTicket({ title: 'A', status: 'open' }, { title: 'A', status: 'open' })).toEqual([]);
  });
  it('records status and resolution note together', () => {
    const r = diffTicket({ status: 'open', resolution_note: null }, { status: 'resolved', resolution_note: 'Troca do cabo' });
    expect(r.map(e => e.action)).toEqual(['Status alterado', 'Detalhes da resolução']);
    expect(r[0].new_value).toBe('Resolvido');
  });
});
