import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) return new Response('Unauthorized', { status: 401 })
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_ALLOWED_USER_ID
  if (!token || !chatId) return new Response('Telegram is not configured', { status: 500 })

  const start = new Date(); start.setUTCMonth(start.getUTCMonth() - 1, 1); start.setUTCHours(0, 0, 0, 0)
  const previous = new Date(start); previous.setUTCMonth(previous.getUTCMonth() - 1)
  const admin = getSupabaseAdmin()
  const [{ data: items }, { data: history }] = await Promise.all([
    admin.from('items').select('id, custom_name, description, subcategory, category, wear_count, is_favorite'),
    admin.from('wear_history').select('item_id, worn_at').gte('worn_at', previous.toISOString()),
  ])
  const currentRows = history?.filter((row) => new Date(row.worn_at) >= start) || []
  const previousRows = history?.filter((row) => new Date(row.worn_at) < start) || []
  const counts = currentRows.reduce<Record<string, number>>((result, row) => { result[row.item_id] = (result[row.item_id] || 0) + 1; return result }, {})
  const mostWorn = [...(items || [])].sort((a, b) => (counts[b.id] || 0) - (counts[a.id] || 0))[0]
  const forgotten = (items || []).filter((item) => !counts[item.id]).slice(0, 3)
  const name = (item: NonNullable<typeof mostWorn>) => item.custom_name || item.description || item.subcategory || item.category
  const change = currentRows.length - previousRows.length
  const text = `Итоги гардероба за месяц ✨\n\nНадеваний: ${currentRows.length} (${change >= 0 ? '+' : ''}${change} к прошлому месяцу)\nЛюбимая вещь: ${mostWorn && counts[mostWorn.id] ? name(mostWorn) : 'пока не определилась'}\nВ избранном: ${(items || []).filter((item) => item.is_favorite).length}\n\nДавно не появлялись:\n${forgotten.length ? forgotten.map((item) => `• ${name(item)}`).join('\n') : 'Все вещи были в деле 🤍'}`
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chatId, text }) })
  return response.ok ? Response.json({ ok: true }) : new Response('Telegram API error', { status: 502 })
}
