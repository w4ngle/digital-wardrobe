import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { chatJSON } from '@/lib/ai/provider'
import { RECOMMEND_OUTFIT_SYSTEM_PROMPT } from '@/lib/ai/prompts'
import { buildCatalog, formatCatalog, resolveItemNumbers } from '@/lib/ai/catalog'
import {
  validateOutfit,
  formatErrors,
  checkAllNumbersExist,
} from '@/lib/ai/validate-outfit'
import { OCCASIONS, recommendOutfits, WEATHER } from '@/lib/recommendations'
import { STYLES } from '@/lib/taxonomy'
import { hasValidSession } from '@/lib/telegram-auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { signItemPhotos } from '@/lib/server-photos'

const MAX_RETRIES = 2
const RequestBody = z.object({
  query: z.string().trim().min(3).max(500),
  weather: z.object({ tempC: z.number().min(-50).max(60), rain: z.boolean() }).optional(),
  request: z.object({
    occasion: z.enum(OCCASIONS), weather: z.enum(WEATHER), style: z.enum(STYLES),
    rain: z.boolean().optional(), transport: z.enum(['Пешком', 'Автобус', 'Такси']).optional(),
    requiredItemId: z.string().uuid().optional(), rediscover: z.boolean().optional(),
  }),
})

export async function POST(req: NextRequest) {
  if (!await hasValidSession()) {
    return NextResponse.json({ error: 'Доступ запрещён' }, { status: 401 })
  }

  try {
    const parsed = RequestBody.safeParse(await req.json())
    if (!parsed.success) return NextResponse.json({ error: 'Проверьте параметры подбора' }, { status: 400 })
    const { query, weather, request } = parsed.data

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
        const validationErrors = validateOutfit(selectedItems, weather, request)
        if (request.requiredItemId && !selectedItems.some((item) => item.id === request.requiredItemId)) {
          validationErrors.push({ code: 'missing_required_item', message: 'Не использована обязательная вещь' })
        }
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

    const fallbackResult = recommendOutfits(items, request, 1)[0]

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
