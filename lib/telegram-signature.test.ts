import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { createSession, validateTelegramInitData, verifySession } from './telegram-signature'

function signedInitData(botToken: string, userId: number, authDate: number) {
  const params = new URLSearchParams({ auth_date: String(authDate), user: JSON.stringify({ id: userId }) })
  const check = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')
  const secret = createHmac('sha256', 'WebAppData').update(botToken).digest()
  params.set('hash', createHmac('sha256', secret).update(check).digest('hex'))
  return params.toString()
}

describe('Telegram signatures', () => {
  it('accepts fresh initData only for the allowed user', () => {
    const initData = signedInitData('bot-token', 42, 1_000)
    expect(validateTelegramInitData(initData, 'bot-token', 42, 1_001)).toBe(42)
    expect(validateTelegramInitData(initData, 'bot-token', 7, 1_001)).toBeNull()
  })

  it('rejects a changed session', () => {
    const session = createSession(42, 'bot-token', 1_000)
    expect(verifySession(session, 'bot-token', 42, 1_001)).toBe(true)
    expect(verifySession(`${session}changed`, 'bot-token', 42, 1_001)).toBe(false)
  })

  it('accepts either person in a shared wardrobe', () => {
    const initData = signedInitData('bot-token', 7, 1_000)
    expect(validateTelegramInitData(initData, 'bot-token', [42, 7], 1_001)).toBe(7)
    expect(verifySession(createSession(7, 'bot-token', 1_000), 'bot-token', [42, 7], 1_001)).toBe(true)
  })

  it('rejects initData dated in the future', () => {
    const initData = signedInitData('bot-token', 42, 2_000)
    expect(validateTelegramInitData(initData, 'bot-token', 42, 1_000)).toBeNull()
  })
})
