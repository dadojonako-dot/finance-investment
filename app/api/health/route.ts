import {NextResponse} from 'next/server';
import {prisma} from '../../../src/lib/prisma';
import {APP_VERSION} from '../../../src/config/version';
export const dynamic='force-dynamic';
export async function GET(){
 try{await prisma.$queryRaw`SELECT 1`;return NextResponse.json({status:'ok',database:'ok',version:APP_VERSION,timestamp:new Date().toISOString()},{headers:{'Cache-Control':'no-store'}})}
 catch{return NextResponse.json({status:'error',database:'unavailable',version:APP_VERSION,timestamp:new Date().toISOString()},{status:503,headers:{'Cache-Control':'no-store'}})}
}
