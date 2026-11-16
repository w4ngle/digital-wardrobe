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
  transport?: 'Пешком' | 'Автобус' | 'Такси'
  requiredItemId?: string
  rediscover?: boolean
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
  const activeComfort = request.transport === 'Пешком' || request.transport === 'Автобус' ? comfort * 2 : comfort
  const daysSinceWorn = item.last_worn_at ? (Date.now() - new Date(item.last_worn_at).getTime()) / 86400000 : 90
  const rediscover = request.rediscover ? Math.min(4, daysSinceWorn / 30) : 0
  return style + warmth + formality + activeComfort + confidence + rediscover + (scores[item.id] || 0)
}

function buildReason(request: OutfitRequest, hasOuterwear: boolean) {
  const layer = hasOuterwear ? ' Добавлен верхний слой для комфорта.' : ''
  return `${request.style} образ для повода «${request.occasion.toLowerCase()}» и погоды «${request.weather.toLowerCase()}». Цвета и уровень формальности сочетаются.${layer}`
}

function itemIdentity(item: Item) {
  const photo = item.photo_url?.split('?')[0]
  return photo || `${item.category}|${item.subcategory}|${item.custom_name || item.description}|${item.color}`.toLowerCase()
}

export function recommendOutfits(items: Item[], request: OutfitRequest, limit = 3, preferences: OutfitPreferences = {}): OutfitRecommendation[] {
  const today = new Date().toISOString().slice(0, 10)
  const availableItems = items.filter((item) => (!item.availability || item.availability === 'available') && (!item.snoozed_until || item.snoozed_until < today))
  const byCategory = (category: string) => {
    const ranked = availableItems
    .filter((item) => item.category === category)
    .sort((a, b) => itemScore(b, request, preferences) - itemScore(a, request, preferences))
    .filter((item, index, sorted) => sorted.findIndex((candidate) => itemIdentity(candidate) === itemIdentity(item)) === index)
    const required = request.requiredItemId && ranked.find((item) => item.id === request.requiredItemId)
    return [...ranked.slice(0, 5), ...(required && !ranked.slice(0, 5).some((item) => item.id === required.id) ? [required] : [])]
  }

  const isBeach = request.occasion === 'Пляж / бассейн'
  const isTraining = request.occasion === 'Тренировка'

  const suitableForTraining = (item: Item) => item.id === request.requiredItemId || item.style === 'Спортивный' || item.training_suitable === true || item.ai_meta?.training_suitable === true
  const tops = byCategory('Верх').filter((item) => item.layer_role !== 'Второй слой' && (!isTraining || suitableForTraining(item)))
  const bottoms = byCategory('Низ').filter((item) => !isTraining || suitableForTraining(item))
  const shoes: Array<Item | null> = byCategory('Обувь').filter((item) => (!isTraining || suitableForTraining(item)) && (!isBeach || ['Сандалии', 'Босоножки', 'Обувь на платформе'].includes(item.subcategory || '')))
  if (shoes.length === 0) shoes.push(null)

  const outerwearItems = byCategory('Верхняя одежда').filter((item) => !isTraining || suitableForTraining(item))
  const outerwear: Array<Item | null> = isBeach || request.weather === 'Тепло'
    ? [null]
    : outerwearItems.length > 0 ? outerwearItems : [null]
  const secondLayers: Array<Item | null> = isBeach
    ? [null, ...byCategory('Верх').filter((item) => item.subcategory === 'Пляжная накидка').slice(0, 2)]
    : request.weather === 'Тепло' ? [null] : [null, ...byCategory('Верх').filter((item) => item.layer_role === 'Второй слой' && (!isTraining || suitableForTraining(item))).slice(0, 2)]
  const accessories = byCategory('Аксессуар').filter((item) => !isBeach || ['Очки', 'Головной убор'].includes(item.subcategory || ''))
  const extras: Array<Item | null> = isTraining ? [null] : [null, ...byCategory('Сумка').filter((item) => !isBeach || item.subcategory === 'Пляжная сумка').slice(0, 2), ...accessories.slice(0, 2)]
  const candidates = new Map<string, OutfitRecommendation>()
  const cores: Item[][] = []

  if (isBeach) byCategory('Купальник').forEach((item) => cores.push([item]))
  else {
    for (const top of tops) for (const bottom of bottoms) cores.push([top, bottom])
    byCategory('Платье').filter((item) => !isTraining || suitableForTraining(item)).forEach((item) => cores.push([item]))
    byCategory('Комплект').filter((item) => !isTraining || suitableForTraining(item)).forEach((item) => cores.push([item]))
  }

  for (const core of cores) {
      for (const shoe of shoes) {
        for (const layer of outerwear) {
          for (const secondLayer of secondLayers) {
          for (const extra of extras) {
            const outfit = [...core, shoe, secondLayer, layer, extra].filter((item): item is Item => item !== null)
            if (new Set(outfit.map(itemIdentity)).size !== outfit.length) continue
            if (request.requiredItemId && !outfit.some((item) => item.id === request.requiredItemId)) continue
            const itemTotal = outfit.reduce((sum, item) => sum + itemScore(item, request, preferences), 0)
            const colors = core.length > 1 ? colorScore(core[0].color, core[1].color) : 2
            const coldLayerPenalty = request.weather === 'Холодно' && !layer ? -5 : 0
            const rainPenalty = request.rain && !outfit.some((item) => item.rain_safe) ? -5 : 0
            const printPenalty = outfit.filter((item) => item.pattern && item.pattern !== 'Однотонная').length > 1 ? -3 : 0
            const candidate = {
              items: outfit,
              score: itemTotal + colors + outfitBalance(outfit) + coldLayerPenalty + rainPenalty + printPenalty,
              reason: buildReason(request, Boolean(layer)),
            }
            const key = outfit.map((item) => item.id).sort().join(':')
            const existing = candidates.get(key)
            if (!existing || candidate.score > existing.score) candidates.set(key, candidate)
          }
          }
        }
      }
  }

  if (candidates.size === 0) {
    if (isBeach) return []
    const fallback = availableItems.filter((item) => !isTraining || suitableForTraining(item))
      .sort((a, b) => itemScore(b, request, preferences) - itemScore(a, request, preferences))
      .filter((item, index, sorted) => sorted.findIndex((candidate) => candidate.category === item.category) === index)
      .slice(0, 4)
    const required = request.requiredItemId && availableItems.find((item) => item.id === request.requiredItemId)
    if (required && !fallback.some((item) => item.id === required.id)) fallback.unshift(required)
    return fallback.length >= 2 ? [{
      items: fallback,
      score: fallback.reduce((sum, item) => sum + itemScore(item, request, preferences), 0),
      reason: buildReason(request, fallback.some((item) => item.category === 'Верхняя одежда')),
    }] : []
  }

  const unique = [...candidates.values()]
    .sort((a, b) => b.score - a.score)
    .filter((candidate) => {
      const rejected = learnedPreferences(preferences).rejectedCombos.some((combo) => {
        const ids = new Set(candidate.items.map((item) => item.id))
        return combo.filter((id) => ids.has(id)).length >= Math.max(2, Math.min(combo.length, ids.size) - 1)
      })
      return !rejected
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
  const today = new Date().toISOString().slice(0, 10)
  const replacement = items
    .filter((item) => item.category === current.category && !used.has(item.id) && (!item.availability || item.availability === 'available') && (!item.snoozed_until || item.snoozed_until < today) && (request.occasion !== 'Тренировка' || item.style === 'Спортивный' || item.training_suitable === true || item.ai_meta?.training_suitable === true))
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
