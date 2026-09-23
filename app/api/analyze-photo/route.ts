import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
})

export async function POST(req: NextRequest) {
  try {
    const { imageUrl } = await req.json()

    if (!imageUrl) {
      return NextResponse.json({ error: 'Image URL required' }, { status: 400 })
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Проанализируй фото одежды и определи:
- category: категория (одно из: Верх, Низ, Обувь, Верхняя одежда, Аксессуар)
- color: основной цвет (на русском, одним словом, например: чёрный, белый, синий, серый)
- season: сезон (одно из: Лето, Зима, Демисезон, Всесезонное)
- style: стиль (одно из: Повседневный, Деловой, Спортивный, Нарядный)

Ответь ТОЛЬКО в формате JSON без дополнительного текста:
{
  "category": "...",
  "color": "...",
  "season": "...",
  "style": "..."
}`
            },
            {
              type: 'image_url',
              image_url: { url: imageUrl }
            }
          ]
        }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 300
    })

    const responseText = completion.choices[0].message.content || '{}'
    const result = JSON.parse(responseText)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Photo analysis error:', error)
    return NextResponse.json({ error: 'Ошибка анализа фото' }, { status: 500 })
  }
}
