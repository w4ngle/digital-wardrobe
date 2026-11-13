import { NextRequest, NextResponse } from 'next/server'
import { describeImage } from '@/lib/ai/provider'
import { hasValidSession } from '@/lib/telegram-auth'

export async function POST(req: NextRequest) {
  if (!await hasValidSession()) {
    return NextResponse.json({ error: 'Доступ запрещён' }, { status: 401 })
  }

  try {
    const { imageUrl } = await req.json()

    if (!imageUrl) {
      return NextResponse.json({ error: 'Image URL required' }, { status: 400 })
    }

    // Проверка: только data URL с ограничением размера
    if (!imageUrl.startsWith('data:image/')) {
      return NextResponse.json({ error: 'Only data URLs are allowed' }, { status: 400 })
    }

    // Проверка размера (примерно 2 МБ в base64)
    if (imageUrl.length > 2.7 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image too large' }, { status: 413 })
    }

    const { result, meta } = await describeImage(imageUrl)

    return NextResponse.json({
      ...result,
      _meta: meta,
    })
  } catch (error) {
    console.error('Photo analysis error:', error)
    return NextResponse.json({ error: 'Ошибка анализа фото' }, { status: 500 })
  }
}
