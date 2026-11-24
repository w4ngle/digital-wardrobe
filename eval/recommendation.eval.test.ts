import { describe, expect, it } from 'vitest'
import { recommendOutfits } from '../lib/recommendations'
import { Item } from '../lib/supabase'

const item = (id: string, category: string, style = 'Повседневный', warmth = 3, extra: Partial<Item> = {}): Item => ({
  id, category, style, warmth, color: 'черный', season: warmth >= 4 ? 'Зима' : warmth <= 2 ? 'Лето' : 'Демисезон',
  formality: 2, photo_url: null, created_at: '2026-01-01T00:00:00Z', ...extra,
})

describe('recommendation constraint evaluation', () => {
  it.each([
    {
      name: 'beach excludes warm layers',
      wardrobe: [item('swim', 'Купальник', 'Отпускной', 1), item('coat', 'Верхняя одежда', 'Повседневный', 5)],
      request: { occasion: 'Пляж / бассейн' as const, weather: 'Тепло' as const, style: 'Отпускной' },
      valid: (ids: string[]) => ids.includes('swim') && !ids.includes('coat'),
    },
    {
      name: 'training accepts explicit suitability only',
      wardrobe: [item('training-top', 'Верх', 'Повседневный', 2, { ai_meta: { training_suitable: true } }), item('casual-top', 'Верх'), item('leggings', 'Низ', 'Спортивный'), item('shoes', 'Обувь', 'Спортивный')],
      request: { occasion: 'Тренировка' as const, weather: 'Тепло' as const, style: 'Спортивный' },
      valid: (ids: string[]) => ids.includes('training-top') && !ids.includes('casual-top'),
    },
    {
      name: 'cold weather adds outerwear',
      wardrobe: [item('top', 'Верх', 'Повседневный', 4), item('bottom', 'Низ', 'Повседневный', 4), item('coat', 'Верхняя одежда', 'Повседневный', 5)],
      request: { occasion: 'Прогулка' as const, weather: 'Холодно' as const, style: 'Повседневный' },
      valid: (ids: string[]) => ids.includes('coat'),
    },
    {
      name: 'required item survives ranking cutoff',
      wardrobe: [...Array.from({ length: 7 }, (_, index) => item(`top-${index}`, 'Верх', 'Повседневный', 3, { confidence: 5 - Math.min(index, 4) })), item('bottom', 'Низ')],
      request: { occasion: 'На каждый день' as const, weather: 'Прохладно' as const, style: 'Повседневный', requiredItemId: 'top-6' },
      valid: (ids: string[]) => ids.includes('top-6'),
    },
    {
      name: 'laundry item is excluded',
      wardrobe: [item('available-top', 'Верх'), item('laundry-top', 'Верх', 'Повседневный', 3, { availability: 'laundry' }), item('bottom', 'Низ')],
      request: { occasion: 'На каждый день' as const, weather: 'Прохладно' as const, style: 'Повседневный' },
      valid: (ids: string[]) => ids.includes('available-top') && !ids.includes('laundry-top'),
    },
  ])('$name', ({ wardrobe, request, valid }) => {
    const result = recommendOutfits(wardrobe, request, 1)[0]
    expect(result).toBeDefined()
    expect(valid(result.items.map((candidate) => candidate.id))).toBe(true)
  })
})
