import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {loadEnvFile} from 'node:process';
import {PrismaClient} from '@prisma/client';
import {writeFileSync} from 'node:fs';
try{loadEnvFile('.env')}catch{}
if(process.env.PILOT_TEST_ALLOW_WRITE!=='1')throw new Error('Disposable database required');
const db=new PrismaClient();let restored;
function run(args){const p=spawnSync(process.execPath,['scripts/db-backup.mjs',...args],{encoding:'utf8',env:process.env});assert.equal(p.status,0,p.stderr);return p.stdout.trim()}
try{
 const account=await db.account.findFirst({where:{asset:{code:'USD'}}});const actor=await db.user.findFirst({where:{role:'OWNER'}});const project=await db.project.findFirst({where:{isGeneral:true}});
 const data={ledgerId:account.ledgerId,accountId:account.id,projectId:project.id,assetCode:'USD',type:'INCOME',amount:'0.1234567891',usdAmount:'0.12',createdById:actor.id,description:'Backup acceptance '+Date.now()};
 const original=await db.transaction.create({data});const file=run(['backup']);
 const later=await db.transaction.create({data:{...data,description:'After backup'}});
 const target='pilot_restore_'+Date.now();run(['restore','--file',file,'--database',target]);
 const url=new URL(process.env.DATABASE_URL);url.pathname='/'+target;restored=new PrismaClient({datasourceUrl:url.toString()});
 const row=await restored.transaction.findUnique({where:{id:original.id}});assert(row);assert.equal(row.amount.toString(),'0.1234567891');assert.equal(await restored.transaction.findUnique({where:{id:later.id}}),null);assert(await db.transaction.findUnique({where:{id:later.id}}));
 writeFileSync('test-results/backup.json',JSON.stringify({passed:true,originalPresent:true,laterAbsentInRestore:true,sourceUnchanged:true,target},null,2));console.log('PASS backup/restore separate database; source unchanged');
}finally{await restored?.$disconnect();await db.$disconnect()}
