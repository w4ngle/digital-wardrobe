import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { isCronRequest } from '@/lib/cron-auth'

export async function GET(request: Request) {
  if (!isCronRequest(request)) return new Response('Unauthorized', { status: 401 })
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_ALLOWED_USER_ID
  if (!token || !chatId) return new Response('Telegram is not configured', { status: 500 })

  const since = new Date()
  since.setUTCHours(0, 0, 0, 0)
  const { data: wornItems, error } = await getSupabaseAdmin().from('items').select('id, description, custom_name, subcategory, category, layer_role, wears_since_wash').gte('last_worn_at', since.toISOString())
  if (error) return new Response(error.message, { status: 500 })
  const items = (wornItems || []).filter((item) => item.category === 'Верхняя одежда'
    ? (item.wears_since_wash || 0) >= 5
    : item.layer_role === 'Второй слой' ? (item.wears_since_wash || 0) >= 2 : true)
  if (!items.length) return Response.json({ ok: true, skipped: 'nothing needs washing' })

  const list = items.map((item) => `• ${item.custom_name || item.description || item.subcategory || item.category}`).join('\n')
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
      chat_id: chatId,
      text: `Солнышко, отправить сегодняшние вещи в стирку? 🧺\n\n${list}`,
      reply_markup: { inline_keyboard: [
        [{ text: 'Да, в стирку', callback_data: 'laundry:all' }, { text: 'Нет, ещё надену', callback_data: 'laundry:none' }],
        [{ text: 'Открыть обзор', web_app: { url: 'https://digital-wardrobe-gilt.vercel.app/today' } }],
      ] },
    }),
  })
  return response.ok ? Response.json({ ok: true }) : new Response('Telegram API error', { status: 502 })
}
