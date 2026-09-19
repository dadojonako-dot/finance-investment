import {spawn} from 'node:child_process';
import {createReadStream,createWriteStream,mkdirSync,existsSync,unlinkSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {loadEnvFile} from 'node:process';
try{loadEnvFile('.env')}catch(e){if(e.code!=='ENOENT')throw e}
const mode=process.argv[2],args=process.argv.slice(3),url=new URL(process.env.DATABASE_URL);
const source=decodeURIComponent(url.pathname.slice(1));
const option=k=>args[args.indexOf(k)+1];
const compose=process.env.PILOT_DB_TOOLS==='compose';
const env={...process.env,PGHOST:url.hostname,PGPORT:url.port||'5432',PGUSER:decodeURIComponent(url.username),PGPASSWORD:decodeURIComponent(url.password),...(url.searchParams.has('sslmode')?{PGSSLMODE:url.searchParams.get('sslmode')}:{})};
async function run(tool,params,input,output){
 const command=compose?'docker':process.env.PG_BIN?join(process.env.PG_BIN,tool+(process.platform==='win32'?'.exe':'')):tool;
 const argv=compose?['compose','exec','-T','-e','PGPASSWORD','postgres',tool,'-h','127.0.0.1','-U',env.PGUSER,...params]:params;
 await new Promise((ok,fail)=>{const child=spawn(command,argv,{env,stdio:['pipe','pipe','pipe']});
 // Diagnostics may contain connection details; deliberately keep failures generic.
 child.stderr.resume();child.on('error',()=>fail(new Error(tool+' could not start')));
 child.on('close',code=>code===0?ok():fail(new Error(tool+' failed; check PostgreSQL availability and permissions')));
 if(input){input.on('error',()=>{child.kill();fail(new Error('Cannot read backup file'))});input.pipe(child.stdin)}else child.stdin.end();
 if(output)output.on('error',()=>{child.kill();fail(new Error('Cannot write backup file'))});
 child.stdin.on('error',()=>{});
 if(output)child.stdout.pipe(output);else child.stdout.resume();
 });
 if(output)await new Promise((ok,fail)=>{if(output.writableFinished)return ok();output.once('finish',ok);output.once('error',fail)});
}
try{
 if(mode==='backup'){
  mkdirSync('backups',{recursive:true});const file=resolve('backups',`pilot-${new Date().toISOString().replace(/[:.]/g,'-')}.dump`);
  try{await run('pg_dump',['-Fc','--no-owner','--no-acl','-d',source],null,createWriteStream(file,{flags:'wx',mode:0o600}))}catch(e){if(existsSync(file))unlinkSync(file);throw e}
  console.log(file);
 }else if(mode==='restore'){
  const file=args.includes('--file')?resolve(option('--file')):null,target=args.includes('--database')?option('--database'):null;
  if(!file||!existsSync(file)||!target||!/^[a-z][a-z0-9_]{0,62}$/.test(target)||target===source)throw new Error('Use --file backups/<file>.dump --database <NEW separate database>');
  // createdb fails if the target exists: never overwrite an existing database.
  await run('createdb',[target]);
  await run('pg_restore',['--exit-on-error','--single-transaction','--no-owner','--no-acl','-d',target],createReadStream(file));
  console.log('Restored into '+target);
 }else throw new Error('Expected backup or restore');
}catch(e){console.error(e.message);process.exitCode=1}
