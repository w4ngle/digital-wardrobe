import 'server-only'

import { cookies } from 'next/headers'
import {
  createSession as createSignedSession,
  telegramSessionMaxAge,
  validateTelegramInitData as validateInitData,
  verifySession,
} from './telegram-signature'

const COOKIE_NAME = 'wardrobe_session'

function botToken() {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN is missing')
  return token
}

export function validateTelegramInitData(initData: string) {
  return validateInitData(initData, botToken(), Number(process.env.TELEGRAM_ALLOWED_USER_ID))
}

export function createSession(userId: number) {
  return createSignedSession(userId, botToken())
}

export async function hasValidSession() {
  if (process.env.NODE_ENV === 'development') return true

  const token = (await cookies()).get(COOKIE_NAME)?.value
  if (!token) return false

  return verifySession(token, botToken(), Number(process.env.TELEGRAM_ALLOWED_USER_ID))
}

export const telegramSession = {
  name: COOKIE_NAME,
  maxAge: telegramSessionMaxAge,
}
