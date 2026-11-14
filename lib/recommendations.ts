import { Item } from './supabase'

export const OCCASIONS = ['На каждый день', 'Университет', 'Обычная прогулка', 'Прогулка в центре', 'Магазин / ПВЗ', 'Ресторан', 'Свидание', 'В гости', 'Праздник / на выход', 'Деловое выступление', 'Поездка', 'Тренировка', 'Пляж / бассейн', 'Активный отдых'] as const
export const WEATHER = ['Тепло', 'Прохладно', 'Холодно'] as const

export type Occasion = typeof OCCASIONS[number]
export type Weather = typeof WEATHER[number]

export type OutfitRequest = {
  occasion: Occasion
  weather: Weather
  style: string
  rain?: boolean
}

export type OutfitRecommendation = {
  items: Item[]
  reason: string
  score: number
}

export type OutfitPreferences = Record<string, number> | { itemScores: Record<string, number>, rejectedCombos: string[][] }

function learnedPreferences(preferences: OutfitPreferences) {
  const structured = typeof preferences.itemScores === 'object'
  return structured
    ? preferences as { itemScores: Record<string, number>, rejectedCombos: string[][] }
    : { itemScores: preferences as Record<string, number>, rejectedCombos: [] }
}

const targetWarmth: Record<Weather, number> = { Тепло: 1, Прохладно: 3, Холодно: 5 }
const targetFormality: Record<Occasion, number> = {
  'На каждый день': 2,
  Университет: 3,
  'Обычная прогулка': 1,
  'Прогулка в центре': 2,
  'Магазин / ПВЗ': 1,
  Ресторан: 4,
  Свидание: 4,
  'В гости': 3,
  'Праздник / на выход': 5,
  'Деловое выступление': 5,
  Поездка: 2,
  Тренировка: 1,
  'Пляж / бассейн': 1,
  'Активный отдых': 1,
}
const neutralColors = ['бел', 'черн', 'сер', 'беж', 'корич', 'молоч', 'джинс', 'темно-син']
const colorPairs = [['син', 'беж'], ['голуб', 'корич'], ['зелен', 'беж'], ['бордов', 'сер'], ['красн', 'черн']]

function includesColor(color: string, samples: string[]) {
  const normalized = color.toLowerCase().replace('ё', 'е')
  return samples.some((sample) => normalized.includes(sample))
}

function colorScore(first: string, second: string) {
  const a = first.toLowerCase()
  const b = second.toLowerCase()
  if (a === b) return 1
  if (includesColor(a, neutralColors) || includesColor(b, neutralColors)) return 2
  return colorPairs.some(([left, right]) =>
    (a.includes(left) && b.includes(right)) || (a.includes(right) && b.includes(left))
  ) ? 2 : 0
}

function outfitBalance(items: Item[]) {
  if (items.length < 2) return 0
  const warmth = items.map(inferredWarmth)
  const formality = items.map(inferredFormality)
  const warmthSpread = Math.max(...warmth) - Math.min(...warmth)
  const formalitySpread = Math.max(...formality) - Math.min(...formality)
  return Math.max(0, 3 - warmthSpread) + Math.max(0, 3 - formalitySpread)
}

function inferredWarmth(item: Item) {
  if (item.warmth) return item.warmth
  if (item.season === 'Лето') return 1
  if (item.season === 'Зима') return 5
  return 3
}

function inferredFormality(item: Item) {
  if (item.formality) return item.formality
  if (item.style === 'Деловой' || item.style === 'Нарядный') return 4
  if (item.style === 'Спортивный') return 1
  return 2
}

function itemScore(item: Item, request: OutfitRequest, preferences: OutfitPreferences = {}) {
  const style = item.style === request.style ? 4 : item.style === 'Повседневный' ? 1 : 0
  const warmth = 3 - Math.abs(inferredWarmth(item) - targetWarmth[request.weather])
  const formality = 3 - Math.abs(inferredFormality(item) - targetFormality[request.occasion])
  const scores = learnedPreferences(preferences).itemScores
  const comfort = (item.comfort || 3) - 3
  const confidence = (item.confidence || 3) - 3
  return style + warmth + formality + comfort + confidence + (scores[item.id] || 0)
}

function buildReason(request: OutfitRequest, hasOuterwear: boolean) {
  const layer = hasOuterwear ? ' Добавлен верхний слой для комфорта.' : ''
  return `${request.style} образ для повода «${request.occasion.toLowerCase()}» и погоды «${request.weather.toLowerCase()}». Цвета и уровень формальности сочетаются.${layer}`
}

