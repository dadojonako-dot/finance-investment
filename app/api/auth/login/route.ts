import {NextResponse} from 'next/server';
import {prisma} from '../../../../src/lib/prisma';
import {issueSession,sessionCookie,verifyPassword} from '../../../../src/auth/server';
import {clientIp,ipHash,reserveLogin} from '../../../../src/auth/login-limiter';
import {apiError} from '../../../../src/lib/api-error';
const dummy='$2b$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW';
export async function POST(req:Request){
 let finish:Awaited<ReturnType<typeof reserveLogin>>=null;
 try{
  const b=await req.json(),email=String(b.email||'').trim().toLowerCase(),password=String(b.password||'');
  if(!email||email.length>254||!password||password.length>1024)return NextResponse.json({error:'Введите email и пароль'},{status:400});
  const ip=clientIp(req);finish=await reserveLogin(ip,email);
  if(!finish)return NextResponse.json({error:'Слишком много попыток входа. Повторите позже.'},{status:429,headers:{'Retry-After':'900'}});
  const user=await prisma.user.findUnique({where:{email}});
  const matches=await verifyPassword(password,user?.passwordHash||dummy);
  if(!user||!user.isActive||!matches){
   await finish('failure');
   await prisma.auditLog.create({data:{userId:user?.id??null,entityType:'Auth',entityId:user?.id??'anonymous',action:'LOGIN_FAILED',newValue:{email,ipHash:ipHash(ip)}}});
   return NextResponse.json({error:'Неверный email или пароль'},{status:401});
  }
  const token=await issueSession(user);
  await prisma.auditLog.create({data:{userId:user.id,entityType:'Auth',entityId:user.id,action:'LOGIN_SUCCESS',newValue:{email,ipHash:ipHash(ip)}}});
  await finish('success');
  const res=NextResponse.json({id:user.id,name:user.name,email:user.email,role:user.role});res.cookies.set(sessionCookie(token));return res;
 }catch(error){if(finish)await finish('cancel');return apiError(error)}
}
