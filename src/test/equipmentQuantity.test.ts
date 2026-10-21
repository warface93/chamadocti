import { describe, it, expect } from 'vitest';
import { isValidQuantity } from '@/lib/equipmentQuantity';

describe('quantidades de empréstimo e devolução', () => {
  it('permite emprestar 3 unidades quando há 4 disponíveis', () => expect(isValidQuantity('3', 4)).toBe(true));
  it('impede quantidade zero', () => expect(isValidQuantity('0', 4)).toBe(false));
  it('impede quantidade negativa', () => expect(isValidQuantity('-1', 4)).toBe(false));
  it('impede ultrapassar o estoque', () => expect(isValidQuantity('5', 4)).toBe(false));
  it('impede unidades fracionadas', () => expect(isValidQuantity('1.5', 4)).toBe(false));
  it('permite devolução parcial de 1 das 3 unidades', () => expect(isValidQuantity('1', 3)).toBe(true));
  it('permite devolução total das 3 unidades', () => expect(isValidQuantity('3', 3)).toBe(true));
  it('impede devolver mais do que as 3 unidades emprestadas', () => expect(isValidQuantity('4', 3)).toBe(false));
  it('impede entrada vazia', () => expect(isValidQuantity('', 3)).toBe(false));
});