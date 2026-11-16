// Провайдер-агностичный слой для работы с AI
// Модели задаются через переменные окружения

import OpenAI from 'openai'
import { ItemAnalysisSchema, OutfitRecommendationSchema } from './schemas'
import { ANALYZE_PHOTO_PROMPT_V2 } from './prompts'

function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured')
  return new OpenAI({ apiKey })
}

async function geminiJSON(system: string, user: string, imageDataUrl?: string) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured')
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite'
  const parts: Array<Record<string, unknown>> = [{ text: `${system}\n\n${user}` }]
  if (imageDataUrl) {
    const match = imageDataUrl.match(/^data:(image\/[^;]+);base64,(.+)$/)
    if (!match) throw new Error('Invalid image data URL')
    parts.push({ inlineData: { mimeType: match[1], data: match[2] } })
  }
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({ contents: [{ role: 'user', parts }], generationConfig: { responseMimeType: 'application/json' } }),
  })
  if (!response.ok) throw new Error(`Gemini error ${response.status}`)
  const data = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>, usageMetadata?: { promptTokenCount?: number, candidatesTokenCount?: number } }
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Gemini returned an empty response')
  return { rawData: JSON.parse(text), model, tokens_in: data.usageMetadata?.promptTokenCount || 0, tokens_out: data.usageMetadata?.candidatesTokenCount || 0 }
}
// Получение модели из env с fallback
function getModel(envKey: string, fallback: string): string {
  return process.env[envKey] || fallback
}

/**
 * Анализ фото вещи через vision-модель
 */
export async function describeImage(imageDataUrl: string) {
  if (process.env.GEMINI_API_KEY) {
    const response = await geminiJSON('Верни только JSON, строго по указанным в запросе полям.', ANALYZE_PHOTO_PROMPT_V2, imageDataUrl)
    return { result: ItemAnalysisSchema.parse(response.rawData), meta: { model: response.model, prompt_version: 'v2', tokens_in: response.tokens_in, tokens_out: response.tokens_out } }
  }
  const openai = getOpenAI()
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
  if (process.env.GEMINI_API_KEY) {
    const response = await geminiJSON(params.system, params.user)
    return {
      result: params.schema === 'outfit' ? OutfitRecommendationSchema.parse(response.rawData) : response.rawData,
      meta: { model: response.model, tokens_in: response.tokens_in, tokens_out: response.tokens_out },
    }
  }
  const openai = getOpenAI()
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

