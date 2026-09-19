import {cookies} from 'next/headers';
import {NextResponse} from 'next/server';
import {SignJWT,jwtVerify} from 'jose';
import * as bcrypt from 'bcryptjs';
import {prisma} from '../lib/prisma';
import {can,Permission} from './permissions';
import {requirePassword} from './password-policy';
export const AUTH_COOKIE='finance_session';
export function secret(){const value=process.env.AUTH_SECRET;if(!value||value.length<32)throw new Error('Invalid AUTH_SECRET configuration');return new TextEncoder().encode(value)}
export async function hashPassword(password:string){requirePassword(password);return bcrypt.hash(password,12)}
export async function verifyPassword(password:string,hash:string){if(!hash||hash==='PENDING_ACTIVATION'||Buffer.byteLength(password)>72)return false;return bcrypt.compare(password,hash)}
export async function issueSession(user:{id:string;sessionVersion:number}){
 return new SignJWT({sv:user.sessionVersion}).setProtectedHeader({alg:'HS256'}).setSubject(user.id)
  .setIssuer('finance-investment').setAudience('finance-investment').setIssuedAt().setExpirationTime('12h').sign(secret());
}
export async function getCurrentUser(){
 try{
  const token=(await cookies()).get(AUTH_COOKIE)?.value;if(!token)return null;
  const {payload}=await jwtVerify(token,secret(),{algorithms:['HS256'],issuer:'finance-investment',audience:'finance-investment'});
  if(!payload.sub)return null;
  const user=await prisma.user.findUnique({where:{id:payload.sub},select:{id:true,email:true,name:true,role:true,isActive:true,sessionVersion:true}});
  return user?.isActive&&payload.sv===user.sessionVersion?user:null;
 }catch{return null}
}
export async function authorize(permission:Permission){
 const user=await getCurrentUser();
 if(!user)return {user:null,response:NextResponse.json({error:'Требуется авторизация'},{status:401})};
 if(!can(user.role,permission))return {user:null,response:NextResponse.json({error:'Недостаточно прав'},{status:403})};
 return {user,response:null};
}
export function sessionCookie(token:string){return {name:AUTH_COOKIE,value:token,httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax' as const,path:'/',maxAge:12*60*60}}
