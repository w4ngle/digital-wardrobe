import { describe, expect, it } from 'vitest'
import { Item } from './supabase'
import { buildPackingList, recommendOutfits, replaceOutfitItem } from './recommendations'

const item = (id: string, category: string, color: string, style = 'Повседневный', warmth = 3): Item => ({
  id, category, color, style, warmth,
  formality: style === 'Деловой' ? 4 : 2,
  season: warmth >= 4 ? 'Зима' : warmth <= 2 ? 'Лето' : 'Демисезон',
  photo_url: null,
  created_at: '2026-01-01T00:00:00Z',
})

describe('recommendOutfits', () => {
  it('prefers matching style', () => {
    const [result] = recommendOutfits([
      item('top-casual', 'Верх', 'белый'),
      item('top-sport', 'Верх', 'красный', 'Спортивный'),
      item('bottom', 'Низ', 'синий'),
      item('shoes', 'Обувь', 'белый'),
    ], { occasion: 'На каждый день', weather: 'Прохладно', style: 'Повседневный' })

    expect(result.items.map((candidate) => candidate.id)).toContain('top-casual')
  })

  it('adds outerwear for cold weather', () => {
    const [result] = recommendOutfits([
      item('top', 'Верх', 'белый', 'Повседневный', 4),
      item('bottom', 'Низ', 'черный', 'Повседневный', 4),
      item('coat', 'Верхняя одежда', 'серый', 'Повседневный', 5),
    ], { occasion: 'Обычная прогулка', weather: 'Холодно', style: 'Повседневный' })

    expect(result.items.map((candidate) => candidate.id)).toContain('coat')
  })

  it('returns a fallback for a small wardrobe', () => {
    const results = recommendOutfits([
      item('top', 'Верх', 'белый'),
      item('shoes', 'Обувь', 'черный'),
    ], { occasion: 'На каждый день', weather: 'Тепло', style: 'Повседневный' })

    expect(results[0].items).toHaveLength(2)
  })

  it('adds the best matching accessory when available', () => {
    const [result] = recommendOutfits([
      item('top', 'Верх', 'белый'),
      item('bottom', 'Низ', 'черный'),
      item('shoes', 'Обувь', 'белый'),
      item('cap', 'Аксессуар', 'зеленый'),
    ], { occasion: 'Обычная прогулка', weather: 'Тепло', style: 'Повседневный' })

    expect(result.items.map((candidate) => candidate.id)).toContain('cap')
  })

  it('returns meaningfully different variants when the wardrobe allows it', () => {
    const results = recommendOutfits([
      item('top-1', 'Верх', 'белый'),
      item('top-2', 'Верх', 'серый'),
      item('bottom-1', 'Низ', 'черный'),
      item('bottom-2', 'Низ', 'синий'),
      item('shoes-1', 'Обувь', 'белый'),
      item('shoes-2', 'Обувь', 'черный'),
    ], { occasion: 'На каждый день', weather: 'Тепло', style: 'Повседневный' })

    expect(results).toHaveLength(3)
    expect(new Set(results.flatMap((result) => result.items.map((candidate) => candidate.id))).size).toBeGreaterThan(3)
  })

  it('excludes unavailable items and learns from ratings', () => {
    const unavailable = { ...item('top-best', 'Верх', 'белый'), availability: 'laundry' as const }
    const [result] = recommendOutfits([
      unavailable,
      item('top-liked', 'Верх', 'серый'),
      item('top-other', 'Верх', 'красный'),
      item('bottom', 'Низ', 'черный'),
    ], { occasion: 'На каждый день', weather: 'Прохладно', style: 'Повседневный' }, 1, { 'top-liked': 5 })

    expect(result.items.map((candidate) => candidate.id)).toContain('top-liked')
    expect(result.items.map((candidate) => candidate.id)).not.toContain('top-best')
  })

  it('replaces one item with another item from the same category', () => {
    const wardrobe = [item('top-1', 'Верх', 'белый'), item('top-2', 'Верх', 'серый'), item('bottom', 'Низ', 'черный')]
    const request = { occasion: 'На каждый день' as const, weather: 'Прохладно' as const, style: 'Повседневный' }
    const result = recommendOutfits(wardrobe, request, 1)[0]
    const replaced = replaceOutfitItem(wardrobe, result, 'top-1', request)

    expect(replaced.items.map((candidate) => candidate.id)).toContain('top-2')
  })

  it('builds a unique packing list from compatible outfits', () => {
    const packed = buildPackingList([
      item('top-1', 'Верх', 'белый'), item('top-2', 'Верх', 'серый'),
      item('bottom-1', 'Низ', 'черный'), item('bottom-2', 'Низ', 'синий'),
      item('shoes', 'Обувь', 'белый'),
    ], { occasion: 'На каждый день', weather: 'Тепло', style: 'Повседневный' }, 3)

    expect(new Set(packed.map((candidate) => candidate.id)).size).toBe(packed.length)
    expect(packed.length).toBeGreaterThanOrEqual(3)
  })

  it('builds an outfit around a dress without requiring a top and bottom', () => {
    const [result] = recommendOutfits([
      item('dress', 'Платье', 'черный', 'Нарядный', 2),
      item('shoes', 'Обувь', 'черный', 'Нарядный', 2),
    ], { occasion: 'Праздник / на выход', weather: 'Тепло', style: 'Нарядный' })

    expect(result.items.map((candidate) => candidate.id)).toContain('dress')
  })

  it('does not repeat a rejected combination', () => {
    const wardrobe = [
      item('top-1', 'Верх', 'белый'), item('top-2', 'Верх', 'серый'),
      item('bottom-1', 'Низ', 'черный'), item('bottom-2', 'Низ', 'синий'),
    ]
    const [result] = recommendOutfits(wardrobe, { occasion: 'На каждый день', weather: 'Тепло', style: 'Повседневный' }, 1, {
      itemScores: {}, rejectedCombos: [['top-1', 'bottom-1']],
    })

    expect(result.items.map((candidate) => candidate.id).sort()).not.toEqual(['bottom-1', 'top-1'])
  })

  it('keeps beach outfits light and focused on swimwear', () => {
    const swimsuit = { ...item('swimsuit', 'Купальник', 'бирюзовый', 'Отпускной', 1), subcategory: 'Раздельный купальник' }
    const [result] = recommendOutfits([
      swimsuit,
      { ...item('jacket', 'Верхняя одежда', 'синий', 'Повседневный', 4), subcategory: 'Куртка' },
      { ...item('hoodie', 'Верх', 'серый', 'Повседневный', 4), layer_role: 'Второй слой' },
      item('dress', 'Платье', 'белый', 'Нарядный', 1),
    ], { occasion: 'Пляж / бассейн', weather: 'Тепло', style: 'Отпускной' })

    expect(result.items.map((candidate) => candidate.id)).toEqual(['swimsuit'])
  })

  it('handles a large wardrobe without generating excessive combinations', () => {
    const wardrobe = Array.from({ length: 60 }, (_, index) => item(
      `item-${index}`,
      index % 3 === 0 ? 'Верх' : index % 3 === 1 ? 'Низ' : 'Обувь',
      index % 2 ? 'черный' : 'белый',
    ))
    const started = performance.now()
    expect(recommendOutfits(wardrobe, { occasion: 'На каждый день', weather: 'Прохладно', style: 'Повседневный' })).toHaveLength(3)
    expect(performance.now() - started).toBeLessThan(500)
  })
})
