import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { InputError } from '../accounting/money';
export function apiError(error: unknown) {
  if (error instanceof InputError) return NextResponse.json({ error: error.message }, { status: 400 });
  if (error instanceof SyntaxError) return NextResponse.json({error:'Некорректный JSON'},{status:400});
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') return NextResponse.json({ error: 'Запись уже существует' }, { status: 409 });
    if (['P2003', 'P2025'].includes(error.code)) return NextResponse.json({ error: 'Связанная запись не найдена' }, { status: 400 });
  }
  // Prisma validation messages can contain input values. Log only a diagnostic class/code.
  console.error('API request failed',error instanceof Prisma.PrismaClientKnownRequestError?error.code:error instanceof Error?error.name:'UnknownError');
  return NextResponse.json({ error: 'Не удалось выполнить запрос' }, { status: 500 });
}
