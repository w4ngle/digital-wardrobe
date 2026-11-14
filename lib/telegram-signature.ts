import { createHmac, timingSafeEqual } from 'node:crypto'

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30
const INIT_DATA_TTL_SECONDS = 60 * 60 * 24

function signature(value: string, botToken: string) {
  return createHmac('sha256', botToken).update(value).digest('hex')
}

export function validateTelegramInitData(
  initData: string,
  botToken: string,
  allowedUserId: number | number[],
  now = Math.floor(Date.now() / 1000)
) {
  const params = new URLSearchParams(initData)
  const hash = params.get('hash')
  const authDate = Number(params.get('auth_date'))
  const userJson = params.get('user')
  if (!hash || !authDate || !userJson) return null

  const dataCheckString = [...params.entries()]
    .filter(([key]) => key !== 'hash')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')
  const secret = createHmac('sha256', 'WebAppData').update(botToken).digest()
  const expected = createHmac('sha256', secret).update(dataCheckString).digest()
  const supplied = Buffer.from(hash, 'hex')

  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null
  if (now - authDate > INIT_DATA_TTL_SECONDS) return null

  try {
    const user = JSON.parse(userJson) as { id?: number }
    const allowed = Array.isArray(allowedUserId) ? allowedUserId : [allowedUserId]
    return user.id && allowed.includes(user.id) ? user.id : null
  } catch {
    return null
  }
}

export function createSession(userId: number, botToken: string, now = Math.floor(Date.now() / 1000)) {
  const expires = now + SESSION_TTL_SECONDS
  const value = `${userId}.${expires}`
  return `${value}.${signature(value, botToken)}`
}

export function verifySession(
  token: string,
  botToken: string,
  allowedUserId: number | number[],
  now = Math.floor(Date.now() / 1000)
) {
  const [userId, expires, supplied] = token.split('.')
  const value = `${userId}.${expires}`
  const expected = signature(value, botToken)
  if (!supplied || supplied.length !== expected.length) return false
  if (!timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) return false
  const allowed = Array.isArray(allowedUserId) ? allowedUserId : [allowedUserId]
  return Number(expires) > now && allowed.includes(Number(userId))
}

export const telegramSessionMaxAge = SESSION_TTL_SECONDS
