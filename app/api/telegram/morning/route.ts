import { appUrl, morningOutfitMessage } from '@/lib/bot-messages'
import { recommendOutfit } from '@/lib/recommendations'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_ALLOWED_USER_ID
  if (!token || !chatId) return new Response('Telegram is not configured', { status: 500 })

  const { data: items, error } = await getSupabaseAdmin().from('items').select('*')
  if (error) return new Response(error.message, { status: 500 })

  const month = new Date().getUTCMonth() + 1
  const season = month >= 12 || month <= 2 ? 'Зима' : month >= 6 && month <= 8 ? 'Лето' : 'Демисезон'
  const outfit = recommendOutfit(items || [], season, 'Повседневный')
  if (!outfit) return Response.json({ ok: true, skipped: 'not enough items' })

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: morningOutfitMessage(outfit.items),
      reply_markup: { inline_keyboard: [[{ text: 'Посмотреть образ ✨', web_app: { url: `${appUrl}recommend` } }]] },
    }),
  })

  return response.ok ? Response.json({ ok: true }) : new Response('Telegram API error', { status: 502 })
}
