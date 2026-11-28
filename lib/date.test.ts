import { describe, expect, it } from 'vitest'
import { moscowDate, moscowDayStart } from './date'

describe('Moscow dates', () => {
  it('keeps late-night Moscow activity in the correct local day', () => {
    const moment = new Date('2026-11-27T21:30:00Z')
    expect(moscowDate(moment)).toBe('2026-11-28')
    expect(moscowDayStart(moment).toISOString()).toBe('2026-11-27T21:00:00.000Z')
  })
})
