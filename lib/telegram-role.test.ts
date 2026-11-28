import { describe, expect, it } from 'vitest'
import { telegramRoleForUser } from './telegram-role'

describe('telegramRoleForUser', () => {
  const allowed = [200, 100]

  it('treats the first configured user as owner', () => {
    expect(telegramRoleForUser(200, allowed)).toBe('owner')
  })

  it('treats the second configured user as partner', () => {
    expect(telegramRoleForUser(100, allowed)).toBe('partner')
  })

  it('rejects users outside the configured list', () => {
    expect(telegramRoleForUser(300, allowed)).toBeNull()
  })
})
