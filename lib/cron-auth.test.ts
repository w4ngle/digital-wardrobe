import { afterEach, describe, expect, it } from 'vitest'
import { isCronRequest } from './cron-auth'

describe('isCronRequest', () => {
  const original = process.env.CRON_SECRET
  afterEach(() => { process.env.CRON_SECRET = original })

  it('accepts the configured secret and rejects other requests', () => {
    process.env.CRON_SECRET = 'secret'
    expect(isCronRequest(new Request('https://example.test', { headers: { authorization: 'Bearer secret' } }))).toBe(true)
    expect(isCronRequest(new Request('https://example.test'))).toBe(false)
  })

  it('does not trust a spoofable cron header', () => {
    delete process.env.CRON_SECRET
    expect(isCronRequest(new Request('https://example.test', { headers: { 'x-vercel-cron': '1' } }))).toBe(false)
  })
})
