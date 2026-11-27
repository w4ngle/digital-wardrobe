import { appUrl, morningOutfitMessage, recommendUrl } from '@/lib/bot-messages'
import { pickDailyOutfit, recommendOutfits, Weather } from '@/lib/recommendations'
import { uniqueDemoItems } from '@/lib/demo-items'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { isCronRequest } from '@/lib/cron-auth'
import { outfitWidgetHtml, outfitWidgetState } from '@/lib/telegram-widget'
import { outfitCardToken } from '@/lib/outfit-card-token'

export async function GET(request: Request) {
  if (!isCronRequest(request)) return new Response('Unauthorized', { status: 401 })

  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_ALLOWED_USER_ID
  if (!token || !chatId) return new Response('Telegram is not configured', { status: 500 })

  const admin = getSupabaseAdmin()
  const [{ data: items, error }, { data: rated }, { data: recentSessions }] = await Promise.all([
    admin.from('items').select('*'),
    admin.from('outfits').select('rating, outfit_items(item_id)').not('rating', 'is', null),
    admin.from('telegram_widget_sessions').select('item_ids').order('created_at', { ascending: false }).limit(7),
  ])
  if (error) return new Response(error.message, { status: 500 })

  let weather: Weather = 'Прохладно'
  let rain = false
  try {
    const forecast = await fetch('https://api.open-meteo.com/v1/forecast?latitude=47.2357&longitude=39.7015&current=temperature_2m,weather_code&daily=temperature_2m_min,precipitation_probability_max&forecast_days=1&timezone=Europe%2FMoscow').then((response) => response.json())
    const temperature = forecast.current.temperature_2m
    weather = temperature >= 26 ? 'Жарко' : temperature >= 18 ? 'Тепло' : temperature <= 5 ? 'Холодно' : 'Прохладно'
    rain = forecast.current.weather_code >= 51 || forecast.daily.precipitation_probability_max[0] >= 50
  } catch { /* use seasonal-neutral fallback */ }
  const preferences = (rated || []).reduce<{ itemScores: Record<string, number>, rejectedCombos: string[][] }>((value, saved) => {
    const ids = saved.outfit_items.map((link: { item_id: string }) => link.item_id)
    if (saved.rating === 1) ids.forEach((id: string) => { value.itemScores[id] = (value.itemScores[id] || 0) + 2 })
    if (saved.rating === -1) value.rejectedCombos.push(ids)
    return value
  }, { itemScores: {}, rejectedCombos: [] })
  const candidates = recommendOutfits(uniqueDemoItems(items || []), { occasion: 'На каждый день', weather, style: 'Повседневный', rain }, 12, preferences)
  const outfit = pickDailyOutfit(candidates, (recentSessions || []).map((session) => session.item_ids || []))
  if (!outfit) return Response.json({ ok: true, skipped: 'not enough items' })

  const requestData = { occasion: 'На каждый день' as const, weather, style: 'Повседневный', rain }
  const { data: session, error: sessionError } = await admin.from('telegram_widget_sessions').insert({
    item_ids: outfit.items.map((item) => item.id), request: requestData,
  }).select('id').single()
  if (sessionError) return new Response(sessionError.message, { status: 500 })

  const response = await fetch(`https://api.telegram.org/bot${token}/sendWidget`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      html: outfitWidgetHtml(),
      chat_data: JSON.stringify(outfitWidgetState(session.id, outfit.items)),
      caption: morningOutfitMessage(outfit.items),
      allow_queries: true,
      reply_markup: { inline_keyboard: [[{ text: 'Открыть приложение', web_app: { url: recommendUrl } }]] },
    }),
  })

  if (response.ok) return Response.json({ ok: true, widget: true })

  const fallback = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
      chat_id: chatId, photo: `${appUrl}/api/telegram/outfit-card/${session.id}?token=${outfitCardToken(session.id)}`, caption: morningOutfitMessage(outfit.items),
      reply_markup: { inline_keyboard: [[
        { text: 'Надену сегодня', callback_data: `w:wear:${session.id}` },
        { text: 'Другой образ', callback_data: `w:next:${session.id}` },
      ], [{ text: 'Не моё', callback_data: `w:nope:${session.id}` }, { text: 'Открыть приложение', web_app: { url: recommendUrl } }]] },
    }),
  })
  if (fallback.ok) return Response.json({ ok: true, widget: false })

  const textFallback = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
      chat_id: chatId,
      text: morningOutfitMessage(outfit.items),
      reply_markup: { inline_keyboard: [[{ text: 'Открыть образ', web_app: { url: recommendUrl } }]] },
    }),
  })
  return textFallback.ok ? Response.json({ ok: true, widget: false, text: true }) : new Response('Telegram API error', { status: 502 })
}
