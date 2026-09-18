import { Money, sumMoney } from '../accounting/money';
export type DashboardRow = { ledgerId: string; projectId?: string|null; assetType: 'FIAT'|'CRYPTO'; bucket: 'BALANCE'|'SPOT'|'FUTURES'|'INVESTMENT'|'INCOME'|'EXPENSE'|'FEE'; usdValue: Money };
export function aggregateDashboard(rows: DashboardRow[], filter: { ledgerId?: string; projectId?: string }) {
  const selected = rows.filter(r => (!filter.ledgerId || r.ledgerId === filter.ledgerId) && (!filter.projectId || r.projectId === filter.projectId));
  const sum = (bucket: DashboardRow['bucket']) => sumMoney(selected.filter(r => r.bucket === bucket).map(r => r.usdValue));
  const fiat = sumMoney(selected.filter(r => r.bucket === 'BALANCE' && r.assetType === 'FIAT').map(r => r.usdValue));
  const crypto = sumMoney(selected.filter(r => r.bucket === 'BALANCE' && r.assetType === 'CRYPTO').map(r => r.usdValue));
  const spot = sum('SPOT'), futures = sum('FUTURES'), investments = sum('INVESTMENT'), income = sum('INCOME').abs(), expenses = sum('EXPENSE').abs(), fees = sum('FEE').abs();
  return { fiat, crypto, spot, futures, investments, income, expenses, fees,
    totalEquity: fiat.plus(crypto).plus(spot).plus(futures).plus(investments), netResult: income.minus(expenses).minus(fees) };
}
