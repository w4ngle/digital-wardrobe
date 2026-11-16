// Валидация образа: проверка сочетаемости вещей

import { CatalogItem } from './catalog'

export interface ValidationError {
  code: string
  message: string
}

/**
 * Проверяет, что образ содержит все необходимые категории
 */
function checkRequiredCategories(items: CatalogItem[], occasion?: string): ValidationError[] {
  const errors: ValidationError[] = []
  const categories = items.map((item) => item.category)

  if (occasion === 'Пляж / бассейн') {
    if (!categories.includes('Купальник')) errors.push({ code: 'missing_swimwear', message: 'Для пляжа нужен купальник' })
    return errors
  }

  // Должна быть обувь
  if (!categories.includes('Обувь')) {
    errors.push({
      code: 'missing_shoes',
      message: 'В образе должна быть обувь',
    })
  }

  const hasOnePiece = categories.includes('Платье') || categories.includes('Комплект')
  if (!categories.includes('Верх') && !hasOnePiece) {
    errors.push({
      code: 'missing_top',
      message: 'В образе должна быть верхняя одежда (Верх)',
    })
  }

  // Должен быть низ (брюки, юбка и т.д.)
  if (!categories.includes('Низ') && !hasOnePiece) {
    errors.push({
      code: 'missing_bottom',
      message: 'В образе должен быть низ (брюки, юбка)',
    })
  }

  return errors
}

/**
 * Проверяет, что нет дублирующихся основных категорий
 */
function checkDuplicateCategories(items: CatalogItem[]): ValidationError[] {
  const errors: ValidationError[] = []
  const primaryCategories = ['Верх', 'Низ', 'Обувь']

  for (const category of primaryCategories) {
    const count = items.filter((item) => item.category === category).length
    if (count > 1) {
      errors.push({
        code: 'duplicate_category',
        message: `Два ${category.toLowerCase()} в одном образе`,
      })
    }
  }

  return errors
}

/**
 * Проверяет соответствие теплоты вещей погоде
 */
function checkWarmthForWeather(
  items: CatalogItem[],
  weather?: { tempC: number; rain: boolean }
): ValidationError[] {
  const errors: ValidationError[] = []

  if (!weather) return errors

  const avgWarmth =
    items.reduce((sum, item) => sum + item.warmth, 0) / items.length

  // Если холодно (<10°C), нужна верхняя одежда
  if (weather.tempC < 10) {
    const hasOuterwear = items.some((item) => item.category === 'Верхняя одежда')
    if (!hasOuterwear) {
      errors.push({
        code: 'missing_outerwear',
        message: `При температуре ${weather.tempC}°C нужна верхняя одежда`,
      })
    }
  }

  // Если жарко (>25°C) и средняя теплота > 3
  if (weather.tempC > 25 && avgWarmth > 3) {
    errors.push({
      code: 'too_warm',
      message: `При температуре ${weather.tempC}°C одежда слишком тёплая`,
    })
  }

  // Если дождь, желательна верхняя одежда
  if (weather.rain) {
    const hasOuterwear = items.some((item) => item.category === 'Верхняя одежда')
    if (!hasOuterwear) {
      errors.push({
        code: 'rain_without_outerwear',
        message: 'В дождь желательна верхняя одежда',
      })
    }
  }

  return errors
}

/**
 * Проверяет все номера существуют
 */
export function checkAllNumbersExist(
  numbers: number[],
  catalogSize: number
): ValidationError[] {
  const errors: ValidationError[] = []

  for (const num of numbers) {
    if (num < 1 || num > catalogSize) {
      errors.push({
        code: 'invalid_number',
        message: `Номер ${num} не существует в каталоге`,
      })
    }
  }
  if (new Set(numbers).size !== numbers.length) errors.push({ code: 'duplicate_item', message: 'Одна вещь выбрана несколько раз' })

  return errors
}

/**
 * Основная функция валидации образа
 * Возвращает массив ошибок (пустой = валидный образ)
 */
export function validateOutfit(
  items: CatalogItem[],
  weather?: { tempC: number; rain: boolean },
  request?: { occasion: string; style: string },
): ValidationError[] {
  const errors: ValidationError[] = []

  // Минимум 2 вещи
  if (items.length < 2) {
    errors.push({
      code: 'too_few_items',
      message: 'Образ должен содержать минимум 2 вещи',
    })
    return errors // Дальше проверять бессмысленно
  }

  errors.push(...checkRequiredCategories(items, request?.occasion))
  errors.push(...checkDuplicateCategories(items))
  errors.push(...checkWarmthForWeather(items, weather))

  if (request?.occasion === 'Тренировка') {
    if (items.some((item) => !item.trainingSuitable)) errors.push({ code: 'not_sporty', message: 'Для тренировки нужны только спортивные или отмеченные для тренировки вещи' })
    if (items.some((item) => ['Аксессуар', 'Сумка'].includes(item.category))) errors.push({ code: 'training_extra', message: 'Для тренировки не добавляй аксессуары' })
  }
  if (request?.occasion === 'Пляж / бассейн') {
    if (items.some((item) => ['Платье', 'Комплект', 'Верхняя одежда', 'Низ'].includes(item.category))) errors.push({ code: 'beach_extra', message: 'Для пляжа не добавляй обычную или тёплую одежду' })
  }

  return errors
}

/**
 * Форматирует ошибки в текст для повторного запроса к AI
 */
export function formatErrors(errors: ValidationError[]): string {
  return errors.map((e) => e.message).join('; ')
}
