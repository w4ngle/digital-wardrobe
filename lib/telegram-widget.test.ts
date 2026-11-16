import { describe, expect, it } from 'vitest'
import { deflateSync } from 'node:zlib'
import { outfitWidgetHtml, outfitWidgetState, parseOutfitWidgetAction } from './telegram-widget'
import { Item } from './supabase'

const item: Item = { id: '1', category: 'Верх', color: 'белый', season: 'Лето', style: 'Повседневный', photo_url: null, description: '<Белая майка>', created_at: '2026-01-01' }

describe('Telegram outfit widget', () => {
  it('builds compact state without putting item text into HTML', () => {
    expect(outfitWidgetState('session', [item])).toMatchObject({ status: 'ready', items: [{ category: 'Верх', name: '👕 <Белая майка>' }] })
    expect(outfitWidgetHtml()).not.toContain('<Белая майка>')
  })

  it('accepts only known actions with a UUID session', () => {
    const id = '123e4567-e89b-12d3-a456-426614174000'
    expect(parseOutfitWidgetAction(`w:wear:${id}`)).toEqual({ action: 'wear', sessionId: id })
    expect(parseOutfitWidgetAction(`w:delete:${id}`)).toBeNull()
    expect(parseOutfitWidgetAction('w:wear:not-a-uuid')).toBeNull()
  })

  it('fits Telegram widget limits', () => {
    const html = outfitWidgetHtml()
    expect(Buffer.byteLength(html)).toBeLessThanOrEqual(32768)
    expect(deflateSync(html, { level: 9 }).byteLength).toBeLessThanOrEqual(4096)
  })
})
