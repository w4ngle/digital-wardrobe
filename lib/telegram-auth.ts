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

export function allowedTelegramUserIds() {
  const value = process.env.TELEGRAM_ALLOWED_USER_IDS || process.env.TELEGRAM_ALLOWED_USER_ID || ''
  return value.split(',').map(Number).filter(Number.isSafeInteger)
}

export function validateTelegramInitData(initData: string) {
  return validateInitData(initData, botToken(), allowedTelegramUserIds())
}

export function createSession(userId: number) {
  return createSignedSession(userId, botToken())
}

export async function hasValidSession() {
  if (process.env.NODE_ENV === 'development') return true

  return Boolean(await currentTelegramUserId())
}

export async function currentTelegramUserId() {
  if (process.env.NODE_ENV === 'development') return allowedTelegramUserIds()[0] || 1

  const token = (await cookies()).get(COOKIE_NAME)?.value
  if (!token) return null

  if (!verifySession(token, botToken(), allowedTelegramUserIds())) return null
  return Number(token.split('.')[0])
}

export const telegramSession = {
  name: COOKIE_NAME,
  maxAge: telegramSessionMaxAge,
}
