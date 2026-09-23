// Единый источник истины для категорий, сезонов и стилей гардероба
// Используется в UI, валидации и AI-промптах

export const CATEGORIES = [
  'Верх',
  'Низ',
  'Обувь',
  'Верхняя одежда',
  'Аксессуар',
] as const

export const SEASONS = [
  'Лето',
  'Зима',
  'Демисезон',
  'Всесезонное',
] as const

export const STYLES = [
  'Повседневный',
  'Деловой',
  'Спортивный',
  'Нарядный',
] as const

export type Category = typeof CATEGORIES[number]
export type Season = typeof SEASONS[number]
export type Style = typeof STYLES[number]
