// Форматирование каталога вещей для промпта AI
// Компактный формат: короткие номера вместо UUID, одна строка на вещь

import { Item } from '@/lib/supabase'

export interface CatalogItem {
  number: number
  id: string
  category: string
  color: string
  season: string
  style: string
  warmth: number
  formality: number
  description: string
  availability?: string
  subcategory?: string
  length?: string
  fit?: string
}

/**
 * Преобразует массив вещей в компактный каталог с номерами
 */
export function buildCatalog(items: Item[]): CatalogItem[] {
  return items.filter((item) => !item.availability || item.availability === 'available').map((item, index) => ({
    number: index + 1,
    id: item.id,
    category: item.category,
    color: item.color,
    season: item.season,
    style: item.style,
    warmth: item.warmth || 3,
    formality: item.formality || 3,
    description: item.description || `${item.color} ${item.category.toLowerCase()}`,
    availability: item.availability,
    subcategory: item.subcategory || undefined,
    length: item.length || undefined,
    fit: item.fit || undefined,
  }))
}

/**
 * Форматирует каталог в строку для промпта
 * Формат: номер|категория|цвет|сезон|стиль|t{warmth}|f{formality}|description
 */
export function formatCatalog(catalog: CatalogItem[]): string {
  return catalog
    .map(
      (item) =>
        `${item.number}|${item.category}${item.subcategory ? `:${item.subcategory}` : ''}|${item.color}|${item.season}|${item.style}|t${item.warmth}|f${item.formality}${item.length ? `|${item.length}` : ''}${item.fit ? `|${item.fit}` : ''}|${item.description}`
    )
    .join('\n')
}

/**
 * Находит вещь в каталоге по номеру
 */
export function findItemByNumber(
  catalog: CatalogItem[],
  number: number
): CatalogItem | undefined {
  return catalog.find((item) => item.number === number)
}

/**
 * Преобразует номера из ответа AI в массив вещей
 */
export function resolveItemNumbers(
  catalog: CatalogItem[],
  numbers: number[]
): CatalogItem[] {
  return numbers
    .map((num) => findItemByNumber(catalog, num))
    .filter((item): item is CatalogItem => item !== undefined)
}
