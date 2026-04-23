// AUD processing fee: 2.9% + A$0.30, returned in cents
export function processingFee(amountAud: number): number {
  return Math.round(amountAud * 0.029 * 100 + 30);
}
