import { decimal, Money } from './money';
export type TransactionInput = {
  type: 'INCOME'|'EXPENSE'|'TRANSFER'|'FX_EXCHANGE'|'INVESTMENT'|'INVESTMENT_RETURN'|'COMMISSION'|'ADJUSTMENT';
  ledgerId: string; accountId: string; projectId?: string | null; assetCode: string; amount: Money; category?: string | null;
};
export function validateTransaction(input: TransactionInput) {
  const errors: string[] = [];
  if (!input.ledgerId) errors.push('Не выбран Ledger');
  if (!input.accountId) errors.push('Не выбран счет/кошелек');
  if (!input.assetCode) errors.push('Не выбрана валюта/актив');
  try { const n = decimal(input.amount.toString()); if (n.isZero() || (input.type !== 'ADJUSTMENT' && n.lt(0))) errors.push('Некорректная сумма'); }
  catch { errors.push('Некорректная сумма'); }
  if (['TRANSFER','FX_EXCHANGE'].includes(input.type)) errors.push('Используйте специальный API');
  if (['INCOME','EXPENSE'].includes(input.type) && !input.projectId) errors.push('Проект обязателен');
  if (input.type === 'EXPENSE' && !input.category) errors.push('Категория обязательна');
  return { valid: errors.length === 0, errors };
}
