import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateBalance } from '../src/accounting/balance';
import { totals, decimal, dateFilter, usdRate } from '../src/accounting/money';
test('signed balances preserve fractions and values beyond IEEE-754 precision', () => {
  assert.equal(calculateBalance('9007199254740993', [
    { type: 'INCOME', amount: '0.1', assetCode: 'USD' },
    { type: 'EXPENSE', amount: '-0.2', assetCode: 'USD' },
  ]).toString(), '9007199254740992.9');
});
test('project totals use signed postings without double subtraction', () => {
  const t = totals([
    {type:'INCOME',usdAmount:'100'}, {type:'EXPENSE',usdAmount:'-20'},
    {type:'INVESTMENT',usdAmount:'-50'}, {type:'INVESTMENT_RETURN',usdAmount:'30'},
    {type:'COMMISSION',usdAmount:'-2'},
  ]);
  assert.equal(t.result.toString(),'78'); assert.equal(t.netCashFlow.toString(),'58');
});
test('USD defaults to 1; other assets remain explicitly unvalued', () => {
  assert.equal(usdRate('', 'USD')?.toString(), '1');
  assert.equal(usdRate('', 'USDT'), null);
  assert.throws(() => usdRate('-1','EUR'));
  assert.throws(() => usdRate('2','USD'));
});
test('reject nonfinite and overprecision amounts', () => {
  for (const value of ['NaN','Infinity','0.00000000001','100000000000000000000']) assert.throws(() => decimal(value));
});
test('UTC day filters include the final millisecond and reject bad ranges', () => {
  const d = dateFilter(new URLSearchParams('from=2026-09-17&to=2026-09-17'))!;
  assert.equal((d.lt as Date).toISOString(), '2026-09-18T00:00:00.000Z');
  assert.throws(() => dateFilter(new URLSearchParams('from=2026-02-30')));
  assert.throws(() => dateFilter(new URLSearchParams('from=2026-09-18&to=2026-09-17')));
});
