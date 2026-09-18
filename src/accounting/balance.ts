import { Money, Movement, sumMoney, totals } from './money';
export type PostedMovement = Movement & { amount: Money; assetCode: string };
// Amounts are already signed. Never apply a debit/credit sign a second time.
export function calculateBalance(openingBalance: Money, movements: PostedMovement[]) {
  return sumMoney([openingBalance, ...movements.map(m => m.amount)]);
}
export function calculateProjectTotals(projectId: string, movements: PostedMovement[]) {
  const m = totals(movements.filter(x => x.projectId === projectId));
  return { ...m, operatingResult: m.result };
}
