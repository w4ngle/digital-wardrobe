import { appUrl, morningOutfitMessage } from '@/lib/bot-messages'
import { recommendOutfits, Weather } from '@/lib/recommendations'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { isCronRequest } from '@/lib/cron-auth'

export async function GET(request: Request) {
  if (!isCronRequest(request)) return new Response('Unauthorized', { status: 401 })

  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_ALLOWED_USER_ID
  if (!token || !chatId) return new Response('Telegram is not configured', { status: 500 })

  const { data: items, error } = await getSupabaseAdmin().from('items').select('*')
  if (error) return new Response(error.message, { status: 500 })

  let weather: Weather = 'Прохладно'
  let rain = false
  try {
    const forecast = await fetch('https://api.open-meteo.com/v1/forecast?latitude=47.2357&longitude=39.7015&current=temperature_2m,weather_code&daily=temperature_2m_min,precipitation_probability_max&forecast_days=1&timezone=Europe%2FMoscow').then((response) => response.json())
    const temperature = forecast.current.temperature_2m
    weather = temperature >= 20 ? 'Тепло' : temperature <= 5 ? 'Холодно' : 'Прохладно'
    rain = forecast.current.weather_code >= 51 || forecast.daily.precipitation_probability_max[0] >= 50
  } catch { /* use seasonal-neutral fallback */ }
  const outfit = recommendOutfits(items || [], { occasion: 'На каждый день', weather, style: 'Повседневный', rain }, 1)[0] ?? null
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
