import { afterEach, describe, expect, it } from 'vitest'
import { isValidOutfitCardToken, outfitCardToken } from './outfit-card-token'

const original = process.env.TELEGRAM_BOT_TOKEN
afterEach(() => { process.env.TELEGRAM_BOT_TOKEN = original })

describe('outfit card token', () => {
  it('accepts only the signature for the same session', () => {
    process.env.TELEGRAM_BOT_TOKEN = 'test-token'
    const token = outfitCardToken('session-1')
    expect(isValidOutfitCardToken('session-1', token)).toBe(true)
    expect(isValidOutfitCardToken('session-2', token)).toBe(false)
    expect(isValidOutfitCardToken('session-1', 'bad')).toBe(false)
  })
})
