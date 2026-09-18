import { Movement, totals } from '../accounting/money';
export type ProjectMovement = Movement;
export function projectMetrics(rows: ProjectMovement[]) {
  const m = totals(rows);
  return { income: m.income, expenses: m.expense, investments: m.invested, returns: m.returned,
    fees: m.commissions, operatingResult: m.result, netCashFlow: m.netCashFlow, investmentBalance: m.investmentBalance };
}
