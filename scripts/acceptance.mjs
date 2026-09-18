import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {loadEnvFile} from 'node:process';
import {PrismaClient,Prisma} from '@prisma/client';
try{loadEnvFile('.env')}catch(e){if(e.code!=='ENOENT')throw e}
const base=process.env.PILOT_TEST_URL||'http://127.0.0.1:3100';
if(process.env.PILOT_TEST_ALLOW_WRITE!=='1'||!['127.0.0.1','localhost'].includes(new URL(base).hostname))throw new Error('Use a disposable local database and set PILOT_TEST_ALLOW_WRITE=1');
const db=new PrismaClient(),passed=[];let cookie='';
mkdirSync('test-results',{recursive:true});
const credentialsPath='test-results/owner.json';
const credentials=existsSync(credentialsPath)?JSON.parse(readFileSync(credentialsPath,'utf8')):{name:'Pilot acceptance OWNER',email:'pilot-owner@example.test',password:randomBytes(24).toString('hex')};
async function api(path,body,method=body?'POST':'GET',expected=body?201:200){
 const response=await fetch(base+path,{method,headers:{'Content-Type':'application/json',Cookie:cookie},body:body?JSON.stringify(body):undefined});
 const text=await response.text();let value;try{value=JSON.parse(text)}catch{value=text}
 assert.equal(response.status,expected,`${method} ${path}: ${text}`);
 const session=response.headers.get('set-cookie');if(session)cookie=session.split(';')[0];
 return value;
}
function pass(message){passed.push(message);console.log('PASS',message)}
const eq=(actual,expected)=>assert(new Prisma.Decimal(actual).eq(expected),`${actual} != ${expected}`);
try{
 await api('/api/balances',null,'GET',401);pass('Anonymous requests denied');
 if(await db.user.count()===0){
  await api('/api/auth/bootstrap',credentials);writeFileSync(credentialsPath,JSON.stringify(credentials));pass('Setup OWNER');
 }else {await api('/api/auth/login',credentials,'POST',200);pass('Existing acceptance OWNER reused');}
 await api('/api/auth/logout',{},'POST',200);cookie='';
 await api('/api/auth/login',credentials,'POST',200);pass('Logout/login');
 await api('/api/auth/bootstrap',credentials,'POST',409);pass('Repeated bootstrap denied');
 const ledgers=await api('/api/ledgers'),accounts=await api('/api/accounts'),projects=await api('/api/projects');
 assert.equal(await db.asset.count(),27);assert.equal(accounts.length,6);assert.equal(ledgers.length,1);assert.equal(projects.filter(x=>x.isGeneral).length,1);
 const ledgerId=ledgers[0].id,projectId=projects.find(x=>x.isGeneral).id;
 const cash=accounts.find(x=>x.type==='CASH'&&x.asset.code==='USD'),bank=accounts.find(x=>x.type==='BANK'),tjs=accounts.find(x=>x.asset.code==='TJS');
 const spot=accounts.find(x=>x.type==='EXCHANGE_SPOT'),futures=accounts.find(x=>x.type==='EXCHANGE_FUTURES');
 pass('Seed has 27 assets, one Ledger, one general project and six accounts');
 const balance=async id=>(await api('/api/balances')).accounts.find(x=>x.id===id).balance;
 const initial=new Prisma.Decimal(await balance(cash.id));
 const common={ledgerId,accountId:cash.id,projectId,assetCode:'USD',operationDate:'2026-09-17T23:59:59.999Z'};
 const income=await api('/api/transactions',{...common,type:'INCOME',amount:'1000.10'});eq(income.usdAmount,'1000.1');eq(await balance(cash.id),initial.plus('1000.1'));pass('Income increases balance; USD defaults to rate 1');
 await api('/api/transactions',{...common,type:'EXPENSE',amount:'100.20',category:'TEST'});eq(await balance(cash.id),initial.plus('899.9'));pass('Expense decreases balance');
 const bankBefore=new Prisma.Decimal(await balance(bank.id));
 let transfer=await api('/api/transfers',{fromAccountId:cash.id,toAccountId:bank.id,amount:'100'});eq(transfer.debit.amount,'-100');eq(transfer.credit.amount,'100');assert.equal(transfer.feeTransaction,null);
 transfer=await api('/api/transfers',{fromAccountId:cash.id,toAccountId:bank.id,amount:'50',fee:'2.25'});eq(transfer.debit.amount,'-50');eq(transfer.credit.amount,'50');eq(transfer.feeTransaction.amount,'-2.25');assert.equal(transfer.feeTransaction.type,'COMMISSION');assert.equal(transfer.debit.transferGroupId,transfer.feeTransaction.transferGroupId);eq(await balance(bank.id),bankBefore.plus(150));eq(await balance(cash.id),initial.plus('747.65'));pass('Transfer debit/credit, isolated fee and shared group');
 const tjsBefore=new Prisma.Decimal(await balance(tjs.id));
 const fx=await api('/api/fx-exchanges',{fromAccountId:cash.id,toAccountId:tjs.id,fromAmount:'10',toAmount:'100',fee:'0.5',toUsdRate:'0.1'});
 eq(fx.debit.amount,'-10');eq(fx.credit.amount,'100');eq(fx.feeTransaction.amount,'-0.5');assert.equal(fx.feeTransaction.type,'COMMISSION');eq(await balance(tjs.id),tjsBefore.plus(100));eq(await balance(cash.id),initial.plus('737.15'));pass('FX paired postings and isolated commission');
 const project=await api('/api/projects',{name:'Acceptance '+Date.now(),status:'ACTIVE'});
 await api('/api/transactions',{...common,projectId:project.id,type:'INCOME',amount:'200'});
 await api('/api/transactions',{...common,projectId:project.id,type:'EXPENSE',amount:'50',category:'TEST'});
 const report=await api('/api/reports?projectId='+project.id+'&from=2026-09-17&to=2026-09-17');eq(report.summary.operatingResult,'150');eq(report.summary.netCashFlow,'150');assert.equal(report.counts.transactions,2);pass('Project result and final millisecond date filter');
 const countBefore=await db.transaction.count();
 await api('/api/spot-trades',{ledgerId,exchangeAccountId:spot.id,symbol:'BTCUSDT',side:'BUY',quantity:'0.1',price:'50000',fee:'1',realizedPnl:'10'});
 for(const [side,exit,expected] of [['LONG','110','17'],['SHORT','90','17']]){
  const trade=await api('/api/futures-trades',{ledgerId,exchangeAccountId:futures.id,symbol:'BTCUSDT',side,quantity:'2',entryPrice:'100',exitPrice:exit,leverage:'2',fees:'2',funding:'1',openedAt:'2026-09-16T00:00:00Z',closedAt:'2026-09-17T12:00:00Z'});eq(trade.realizedPnl,expected);
 }
 assert.equal(await db.transaction.count(),countBefore);pass('Manual Spot and LONG/SHORT Futures P&L; no automatic ledger postings');
 const journal=await api('/api/transactions');assert(!JSON.stringify(journal).includes('passwordHash'));pass('Journal excludes password hashes');
 await api('/api/dashboard');await api('/api/reports');const audit=await api('/api/audit');
 for(const type of ['User','Transaction','Transfer','FxExchange','Project','SpotTrade','FuturesTrade'])assert(audit.some(x=>x.entityType===type),type);
 pass('Dashboard, reports and audit API');
 for(const path of ['/','/dashboard','/journal','/reports','/audit','/balances','/ledgers','/operations','/transfers','/exchange','/projects','/users','/exchanges']){
  const r=await fetch(base+path,{headers:{Cookie:cookie}});assert.equal(r.status,200,path);assert((await r.text()).includes('<html'));
 }pass('All application pages return HTML');
 const ownerCookie=cookie;
 for(const role of ['ADMIN','FINANCE','TRADER','ACCOUNTANT','VIEWER']){
  cookie=ownerCookie;const user={name:role,email:`${role.toLowerCase()}-${Date.now()}@example.test`,password:randomBytes(20).toString('hex'),role};
  const created=await api('/api/users',user);await api('/api/auth/login',user,'POST',200);
  await api('/api/balances');await api('/api/reports');
  await api('/api/users',null,'GET',role==='ADMIN'?200:403);
  await api('/api/audit',null,'GET',role==='ADMIN'?200:403);
  await api('/api/transactions',{...common,type:'INCOME',amount:'1'},'POST',['ADMIN','FINANCE','ACCOUNTANT'].includes(role)?201:403);
  await api('/api/spot-trades',{ledgerId,exchangeAccountId:spot.id,symbol:'BTCUSDT',side:'BUY',quantity:'1',price:'1'},'POST',['ADMIN','TRADER'].includes(role)?201:403);
  if(role==='VIEWER'){
   const viewerCookie=cookie;cookie=ownerCookie;await api('/api/users',{id:created.id,isActive:false},'PATCH',200);cookie=viewerCookie;await api('/api/dashboard',null,'GET',401);
  }
 }cookie=ownerCookie;pass('All six roles and disabled-user session rejection');
 await api('/api/transactions',{...common,type:'TRANSFER',amount:'1'},'POST',400);
 await api('/api/transactions',{...common,type:'INCOME',amount:'NaN'},'POST',400);
 await api('/api/transfers',{fromAccountId:cash.id,toAccountId:tjs.id,amount:'1'},'POST',400);
 await api('/api/spot-trades',{ledgerId,exchangeAccountId:cash.id,symbol:'BTCUSDT',side:'BUY',quantity:'1',price:'1'},'POST',400);
 await api('/api/reports?from=2026-02-30',null,'GET',400);
 const me=await api('/api/auth/me');await api('/api/users',{id:me.id,role:'VIEWER'},'PATCH',400);
 pass('Invalid signs/types/dates, wrong trading account and last-owner protection');
 writeFileSync('test-results/acceptance.json',JSON.stringify({base,passed,completedAt:new Date().toISOString()},null,2));
 console.log(`ACCEPTANCE PASSED: ${passed.length} groups`);
}finally{await db.$disconnect()}
