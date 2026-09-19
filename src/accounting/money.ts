import { Prisma } from '@prisma/client';

export const D = Prisma.Decimal;
D.set({ precision: 80, rounding: D.ROUND_HALF_UP });
export type Money = Prisma.Decimal | string | number;
export class InputError extends Error {}

export function decimal(value: unknown, fallback?: string): Prisma.Decimal {
  const raw = value == null || value === '' ? fallback : value;
  if (typeof raw !== 'string' && typeof raw !== 'number') throw new InputError('Некорректное число');
  let result: Prisma.Decimal;
  try { result = new D(raw); } catch { throw new InputError('Некорректное число'); }
  if (!result.isFinite() || result.abs().gte('100000000000000000000') || result.decimalPlaces() > 10) {
    throw new InputError('Число вне допустимой точности Decimal(30,10)');
  }
  return result;
}

export function usdRate(value: unknown, asset: string) {
  const rate = value == null || value === '' ? (asset === 'USD' ? new D(1) : null) : decimal(value);
  if (rate && rate.lte(0)) throw new InputError('Курс USD должен быть положительным');
  if (asset === 'USD' && rate && !rate.eq(1)) throw new InputError('Курс USD к USD должен быть 1');
  return rate;
}

export function dateValue(value: unknown): Date {
  if (value == null || value === '') return new Date();
  if (typeof value !== 'string') throw new InputError('Некорректная дата');
  const local = /^\d{4}-\d{2}-\d{2}$/.test(value) ? value+'T00:00:00+05:00' : /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?$/.test(value) ? value+'+05:00' : value;
  const date = new Date(local);
  if (!Number.isFinite(date.getTime())) throw new InputError('Некорректная дата');
  return date;
}

// Asia/Dushanbe calendar days (UTC+05:00); the upper bound is exclusive.
export function dateFilter(params: URLSearchParams): Prisma.DateTimeFilter | undefined {
  const from = params.get('from'), to = params.get('to');
  const day = (v: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new InputError('Дата фильтра: YYYY-MM-DD');
    const d = new Date(v + 'T00:00:00.000Z');
    if (!Number.isFinite(d.getTime()) || d.toISOString().slice(0, 10) !== v) throw new InputError('Некорректная дата фильтра');
    return new Date(d.getTime()-5*60*60*1000);
  };
  const gte = from ? day(from) : undefined;
  const end = to ? day(to) : undefined;
  if (gte && end && gte > end) throw new InputError('Начало периода позже окончания');
  const lt = end ? new Date(end.getTime() + 86400000) : undefined;
  return from || to ? { gte, lt } : undefined;
}

export type Movement = { type: string; amount?: Money; usdAmount?: Money | null; assetCode?: string; projectId?: string | null };
export const sumMoney = (values: (Money | null | undefined)[]) => values.reduce<Prisma.Decimal>((sum, value) => sum.plus(value ?? 0), new D(0));
export function valueUsd(row: Movement): Prisma.Decimal | null {
  return row.usdAmount != null ? new D(row.usdAmount) : row.assetCode === 'USD' && row.amount != null ? new D(row.amount) : null;
}
export function totals(rows: Movement[]) {
  const sum = (type: string) => sumMoney(rows.filter(r => r.type === type).map(r => valueUsd(r)?.abs()));
  const income = sum('INCOME'), expense = sum('EXPENSE'), invested = sum('INVESTMENT');
  const returned = sum('INVESTMENT_RETURN'), commissions = sum('COMMISSION');
  return { income, expense, invested, returned, commissions,
    result: income.minus(expense).minus(commissions),
    netCashFlow: income.plus(returned).minus(expense).minus(invested).minus(commissions),
    investmentBalance: invested.minus(returned),
    unvaluedCount: rows.filter(r => valueUsd(r) == null).length };
}
