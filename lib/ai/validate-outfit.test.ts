import { describe, expect, it } from 'vitest'
import { buildCatalog } from './catalog'
import { validateOutfit } from './validate-outfit'
import { Item } from '../supabase'

const base = { color: 'черный', season: 'Демисезон', warmth: 3, formality: 2, photo_url: null, created_at: '2026-01-01T00:00:00Z' }
const item = (id: string, category: string, style: string, ai_meta?: Record<string, unknown>): Item => ({ id, category, style, ai_meta, ...base })

describe('outfit validation', () => {
  it('passes an explicitly training-suitable item through catalog validation', () => {
    const catalog = buildCatalog([
      item('top', 'Верх', 'Повседневный', { training_suitable: true }),
      item('bottom', 'Низ', 'Спортивный'),
      item('shoes', 'Обувь', 'Спортивный'),
    ])

    expect(validateOutfit(catalog, undefined, { occasion: 'Тренировка', style: 'Спортивный' })).toEqual([])
  })
})
