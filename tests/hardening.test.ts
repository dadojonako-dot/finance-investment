import test from 'node:test';
import assert from 'node:assert/strict';
import {decimal,dateFilter,dateValue,totals} from '../src/accounting/money';
import {calculateBalance} from '../src/accounting/balance';
import {passwordError} from '../src/auth/password-policy';
import {MemoryAttemptStorage,reserveLogin} from '../src/auth/login-limiter';
test('financial scenarios and exact Decimal arithmetic',()=>{
 const balance=(opening:string,...amounts:string[])=>calculateBalance(opening,amounts.map(amount=>({type:'INCOME',amount,assetCode:'USD'}))).toString();
 assert.equal(balance('1000','200'),'1200');assert.equal(balance('1200','-150'),'1050');
 assert.equal(balance('1000','-300'),'700');assert.equal(balance('0','300'),'300');assert.equal(balance('1000','-300','-10'),'690');
 assert.equal(balance('0','0.1','0.2'),'0.3');assert.equal(balance('0','0.00000001'),'1e-8');
 assert.equal(balance('9007199254740993','0.0000000001'),'9007199254740993.0000000001');
 assert.equal(decimal('0.1234567891').plus('0.0000000009').toString(),'0.12345679');
 assert.equal(decimal('1.1234567891').times('10').toString(),'11.234567891');
 assert.equal(totals([{type:'INCOME',usdAmount:'1000'},{type:'EXPENSE',usdAmount:'-300'},{type:'COMMISSION',usdAmount:'-20'}]).result.toString(),'680');
});
test('Dushanbe midnight includes its UTC predecessor and excludes next midnight',()=>{
 for(const invalid of ['2026-02-30','2026-13-01','2026-02-30T12:00:00Z'])assert.throws(()=>dateValue(invalid));
 const f=dateFilter(new URLSearchParams('from=2026-09-18&to=2026-09-18'))!;
 assert.equal((f.gte as Date).toISOString(),'2026-09-17T19:00:00.000Z');
 assert.equal((f.lt as Date).toISOString(),'2026-09-18T19:00:00.000Z');
 assert.equal(dateValue('2026-09-18T00:00').toISOString(),'2026-09-17T19:00:00.000Z');
});
test('shared password policy rejects obvious and malformed passwords',()=>{
 for(const p of ['short1','abcdefghijk','123456789012','Password123','qwerty12345','Admin123456','a1'.repeat(50)])assert(passwordError(p),p);
 assert.equal(passwordError('Pilot-Correct-92!'),null);
});
test('limiter bounds concurrent attempts, resets successful pair and expires',async()=>{
 const store=new MemoryAttemptStorage(1000);const handles=await Promise.all(Array.from({length:8},()=>reserveLogin('127.0.0.1','a@example.test',store,0)));
 assert.equal(handles.filter(Boolean).length,5);for(const h of handles)if(h)await h('failure');
 assert.equal(await reserveLogin('127.0.0.1','a@example.test',store,500),null);
 const next=await reserveLogin('127.0.0.1','a@example.test',store,1001);assert(next);await next('success');
 for(let i=0;i<4;i++){const h=await reserveLogin('127.0.0.2','b@example.test',store,1100);assert(h);await h('failure')}
 const h=await reserveLogin('127.0.0.2','b@example.test',store,1100);assert(h);await h('success');
 assert(await reserveLogin('127.0.0.2','b@example.test',store,1100));
});
