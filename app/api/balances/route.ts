import { NextResponse } from 'next/server';
import { prisma } from '../../../src/lib/prisma';
import { authorize } from '../../../src/auth/server';
import { D, sumMoney, dateFilter, valueUsd } from '../../../src/accounting/money';
import { apiError } from '../../../src/lib/api-error';
export async function GET(req: Request) {
  const auth = await authorize('transactions.view');
  if (auth.response) return auth.response;
  try {
    const params = new URL(req.url).searchParams;
    const period = dateFilter(params);
    const accounts = await prisma.account.findMany({
      where: { ledgerId: params.get('ledgerId') || undefined, isActive: true },
      include: { asset: true, ledger: true, transactions: { where: period?.lt ? { operationDate: { lt: period.lt } } : undefined } },
      orderBy: { createdAt: 'asc' },
    });
    const rows = accounts.map(a => {
      const opening = a.openingBalance.plus(sumMoney(a.transactions.filter(t => period?.gte && t.operationDate < (period.gte as Date)).map(t => t.amount)));
      const tx = a.transactions.filter(t => !period?.gte || t.operationDate >= (period.gte as Date));
      const movements = sumMoney(tx.map(t => t.amount));
      return { id: a.id, name: a.name, type: a.type, ledgerId: a.ledgerId, ledgerName: a.ledger.name,
        assetCode: a.asset.code, openingBalance: opening, movements, balance: opening.plus(movements),
        usdMovements: sumMoney(tx.map(valueUsd)), unvaluedCount: tx.filter(t => valueUsd(t) == null).length };
    });
    const grouped = new Map<string, InstanceType<typeof D>>();
    for (const r of rows) grouped.set(r.assetCode, (grouped.get(r.assetCode) ?? new D(0)).plus(r.balance));
    return NextResponse.json({ accounts: rows, byAsset: [...grouped].map(([assetCode, balance]) => ({ assetCode, balance })) });
  } catch (error) { return apiError(error); }
}
