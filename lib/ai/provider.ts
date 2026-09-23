// Провайдер-агностичный слой для работы с AI
// Модели задаются через переменные окружения

import OpenAI from 'openai'
import { ItemAnalysisSchema, OutfitRecommendationSchema } from './schemas'
import { ANALYZE_PHOTO_PROMPT_V2 } from './prompts'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

// Получение модели из env с fallback
function getModel(envKey: string, fallback: string): string {
  return process.env[envKey] || fallback
}

/**
 * Анализ фото вещи через vision-модель
 */
export async function describeImage(imageDataUrl: string) {
  const model = getModel('AI_VISION_MODEL', 'gpt-4o-mini')

  const completion = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: ANALYZE_PHOTO_PROMPT_V2 },
          { type: 'image_url', image_url: { url: imageDataUrl } },
        ],
      },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 500,
  })

  const responseText = completion.choices[0].message.content || '{}'
  const rawData = JSON.parse(responseText)

  // Валидация через zod
  const result = ItemAnalysisSchema.parse(rawData)

  return {
    result,
    meta: {
      model,
      prompt_version: 'v2',
      tokens_in: completion.usage?.prompt_tokens || 0,
      tokens_out: completion.usage?.completion_tokens || 0,
    },
  }
}

/**
 * Подбор образа через текстовую модель
 */
export async function chatJSON(params: {
  system: string
  user: string
  schema?: 'outfit' | 'item'
}) {
  const model = getModel('AI_TEXT_MODEL', 'gpt-4o-mini')

  const completion = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: params.system },
      { role: 'user', content: params.user },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 800,
  })

  const responseText = completion.choices[0].message.content || '{}'
  const rawData = JSON.parse(responseText)

  // Валидация в зависимости от схемы
  if (params.schema === 'outfit') {
    return {
      result: OutfitRecommendationSchema.parse(rawData),
      meta: {
        model,
        tokens_in: completion.usage?.prompt_tokens || 0,
        tokens_out: completion.usage?.completion_tokens || 0,
      },
    }
  }

  return {
    result: rawData,
    meta: {
      model,
      tokens_in: completion.usage?.prompt_tokens || 0,
      tokens_out: completion.usage?.completion_tokens || 0,
    },
  }
}

/**
 * Создание эмбеддинга для семантического поиска
 */
export async function embed(text: string): Promise<number[]> {
  const model = getModel('AI_EMBED_MODEL', 'text-embedding-3-small')

  const response = await openai.embeddings.create({
    model,
    input: text,
  })

  return response.data[0].embedding
}

/**
 * Генерация изображения образа (опционально, дорого)
 */
export async function renderImage(prompt: string): Promise<string> {
  const model = getModel('AI_IMAGE_MODEL', 'dall-e-3')

  const response = await openai.images.generate({
    model,
    prompt,
    n: 1,
    size: '1024x1024',
    quality: 'standard',
  })

  return response.data?.[0]?.url || ''
}
