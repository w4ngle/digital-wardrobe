import { Item } from './supabase'

type OutfitRecommendation = {
  items: Item[]
  reason: string
}

export function recommendOutfit(
  items: Item[],
  season: string,
  style: string
): OutfitRecommendation | null {
  const filtered = items.filter(
    item =>
      (item.season === season || item.season === 'Всесезонное') &&
      (item.style === style || item.style === 'Повседневный')
  )

  const tops = filtered.filter(i => i.category === 'Верх')
  const bottoms = filtered.filter(i => i.category === 'Низ')
  const shoes = filtered.filter(i => i.category === 'Обувь')
  const outerwear = filtered.filter(i => i.category === 'Верхняя одежда')

  const outfit: Item[] = []

  if (tops.length > 0) outfit.push(tops[Math.floor(Math.random() * tops.length)])
  if (bottoms.length > 0) outfit.push(bottoms[Math.floor(Math.random() * bottoms.length)])
  if (shoes.length > 0) outfit.push(shoes[Math.floor(Math.random() * shoes.length)])

  if (season === 'Зима' && outerwear.length > 0) {
    outfit.push(outerwear[Math.floor(Math.random() * outerwear.length)])
  }

  if (outfit.length < 2) {
    return null
  }

  return {
    items: outfit,
    reason: `Образ в стиле "${style}" для сезона "${season}"`
  }
}
