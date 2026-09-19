import {createHmac} from 'node:crypto';
import {isIP} from 'node:net';
type Entry={failures:number;pending:number;expires:number};
export interface AttemptStorage {
 reserve(key:string,limit:number,now:number):Promise<boolean>;
 finish(key:string,outcome:'failure'|'success'|'cancel'):Promise<void>;
}
// Single-process Pilot implementation. A Redis adapter must make reserve/finish atomic.
export class MemoryAttemptStorage implements AttemptStorage{
 private entries=new Map<string,Entry>();
 constructor(private windowMs=15*60*1000,private maxKeys=10000){}
 async reserve(key:string,limit:number,now:number){
  for(const [k,v]of this.entries)if(v.expires<=now&&v.pending===0)this.entries.delete(k);
  let e=this.entries.get(key);
  if(!e){if(this.entries.size>=this.maxKeys)return false;e={failures:0,pending:0,expires:now+this.windowMs};this.entries.set(key,e)}
  if(e.failures+e.pending>=limit)return false;e.pending++;return true;
 }
 async finish(key:string,outcome:'failure'|'success'|'cancel'){
  const e=this.entries.get(key);if(!e)return;e.pending=Math.max(0,e.pending-1);
  if(outcome==='failure')e.failures++;if(outcome==='success')e.failures=0;
  if(e.failures===0&&e.pending===0)this.entries.delete(key);
 }
}
const globalState=globalThis as unknown as {pilotAttempts?:AttemptStorage};
export const attempts=globalState.pilotAttempts??=new MemoryAttemptStorage();
export function clientIp(req:Request){
 // Never trust arbitrary X-Forwarded-For. The configured edge must overwrite this header.
 const header=process.env.TRUST_PROXY_IP_HEADER;
 if(!header)return 'untrusted-peer';
 const value=req.headers.get(header)?.trim()||'';
 return isIP(value)?value:'untrusted-peer';
}
export function ipHash(ip:string){return createHmac('sha256',process.env.AUTH_SECRET||'').update(ip).digest('hex')}
export async function reserveLogin(ip:string,email:string,storage:AttemptStorage=attempts,now=Date.now()){
 const ipKey='ip:'+ipHash(ip),pairKey=ipKey+':'+createHmac('sha256',process.env.AUTH_SECRET||'').update(email).digest('hex');
 if(!await storage.reserve(ipKey,30,now))return null;
 if(!await storage.reserve(pairKey,5,now)){await storage.finish(ipKey,'cancel');return null}
 let done=false;
 return async(outcome:'failure'|'success'|'cancel')=>{
  if(done)return;done=true;await storage.finish(pairKey,outcome);
  // A successful account cannot erase failures targeting other accounts on the same IP.
  await storage.finish(ipKey,outcome==='success'?'cancel':outcome);
 };
}
