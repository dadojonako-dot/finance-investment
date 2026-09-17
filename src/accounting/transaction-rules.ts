export type TransactionInput = {
  type: 'INCOME'|'EXPENSE'|'TRANSFER'|'FX_EXCHANGE'|'INVESTMENT'|'INVESTMENT_RETURN'|'COMMISSION'|'ADJUSTMENT';
  ledgerId: string;
  accountId: string;
  projectId?: string | null;
  assetCode: string;
  amount: number;
  category?: string | null;
};

export function validateTransaction(input: TransactionInput) {
  const errors: string[] = [];
  if (!input.ledgerId) errors.push('Не выбран Ledger');
  if (!input.accountId) errors.push('Не выбран счет/кошелек');
  if (!input.assetCode) errors.push('Не выбрана валюта/актив');
  if (!Number.isFinite(input.amount) || input.amount <= 0) errors.push('Сумма должна быть больше нуля');

  // Business rule: every income or expense must belong to a project.
  // Administrative movements use a special project marked isGeneral=true.
  if ((input.type === 'INCOME' || input.type === 'EXPENSE') && !input.projectId) {
    errors.push('Для дохода или расхода обязательно укажите проект');
  }
  if (input.type === 'EXPENSE' && !input.category) errors.push('Для расхода обязательно укажите категорию');
  return { valid: errors.length === 0, errors };
}
