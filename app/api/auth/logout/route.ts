import {NextResponse} from 'next/server';
import {getCurrentUser,sessionCookie} from '../../../../src/auth/server';
import {prisma} from '../../../../src/lib/prisma';
export async function POST(){
 const user=await getCurrentUser();
 try{if(user)await prisma.auditLog.create({data:{userId:user.id,entityType:'Auth',entityId:user.id,action:'LOGOUT'}})}catch{console.error('Logout audit unavailable')}
 const res=NextResponse.json({ok:true});res.cookies.set({...sessionCookie(''),maxAge:0,expires:new Date(0)});return res;
}
