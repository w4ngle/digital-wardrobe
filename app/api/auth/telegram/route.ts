import { NextRequest, NextResponse } from 'next/server'
import {
  currentTelegramUserId,
  allowedTelegramUserIds,
  createSession,
  telegramSession,
  validateTelegramInitData,
} from '@/lib/telegram-auth'
import { telegramRoleForUser } from '@/lib/telegram-role'

export async function GET() {
  const userId = await currentTelegramUserId()
  const authorized = Boolean(userId)
  return NextResponse.json({ authorized, role: telegramRoleForUser(userId, allowedTelegramUserIds()) }, {
    status: authorized ? 200 : 401,
  })
}

export async function POST(request: NextRequest) {
  const { initData } = await request.json() as { initData?: string }
  const userId = initData ? validateTelegramInitData(initData) : null
  if (!userId) return NextResponse.json({ error: 'Доступ запрещён' }, { status: 401 })

  const response = NextResponse.json({ authorized: true, role: telegramRoleForUser(userId, allowedTelegramUserIds()) })
  response.cookies.set(telegramSession.name, createSession(userId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: telegramSession.maxAge,
  })
  return response
}
