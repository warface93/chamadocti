export function isValidQuantity(value: string | number, maximum: number): boolean {
  const quantity = typeof value === 'number' ? value : Number(value);
  return Number.isInteger(quantity) && quantity > 0 && quantity <= maximum;
}