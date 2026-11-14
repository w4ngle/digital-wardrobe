import { appUrl, botReply } from '@/lib/bot-messages'
import { allowedTelegramUserIds } from '@/lib/telegram-auth'

type TelegramUpdate = {
  message?: {
    chat: { id: number }
    from?: { id: number }
    text?: string
  }
}

export async function POST(request: Request) {
  if (request.headers.get('x-telegram-bot-api-secret-token') !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return new Response('Unauthorized', { status: 401 })
  }

  const update = await request.json() as TelegramUpdate
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
