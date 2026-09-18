import { NextResponse } from 'next/server';
import { prisma } from '../../../src/lib/prisma';
import { authorize } from '../../../src/auth/server';
import { D, totals, dateFilter, sumMoney } from '../../../src/accounting/money';
import { apiError } from '../../../src/lib/api-error';
export async function GET(req: Request) {
  const auth = await authorize('reports.view');
  if (auth.response) return auth.response;
  try {
    const p = new URL(req.url).searchParams, ledgerId = p.get('ledgerId') || undefined, projectId = p.get('projectId') || undefined;
    const period = dateFilter(p);
    const [tx, spot, futures] = await Promise.all([
      prisma.transaction.findMany({ where: { ledgerId, projectId, operationDate: period }, include: { project: true } }),
      projectId ? [] : prisma.spotTrade.findMany({ where: { ledgerId, tradeDate: period } }),
      projectId ? [] : prisma.futuresTrade.findMany({ where: { ledgerId, status: 'CLOSED', closedAt: period } }),
    ]);
    const t = totals(tx);
    const byAsset = new Map<string, InstanceType<typeof D>>();
    for (const row of tx) byAsset.set(row.assetCode, (byAsset.get(row.assetCode) ?? new D(0)).plus(row.amount));
    const projects = [...new Set(tx.map(x => x.projectId))].map(id => {
      const rows = tx.filter(x => x.projectId === id), m = totals(rows);
      return { id: id ?? 'none', name: rows[0].project?.name ?? 'Без проекта', income: m.income, expense: m.expense,
        investment: m.invested, returns: m.returned, fees: m.commissions, result: m.result, netCashFlow: m.netCashFlow, unvaluedCount: m.unvaluedCount };
    });
    const spotPnl = sumMoney(spot.map(x => x.realizedPnl)), futuresPnl = sumMoney(futures.map(x => x.realizedPnl));
    return NextResponse.json({ summary: { income: t.income, expense: t.expense, investment: t.invested,
      investmentReturn: t.returned, commission: t.commissions, operatingResult: t.result, netCashFlow: t.netCashFlow, unvaluedCount: t.unvaluedCount },
      trading: { spotPnl, spotFees: sumMoney(spot.map(x => x.fee)), futuresPnl,
        futuresFees: sumMoney(futures.map(x => x.fees.plus(x.funding))), totalRealizedPnl: spotPnl.plus(futuresPnl) },
      byAsset: [...byAsset].map(([asset, amount]) => ({ asset, amount })), projects,
      counts: { transactions: tx.length, spotTrades: spot.length, futuresTrades: futures.length } });
  } catch (error) { return apiError(error); }
}
