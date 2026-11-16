import { createHmac, timingSafeEqual } from 'node:crypto'

function secret() {
  const value = process.env.TELEGRAM_BOT_TOKEN
  if (!value) throw new Error('TELEGRAM_BOT_TOKEN is missing')
  return value
}

export function outfitCardToken(sessionId: string) {
  return createHmac('sha256', secret()).update(sessionId).digest('hex')
}

export function isValidOutfitCardToken(sessionId: string, token: string | null) {
  if (!token || !/^[0-9a-f]{64}$/i.test(token)) return false
  return timingSafeEqual(Buffer.from(outfitCardToken(sessionId)), Buffer.from(token))
}
