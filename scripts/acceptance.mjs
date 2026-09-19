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
const credentials=existsSync(credentialsPath)?JSON.parse(readFileSync(credentialsPath,'utf8')):{name:'Pilot acceptance OWNER',email:'pilot-owner@example.test',password:'Pilot9-'+randomBytes(24).toString('hex')};
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
  const results=await Promise.all([fetch(base+'/api/auth/bootstrap',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(credentials)}),fetch(base+'/api/auth/bootstrap',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(credentials)})]);assert.deepEqual(results.map(x=>x.status).sort(),[201,409]);assert.equal(await db.user.count(),1);cookie=results.find(x=>x.status===201).headers.get('set-cookie').split(';')[0];pass('Concurrent bootstrap creates exactly one OWNER');writeFileSync(credentialsPath,JSON.stringify(credentials));pass('Setup OWNER');
 }else {await api('/api/auth/login',credentials,'POST',200);pass('Existing acceptance OWNER reused');}
 await api('/api/auth/logout',{},'POST',200);cookie='';
 await api('/api/auth/login',credentials,'POST',200);pass('Logout/login');
 await api('/api/auth/bootstrap',credentials,'POST',409);pass('Repeated bootstrap denied');
 const ledgers=await api('/api/ledgers'),accounts=await api('/api/accounts'),projects=await api('/api/projects');
 assert.equal(await db.asset.count(),27);assert.equal(accounts.filter(x=>x.ledgerId===ledgers.find(l=>l.name==='Основной').id).length,6);assert.equal(projects.filter(x=>x.isGeneral).length,1);
 const ledgerId=ledgers.find(l=>l.name==='Основной').id,projectId=projects.find(x=>x.isGeneral).id;
 const cash=accounts.find(x=>x.type==='CASH'&&x.asset.code==='USD'),bank=accounts.find(x=>x.type==='BANK'),tjs=accounts.find(x=>x.asset.code==='TJS');
 const spot=accounts.find(x=>x.type==='EXCHANGE_SPOT'),futures=accounts.find(x=>x.type==='EXCHANGE_FUTURES');
 pass('Seed has 27 assets, one Ledger, one general project and six accounts');
 const balance=async id=>(await api('/api/balances')).accounts.find(x=>x.id===id).balance;
 const initial=new Prisma.Decimal(await balance(cash.id));
 const common={ledgerId,accountId:cash.id,projectId,assetCode:'USD',operationDate:'2026-09-17T18:59:59.999Z'};
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
  cookie=ownerCookie;const user={name:role,email:`${role.toLowerCase()}-${Date.now()}@example.test`,password:'Pilot9-'+randomBytes(20).toString('hex'),role};
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

 const healthResponse=await fetch(base+'/api/health');assert.equal(healthResponse.status,200);const health=await healthResponse.json();assert.equal(health.status,'ok');assert.equal(health.database,'ok');assert.equal(health.version,readFileSync('src/config/version.ts','utf8').match(/'([^']+)'/)[1]);
 for(const name of ['x-content-type-options','referrer-policy','x-frame-options','permissions-policy','content-security-policy'])assert(healthResponse.headers.get(name),name);
 const loginResponse=await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(credentials)});assert.equal(loginResponse.status,200);const header=loginResponse.headers.get('set-cookie');for(const flag of ['HttpOnly','Secure','SameSite=lax','Max-Age=43200'])assert(header.toLowerCase().includes(flag.toLowerCase()),flag);
 const payload=JSON.parse(Buffer.from(header.split(';')[0].split('=')[1].split('.')[1],'base64url'));assert(!('role' in payload));assert(!('email' in payload));
 pass('Public health, version, security headers and production session cookie');
 const malformed=await fetch(base+'/api/auth/bootstrap',{method:'POST',body:'not json'});assert.equal(malformed.status,409);
 for(const weak of ['password123','123456789012','abcdefghijk'])await api('/api/users',{name:'Weak',email:'weak@example.test',role:'VIEWER',password:weak},'POST',400);
 const managed={name:'Managed',email:`managed-${Date.now()}@example.test`,role:'VIEWER',password:'Strong9-'+randomBytes(12).toString('hex')};
 const managedRow=await api('/api/users',managed);await api('/api/auth/login',managed,'POST',200);const managedCookie=cookie;
 await api('/api/transactions',{...common,type:'INCOME',amount:'1'},'POST',403);
 cookie=ownerCookie;await api('/api/users',{id:managedRow.id,role:'FINANCE'},'PATCH',200);cookie=managedCookie;
 await api('/api/transactions',{...common,type:'INCOME',amount:'1'},'POST',201);
 cookie=ownerCookie;await api('/api/users',{id:managedRow.id,isActive:false},'PATCH',200);cookie=managedCookie;await api('/api/auth/me',null,'GET',401);
 cookie=ownerCookie;await api('/api/users',{id:managedRow.id,isActive:true},'PATCH',200);cookie=managedCookie;await api('/api/auth/me',null,'GET',401);
 await api('/api/auth/login',managed,'POST',200);const beforeReset=cookie;cookie=ownerCookie;
 await api('/api/users',{id:managedRow.id,password:'password123'},'PATCH',400);
 const replacement='Replacement9-'+randomBytes(10).toString('hex');await api('/api/users',{id:managedRow.id,password:replacement},'PATCH',200);
 cookie=beforeReset;await api('/api/auth/me',null,'GET',401);await api('/api/auth/login',managed,'POST',401);await api('/api/auth/login',{...managed,password:replacement},'POST',200);
 pass('Shared password policy, live role changes, disable/re-enable and reset revoke sessions');
 const unknown={email:`missing-${Date.now()}@example.test`,password:'NeverStoreThis9'};
 for(let i=0;i<5;i++)await api('/api/auth/login',unknown,'POST',401);
 const limited=await api('/api/auth/login',unknown,'POST',429);assert.equal(limited.error,'Слишком много попыток входа. Повторите позже.');
 // Success resets failures for the same IP/email pair before its limit is reached.
 for(let i=0;i<4;i++)await api('/api/auth/login',{...managed,password:'BadCredential9'},'POST',401);
 await api('/api/auth/login',{...managed,password:replacement},'POST',200);
 for(let i=0;i<4;i++)await api('/api/auth/login',{...managed,password:'BadCredential9'},'POST',401);
 await api('/api/auth/login',{...managed,password:replacement},'POST',200);
 const logout=await fetch(base+'/api/auth/logout',{method:'POST',headers:{Cookie:cookie}});assert.equal(logout.status,200);assert(logout.headers.get('set-cookie').includes('Max-Age=0'));
 cookie=ownerCookie;pass('HTTP login limiter, successful reset and logout cookie removal');
 for(const path of ['/api/transactions','/api/transfers','/api/fx-exchanges','/api/spot-trades','/api/futures-trades','/api/audit'])for(const method of ['DELETE','PATCH','PUT'])await api(path,{},method,405);
 await api('/api/users',{},'DELETE',405);pass('Posted financial entries, audit and users cannot be deleted through API');
 const logs=await db.auditLog.findMany({where:{OR:[{entityId:managedRow.id},{newValue:{path:['email'],equals:unknown.email}}]}});
 for(const action of ['UPDATE_ROLE','DISABLE_USER','ENABLE_USER','RESET_PASSWORD','LOGIN_SUCCESS','LOGIN_FAILED'])assert(logs.some(x=>x.action===action),action);
 const logged=JSON.stringify(logs);for(const sensitive of [managed.password,replacement,unknown.password,'passwordHash'])assert(!logged.includes(sensitive));
 assert(logs.some(x=>x.userId===null&&x.action==='LOGIN_FAILED'&&/^[a-f0-9]{64}$/.test(x.newValue.ipHash)));pass('Audit actions include anonymous failures and never credentials');
 const ledger=await api('/api/ledgers',{name:'Hardening '+Date.now(),baseCurrency:'USD'});
 const account=async(name,assetCode,openingBalance,type='CASH')=>api('/api/accounts',{ledgerId:ledger.id,name,assetCode,openingBalance,type});
 const a=await account('A','USD','1000'),b=await account('B','USD','0'),usdt=await account('USDT','USDT','0','CRYPTO_WALLET');
 const op={category:'TEST',projectId,ledgerId:ledger.id,accountId:a.id,assetCode:'USD',operationDate:'2026-09-18T00:00:00+05:00'};
 await api('/api/transactions',{...op,type:'INCOME',amount:'200'});eq(await balance(a.id),'1200');await api('/api/transactions',{...op,type:'EXPENSE',amount:'150'});eq(await balance(a.id),'1050');
 const transferA=await account('Transfer A','USD','1000');const plain=await api('/api/transfers',{fromAccountId:transferA.id,toAccountId:b.id,amount:'300'});eq(await balance(transferA.id),'700');eq(await balance(b.id),'300');
 const feeA=await account('Fee A','USD','1000');const feeTransfer=await api('/api/transfers',{fromAccountId:feeA.id,toAccountId:b.id,amount:'300',fee:'10'});eq(await balance(feeA.id),'690');eq(feeTransfer.feeTransaction.amount,'-10');
 const exactFx=await api('/api/fx-exchanges',{fromAccountId:a.id,toAccountId:usdt.id,fromAmount:'1000',toAmount:'990',fee:'5',toUsdRate:'1.0101010101'});eq(exactFx.debit.amount,'-1000');eq(exactFx.credit.amount,'990');eq(exactFx.feeTransaction.amount,'-5');
 const exactProject=await api('/api/projects',{name:'Exact '+Date.now(),status:'ACTIVE'});
 for(const [type,amount]of [['INCOME','1000'],['EXPENSE','300'],['COMMISSION','20']])await api('/api/transactions',{...op,projectId:exactProject.id,type,amount});
 const exactReport=await api('/api/reports?projectId='+exactProject.id+'&from=2026-09-18&to=2026-09-18');eq(exactReport.summary.operatingResult,'680');
 pass('Exact income, expense, transfer, isolated FX/transfer fee and project 680 scenarios over HTTP');
 const midnightProject=await api('/api/projects',{name:'Midnight '+Date.now(),status:'ACTIVE'});
 for(const operationDate of ['2026-09-17T18:59:59.999Z','2026-09-17T19:00:00.000Z','2026-09-18T18:59:59.999Z','2026-09-18T19:00:00.000Z'])await api('/api/transactions',{...op,projectId:midnightProject.id,type:'INCOME',amount:'1',operationDate});
 const midnightReport=await api('/api/reports?projectId='+midnightProject.id+'&from=2026-09-18&to=2026-09-18');assert.equal(midnightReport.counts.transactions,2);pass('HTTP Dushanbe midnight boundaries');
 writeFileSync('test-results/acceptance.json',JSON.stringify({base,passed,completedAt:new Date().toISOString()},null,2));
 console.log(`ACCEPTANCE PASSED: ${passed.length} groups`);
}finally{await db.$disconnect()}