export function recommendOutfits(items: Item[], request: OutfitRequest, limit = 3, preferences: OutfitPreferences = {}): OutfitRecommendation[] {
  const today = new Date().toISOString().slice(0, 10)
  const availableItems = items.filter((item) => (!item.availability || item.availability === 'available') && (!item.snoozed_until || item.snoozed_until < today))
  const byCategory = (category: string) => availableItems
    .filter((item) => item.category === category)
    .sort((a, b) => itemScore(b, request, preferences) - itemScore(a, request, preferences))
    .slice(0, 8)

  const tops = byCategory('Верх').filter((item) => item.layer_role !== 'Второй слой')
  const bottoms = byCategory('Низ')
  const shoes: Array<Item | null> = byCategory('Обувь')
  if (shoes.length === 0) shoes.push(null)

  const outerwearItems = byCategory('Верхняя одежда')
  const outerwear: Array<Item | null> = request.weather === 'Тепло'
    ? [null]
    : outerwearItems.length > 0 ? outerwearItems : [null]
  const secondLayers: Array<Item | null> = request.weather === 'Тепло' ? [null] : [null, ...byCategory('Верх').filter((item) => item.layer_role === 'Второй слой').slice(0, 3)]
  const extras: Array<Item | null> = [null, ...byCategory('Сумка').slice(0, 2), ...byCategory('Аксессуар').slice(0, 2)]
  const candidates: OutfitRecommendation[] = []
  const cores: Item[][] = []

  if (request.occasion === 'Пляж / бассейн') byCategory('Купальник').forEach((item) => cores.push([item]))
  else {
    for (const top of tops) for (const bottom of bottoms) cores.push([top, bottom])
    byCategory('Платье').forEach((item) => cores.push([item]))
    byCategory('Комплект').forEach((item) => cores.push([item]))
  }

  for (const core of cores) {
      for (const shoe of shoes) {
        for (const layer of outerwear) {
          for (const secondLayer of secondLayers) {
          for (const extra of extras) {
            const outfit = [...core, shoe, secondLayer, layer, extra].filter((item): item is Item => item !== null)
            const itemTotal = outfit.reduce((sum, item) => sum + itemScore(item, request, preferences), 0)
            const colors = core.length > 1 ? colorScore(core[0].color, core[1].color) : 2
            const coldLayerPenalty = request.weather === 'Холодно' && !layer ? -5 : 0
            const rainPenalty = request.rain && !outfit.some((item) => item.rain_safe) ? -5 : 0
            const printPenalty = outfit.filter((item) => item.pattern && item.pattern !== 'Однотонная').length > 1 ? -3 : 0
            candidates.push({
              items: outfit,
              score: itemTotal + colors + outfitBalance(outfit) + coldLayerPenalty + rainPenalty + printPenalty,
              reason: buildReason(request, Boolean(layer)),
            })
          }
          }
        }
      }
  }

  if (candidates.length === 0) {
    const fallback = [...availableItems]
      .sort((a, b) => itemScore(b, request, preferences) - itemScore(a, request, preferences))
      .filter((item, index, sorted) => sorted.findIndex((candidate) => candidate.category === item.category) === index)
      .slice(0, 4)
    return fallback.length >= 2 ? [{
      items: fallback,
      score: fallback.reduce((sum, item) => sum + itemScore(item, request, preferences), 0),
      reason: buildReason(request, fallback.some((item) => item.category === 'Верхняя одежда')),
    }] : []
  }

  const unique = candidates
    .sort((a, b) => b.score - a.score)
    .filter((candidate, index, sorted) => {
      const key = candidate.items.map((item) => item.id).sort().join(':')
      const rejected = learnedPreferences(preferences).rejectedCombos.some((combo) => {
        const ids = new Set(candidate.items.map((item) => item.id))
        return combo.filter((id) => ids.has(id)).length >= Math.max(2, Math.min(combo.length, ids.size) - 1)
      })
      return !rejected && sorted.findIndex((other) => other.items.map((item) => item.id).sort().join(':') === key) === index
    })

  const varied: OutfitRecommendation[] = []
  for (const candidate of unique) {
    const core = candidate.items.filter((item) => !['Аксессуар', 'Сумка'].includes(item.category))
    const isTooSimilar = varied.some((selected) => {
      const selectedIds = new Set(selected.items.filter((item) => !['Аксессуар', 'Сумка'].includes(item.category)).map((item) => item.id))
      return core.filter((item) => selectedIds.has(item.id)).length >= Math.max(2, core.length - 1)
    })
    if (!isTooSimilar || varied.length === 0) varied.push(candidate)
    if (varied.length === limit) return varied
  }

  return [...varied, ...unique.filter((candidate) => !varied.includes(candidate))].slice(0, limit)
}

export function replaceOutfitItem(items: Item[], result: OutfitRecommendation, itemId: string, request: OutfitRequest, preferences: OutfitPreferences = {}) {
  const current = result.items.find((item) => item.id === itemId)
  if (!current) return result
  const used = new Set(result.items.map((item) => item.id))
  const replacement = items
    .filter((item) => item.category === current.category && !used.has(item.id) && (!item.availability || item.availability === 'available'))
    .sort((a, b) => itemScore(b, request, preferences) - itemScore(a, request, preferences))[0]
  return replacement ? { ...result, items: result.items.map((item) => item.id === itemId ? replacement : item) } : result
}

export function buildPackingList(items: Item[], request: OutfitRequest, days: number) {
  const outfits = recommendOutfits(items, request, Math.min(Math.max(days, 2), 14))
  const packed = new Map<string, Item>()
  outfits.forEach((outfit) => outfit.items.forEach((item) => packed.set(item.id, item)))
  return [...packed.values()]
}

export function recommendOutfit(items: Item[], season: string, style: string) {
  const weather: Weather = season === 'Зима' ? 'Холодно' : season === 'Лето' ? 'Тепло' : 'Прохладно'
  return recommendOutfits(items, { occasion: 'На каждый день', weather, style }, 1)[0] ?? null
}
