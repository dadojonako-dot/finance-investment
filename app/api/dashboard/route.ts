import { NextResponse } from 'next/server';
import { prisma } from '../../../src/lib/prisma';
import { authorize } from '../../../src/auth/server';
import { D, totals, sumMoney, valueUsd, dateFilter } from '../../../src/accounting/money';
import { apiError } from '../../../src/lib/api-error';
export async function GET(req: Request) {
  const auth = await authorize('reports.view');
  if (auth.response) return auth.response;
  try {
    const p = new URL(req.url).searchParams, ledgerId = p.get('ledgerId') || undefined, projectId = p.get('projectId') || undefined;
    const period = dateFilter(p);
    const [accounts, txs, projects] = await Promise.all([
      prisma.account.findMany({ where: { ledgerId, isActive: true }, include: { asset: true, transactions: { where: { projectId, ...(period?.lt ? { operationDate: { lt: period.lt } } : {}) } } } }),
      prisma.transaction.findMany({ where: { ledgerId, projectId, operationDate: period } }),
      prisma.project.findMany({ where: { id: projectId }, orderBy: { createdAt: 'asc' } }),
    ]);
    let fiat = new D(0), crypto = new D(0), unvaluedCount = 0;
    const byAsset = new Map<string, { code: string; type: string; balance: InstanceType<typeof D>; usdValue: InstanceType<typeof D> }>();
    for (const a of accounts) {
      const opening = projectId ? new D(0) : a.openingBalance;
      const balance = opening.plus(sumMoney(a.transactions.map(t => t.amount)));
      const usdValue = sumMoney(a.transactions.map(valueUsd)).plus(a.asset.code === 'USD' ? opening : 0);
      unvaluedCount += a.transactions.filter(t => valueUsd(t) == null).length + (a.asset.code !== 'USD' && !opening.isZero() ? 1 : 0);
      const bucket = byAsset.get(a.asset.code) ?? { code: a.asset.code, type: a.asset.type, balance: new D(0), usdValue: new D(0) };
      bucket.balance = bucket.balance.plus(balance); bucket.usdValue = bucket.usdValue.plus(usdValue); byAsset.set(a.asset.code, bucket);
      if (a.asset.type === 'FIAT') fiat = fiat.plus(usdValue); else crypto = crypto.plus(usdValue);
    }
    const m = totals(txs);
    return NextResponse.json({ fiat, crypto, totalEquity: fiat.plus(crypto), income: m.income, expenses: m.expense,
      fees: m.commissions, investments: m.invested, returns: m.returned, netResult: m.result, unvaluedCount,
      valuationBasis: 'Recorded USD cash flows; not current market valuation', assets: [...byAsset.values()],
      projects: projects.map(p => ({ id: p.id, name: p.name, ...totals(txs.filter(t => t.projectId === p.id)) })) });
  } catch (error) { return apiError(error); }
}
