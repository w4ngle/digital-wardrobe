import { appUrl, botReply } from '@/lib/bot-messages'
import { allowedTelegramUserIds } from '@/lib/telegram-auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

type TelegramUpdate = {
  message?: {
    chat: { id: number }
    from?: { id: number }
    text?: string
  }
  callback_query?: { id: string, from: { id: number }, data?: string, message?: { chat: { id: number } } }
}

export async function POST(request: Request) {
  if (request.headers.get('x-telegram-bot-api-secret-token') !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return new Response('Unauthorized', { status: 401 })
  }

  const update = await request.json() as TelegramUpdate
  const callback = update.callback_query
  if (callback && allowedTelegramUserIds().includes(callback.from.id) && callback.data?.startsWith('laundry:')) {
    const token = process.env.TELEGRAM_BOT_TOKEN
    if (!token) return new Response('Bot token is missing', { status: 500 })
    const admin = getSupabaseAdmin()
    const since = new Date(); since.setUTCHours(0, 0, 0, 0)
    const { data: worn } = await admin.from('items').select('id').gte('last_worn_at', since.toISOString())
    const ids = worn?.map((item) => item.id) || []
    if (ids.length && callback.data === 'laundry:all') {
      const returnAt = new Date(); returnAt.setDate(returnAt.getDate() + 2)
      await admin.from('items').update({ availability: 'laundry', laundry_return_at: returnAt.toISOString() }).in('id', ids)
      await admin.from('wear_history').update({ laundry_decision: 'laundry' }).in('item_id', ids).gte('worn_at', since.toISOString())
    } else if (ids.length) await admin.from('wear_history').update({ laundry_decision: 'keep' }).in('item_id', ids).gte('worn_at', since.toISOString())
    await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ callback_query_id: callback.id, text: callback.data === 'laundry:all' ? 'Отправила в стирку 🧺' : 'Оставила доступными ✨' }) })
    return Response.json({ ok: true })
  }
  const message = update.message
  if (!message || !message.from?.id || !allowedTelegramUserIds().includes(message.from.id)) return Response.json({ ok: true })

  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return new Response('Bot token is missing', { status: 500 })

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: message.chat.id,
      text: botReply(message.text),
      reply_markup: {
        inline_keyboard: [[{ text: 'Открыть подарок ✨', web_app: { url: appUrl } }]],
      },
    }),
  })

  return response.ok ? Response.json({ ok: true }) : new Response('Telegram API error', { status: 502 })
}
