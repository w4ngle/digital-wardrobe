import { describe, expect, it } from 'vitest'
import { Item } from './supabase'
import { buildPackingList, pickDailyOutfit, recommendOutfits, replaceOutfitItem } from './recommendations'

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
    ], { occasion: 'Прогулка', weather: 'Холодно', style: 'Повседневный' })

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
    ], { occasion: 'Прогулка', weather: 'Тепло', style: 'Повседневный' })

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
    const baseKeys = results.map((result) => result.items
      .filter((candidate) => ['Верх', 'Низ', 'Платье', 'Комплект'].includes(candidate.category))
      .map((candidate) => candidate.id).sort().join(':'))
    expect(new Set(baseKeys).size).toBe(results.length)
  })

  it('rotates the morning outfit away from recently sent combinations', () => {
    const candidates = [
      { items: [item('top-1', 'Верх', 'белый'), item('bottom-1', 'Низ', 'черный')], reason: '', score: 10 },
      { items: [item('top-2', 'Верх', 'серый'), item('bottom-2', 'Низ', 'синий')], reason: '', score: 9 },
    ]
    const picked = pickDailyOutfit(candidates, [['top-1', 'bottom-1']], new Date('2026-11-27T08:00:00Z'))
    expect(picked?.items.map((candidate) => candidate.id).sort()).toEqual(['bottom-2', 'top-2'])
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

  it('keeps dresses competitive and never adds a second top over them', () => {
    const results = recommendOutfits([
      { ...item('dress', 'Платье', 'молочный', 'Нарядный', 3), custom_name: 'Молочное платье' },
      { ...item('shirt', 'Верх', 'голубой', 'Нарядный', 3), layer_role: 'Базовый слой' },
      item('trousers', 'Низ', 'бежевый', 'Нарядный', 3),
      { ...item('cardigan', 'Верх', 'молочный', 'Нарядный', 3), layer_role: 'Второй слой' },
      item('shoes', 'Обувь', 'черный', 'Нарядный', 3),
      item('coat', 'Верхняя одежда', 'бежевый', 'Нарядный', 4),
    ], { occasion: 'Ресторан / свидание', weather: 'Прохладно', style: 'Нарядный' }, 3)

    const dressOutfit = results.find((result) => result.items.some((candidate) => candidate.id === 'dress'))
    expect(dressOutfit).toBeDefined()
    expect(dressOutfit?.items.some((candidate) => candidate.category === 'Верх')).toBe(false)
  })

  it('removes visually duplicated demo variants', () => {
    const [result] = recommendOutfits([
      { ...item('shirt-1', 'Верх', 'голубой', 'Деловой', 2), custom_name: 'Голубая рубашка', layer_role: 'Базовый слой' },
      { ...item('shirt-2', 'Верх', 'голубой', 'Деловой', 2), custom_name: 'Голубая рубашка · вариант 8', layer_role: 'Второй слой' },
      item('trousers', 'Низ', 'бежевый', 'Деловой', 2),
      item('shoes', 'Обувь', 'коричневый', 'Деловой', 2),
    ], { occasion: 'Деловое выступление', weather: 'Прохладно', style: 'Деловой' })

    expect(result.items.filter((candidate) => candidate.custom_name?.startsWith('Голубая рубашка'))).toHaveLength(1)
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

  it('allows beach accessories but never a scarf', () => {
    const results = recommendOutfits([
      { ...item('swimsuit', 'Купальник', 'коралловый', 'Отпускной', 1), subcategory: 'Раздельный купальник' },
      { ...item('sandals', 'Обувь', 'бежевый', 'Отпускной', 1), subcategory: 'Сандалии' },
      { ...item('coverup', 'Верх', 'белый', 'Отпускной', 1), subcategory: 'Пляжная накидка' },
      { ...item('bag', 'Сумка', 'бежевый', 'Отпускной', 1), subcategory: 'Пляжная сумка' },
      { ...item('glasses', 'Аксессуар', 'черный', 'Отпускной', 1), subcategory: 'Очки' },
      { ...item('scarf', 'Аксессуар', 'бордовый', 'Повседневный', 4), subcategory: 'Шарф' },
    ], { occasion: 'Пляж / бассейн', weather: 'Тепло', style: 'Отпускной' })

    expect(results.some((result) => result.items.some((candidate) => candidate.id === 'sandals'))).toBe(true)
    expect(results.flatMap((result) => result.items.map((candidate) => candidate.id))).not.toContain('scarf')
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

  it('keeps training outfits sporty and removes visual duplicates', () => {
    const duplicatePhoto = 'https://example.com/hoodie.png'
    const [result] = recommendOutfits([
      { ...item('hoodie-1', 'Верх', 'серый', 'Спортивный'), photo_url: duplicatePhoto },
      { ...item('hoodie-2', 'Верх', 'серый', 'Спортивный'), photo_url: `${duplicatePhoto}?signed=1`, layer_role: 'Второй слой' },
      item('leggings', 'Низ', 'черный', 'Спортивный'),
      item('sneakers', 'Обувь', 'серый', 'Спортивный'),
      { ...item('jacket', 'Верхняя одежда', 'черный'), subcategory: 'Косуха' },
      { ...item('belt', 'Аксессуар', 'черный'), subcategory: 'Ремень' },
    ], { occasion: 'Тренировка', weather: 'Прохладно', style: 'Спортивный' })

    expect(result.items.filter((candidate) => candidate.photo_url?.startsWith(duplicatePhoto))).toHaveLength(1)
    expect(result.items.map((candidate) => candidate.id)).not.toContain('jacket')
    expect(result.items.map((candidate) => candidate.id)).not.toContain('belt')
  })

  it('does not put a warm sweater over another warm sweater', () => {
    const results = recommendOutfits([
      { ...item('sweater', 'Верх', 'кремовый', 'Повседневный', 4), subcategory: 'Свитер' },
      { ...item('second-sweater', 'Верх', 'молочный', 'Повседневный', 4), subcategory: 'Свитер', layer_role: 'Второй слой' },
      item('jeans', 'Низ', 'черный', 'Повседневный', 4),
      item('boots', 'Обувь', 'черный', 'Повседневный', 4),
    ], { occasion: 'Прогулка', weather: 'Холодно', style: 'Повседневный' })

    expect(results.every((result) => !result.items.some((candidate) => candidate.id === 'second-sweater'))).toBe(true)
  })

  it('allows explicitly marked training clothes but excludes ordinary clothes', () => {
    const [result] = recommendOutfits([
      { ...item('marked-top', 'Верх', 'белый'), training_suitable: true },
      item('ordinary-top', 'Верх', 'черный'),
      item('sport-bottom', 'Низ', 'черный', 'Спортивный'),
      item('sport-shoes', 'Обувь', 'белый', 'Спортивный'),
    ], { occasion: 'Тренировка', weather: 'Тепло', style: 'Спортивный' })

    expect(result.items.map((candidate) => candidate.id)).toContain('marked-top')
    expect(result.items.map((candidate) => candidate.id)).not.toContain('ordinary-top')
  })

  it('keeps a required available item even when it ranks below the category limit', () => {
    const wardrobe = [
      ...Array.from({ length: 7 }, (_, index) => ({ ...item(`top-${index}`, 'Верх', 'белый'), confidence: 5 - Math.min(index, 4) })),
      item('bottom', 'Низ', 'черный'),
    ]
    const [result] = recommendOutfits(wardrobe, { occasion: 'На каждый день', weather: 'Тепло', style: 'Повседневный', requiredItemId: 'top-6' }, 1)

    expect(result.items.map((candidate) => candidate.id)).toContain('top-6')
  })
})
