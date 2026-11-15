import { NextRequest, NextResponse } from 'next/server'
import { chatJSON } from '@/lib/ai/provider'
import { RECOMMEND_OUTFIT_SYSTEM_PROMPT } from '@/lib/ai/prompts'
import { buildCatalog, formatCatalog, resolveItemNumbers } from '@/lib/ai/catalog'
import {
  validateOutfit,
  formatErrors,
  checkAllNumbersExist,
} from '@/lib/ai/validate-outfit'
import { recommendOutfit as fallbackRecommend } from '@/lib/recommendations'
import { hasValidSession } from '@/lib/telegram-auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { signItemPhotos } from '@/lib/server-photos'

const MAX_RETRIES = 2

export async function POST(req: NextRequest) {
  if (!await hasValidSession()) {
    return NextResponse.json({ error: 'Доступ запрещён' }, { status: 401 })
  }

  try {
    const { query, weather } = await req.json()

    if (!query || query.trim().length < 3) {
      return NextResponse.json({ error: 'Запрос слишком короткий' }, { status: 400 })
    }

    // Получаем все вещи
    const { data, error } = await getSupabaseAdmin().from('items').select('*').or('availability.is.null,availability.eq.available')
    if (error) throw error
    const items = await signItemPhotos(data || [])

    if (items.length < 3) {
      return NextResponse.json(
        { error: 'Недостаточно вещей для подбора образа' },
        { status: 400 }
      )
    }

    // Строим каталог
    const catalog = buildCatalog(items)
    const catalogText = formatCatalog(catalog)

    // Формируем промпт
    let userPrompt = `КАТАЛОГ:\n${catalogText}\n\nЗАПРОС: ${query}`
    if (weather) {
      userPrompt += `\nПОГОДА: ${weather.tempC}°C${weather.rain ? ', дождь' : ''}`
    }

    let lastError = ''
    let attempt = 0

    // Пробуем MAX_RETRIES раз
    while (attempt < MAX_RETRIES) {
      attempt++

      try {
        // Добавляем информацию об ошибке в повторный запрос
        const prompt = lastError
          ? `${userPrompt}\n\nПРЕДЫДУЩАЯ ПОПЫТКА НЕ ПРОШЛА ВАЛИДАЦИЮ: ${lastError}\nИСПРАВЬ ОШИБКИ.`
          : userPrompt

        const { result, meta } = await chatJSON({
          system: RECOMMEND_OUTFIT_SYSTEM_PROMPT,
          user: prompt,
          schema: 'outfit',
        })

        // Проверяем номера
        const numberErrors = checkAllNumbersExist(result.item_numbers, catalog.length)
        if (numberErrors.length > 0) {
          lastError = formatErrors(numberErrors)
          continue
        }

        // Преобразуем номера в вещи
        const selectedItems = resolveItemNumbers(catalog, result.item_numbers)

        // Валидируем образ
        const validationErrors = validateOutfit(selectedItems, weather)
        if (validationErrors.length > 0) {
          lastError = formatErrors(validationErrors)
          continue
        }

        // Успех! Преобразуем в Item[]
        const outfitItems = selectedItems.map((catItem) =>
          items.find((item) => item.id === catItem.id)
        ).filter(Boolean)

        return NextResponse.json({
          items: outfitItems,
          title: result.title,
          reasoning: result.reasoning,
          missing_note: result.missing_note,
          source: 'ai',
          _meta: {
            ...meta,
            attempts: attempt,
          },
        })
      } catch (error) {
        console.error(`Attempt ${attempt} failed:`, error)
        lastError = 'Ошибка парсинга ответа модели'
      }
    }

    // Все попытки провалились — откат на правила
    console.warn('AI recommendation failed, falling back to rules')

    // Пытаемся извлечь сезон и стиль из запроса
    const queryLower = query.toLowerCase()
    let season = 'Демисезон'
    let style = 'Повседневный'

    if (queryLower.includes('лето') || queryLower.includes('жара')) season = 'Лето'
    if (queryLower.includes('зима') || queryLower.includes('холод')) season = 'Зима'
    if (queryLower.includes('дело') || queryLower.includes('работ')) style = 'Деловой'
    if (queryLower.includes('спорт') || queryLower.includes('трениров')) style = 'Спортивный'
    if (queryLower.includes('праздник') || queryLower.includes('свадьб')) style = 'Нарядный'

    const fallbackResult = fallbackRecommend(items, season, style)

    if (!fallbackResult) {
      return NextResponse.json(
        { error: 'Не удалось подобрать образ' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      items: fallbackResult.items,
      title: 'Образ по правилам',
      reasoning: fallbackResult.reason,
      missing_note: null,
      source: 'fallback',
      _meta: {
        attempts: MAX_RETRIES,
        fallback: true,
      },
    })
  } catch (error) {
    console.error('Recommend API error:', error)
    return NextResponse.json(
      { error: 'Ошибка подбора образа' },
      { status: 500 }
    )
  }
}
