import {NextResponse} from 'next/server';
import {prisma} from '../../../../src/lib/prisma';
import {hashPassword,issueSession,sessionCookie} from '../../../../src/auth/server';
import {apiError} from '../../../../src/lib/api-error';
export async function POST(req:Request){
  try {
    if(await prisma.user.count()>0)return NextResponse.json({error:'Первичная настройка уже выполнена'},{status:409});
    const b=await req.json(),name=String(b.name||'').trim(),email=String(b.email||'').trim().toLowerCase(),password=String(b.password||'');
    if(!name||name.length>200||email.length>254||!/^\S+@\S+\.\S+$/.test(email))
      return NextResponse.json({error:'Укажите корректные имя и email'},{status:400});
    const passwordHash=await hashPassword(password);
    const result=await prisma.$transaction(async tx=>{
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(741001)`;
      if(await tx.user.count()>0)return null;
      const user=await tx.user.create({data:{name,email,passwordHash,role:'OWNER',isActive:true}});
      await tx.auditLog.create({data:{userId:user.id,entityType:'User',entityId:user.id,action:'BOOTSTRAP_OWNER',newValue:{email:user.email,role:user.role}}});
      // Sign before committing so invalid server configuration cannot strand setup.
      return {user,token:await issueSession(user)};
    });
    if(!result)return NextResponse.json({error:'Первичная настройка уже выполнена'},{status:409});
    const {user,token}=result;
    const res=NextResponse.json({id:user.id,name:user.name,email:user.email,role:user.role},{status:201});
    res.cookies.set(sessionCookie(token));return res;
  }catch(error){return apiError(error)}
}
