import { botReply, todayUrl } from '@/lib/bot-messages'
import { allowedTelegramUserIds } from '@/lib/telegram-auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { OutfitRequest, recommendOutfits } from '@/lib/recommendations'
import { Item } from '@/lib/supabase'
import { outfitWidgetState, parseOutfitWidgetAction } from '@/lib/telegram-widget'
import { appUrl, morningOutfitMessage, recommendUrl } from '@/lib/bot-messages'
import { outfitCardToken } from '@/lib/outfit-card-token'
import { moscowDayStart } from '@/lib/date'

type TelegramUpdate = {
  message?: {
    chat: { id: number }
    from?: { id: number }
    text?: string
  }
  callback_query?: { id: string, from: { id: number }, data?: string, message?: { chat: { id: number }, message_id: number } }
  widget_query?: {
    id: string
    from: { id: number }
    data: string
    type: { type: string }
    chat?: { id: number }
    message_id?: number
    inline_message_id?: string
  }
}

async function telegram(token: string, method: string, body: Record<string, unknown>) {
  return fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
}

async function handleOutfitAction(token: string, actionData: string, context: {
  userId: number, queryId: string, widget: boolean, chatId?: number, messageId?: number, inlineMessageId?: string,
}) {
  const parsed = parseOutfitWidgetAction(actionData)
  if (!parsed || !allowedTelegramUserIds().includes(context.userId)) return false

  const admin = getSupabaseAdmin()
  const { data: session } = await admin.from('telegram_widget_sessions').select('*').eq('id', parsed.sessionId).single()
  if (!session) {
    await telegram(token, context.widget ? 'answerWidgetQuery' : 'answerCallbackQuery', context.widget
      ? { widget_query_id: context.queryId, data: JSON.stringify({ error: 'Этот образ уже недоступен' }) }
      : { callback_query_id: context.queryId, text: 'Этот образ уже недоступен' })
    return true
  }

  const { data: currentItems } = await admin.from('items').select('*').in('id', session.item_ids)
  let items = (currentItems || []) as Item[]
  let status: 'ready' | 'worn' | 'rejected' = session.status
  let notice = ''

  if (parsed.action === 'wear' && status === 'ready') {
    const { data: claimed, error: claimError } = await admin
      .from('telegram_widget_sessions')
      .update({ status: 'worn' })
      .eq('id', session.id)
      .eq('status', 'ready')
      .select('id')
      .maybeSingle()
    if (claimError) {
      await telegram(token, context.widget ? 'answerWidgetQuery' : 'answerCallbackQuery', context.widget
        ? { widget_query_id: context.queryId, data: JSON.stringify({ error: 'Не удалось сохранить. Попробуйте ещё раз.' }) }
        : { callback_query_id: context.queryId, text: 'Не удалось сохранить. Попробуйте ещё раз.' })
      return true
    }
    if (!claimed) {
      status = 'worn'
      notice = 'Образ уже отмечен'
    } else {
      const now = new Date().toISOString()
      const updatedItems: Item[] = []
      const historyIds: string[] = []
      let saveFailed = false
      for (const item of items) {
        const { error: itemError } = await admin.from('items').update({
          wear_count: (item.wear_count || 0) + 1,
          wears_since_wash: (item.wears_since_wash || 0) + 1,
          last_worn_at: now,
        }).eq('id', item.id)
        if (itemError) { saveFailed = true; break }
        updatedItems.push(item)
        const { data: history, error: historyError } = await admin.from('wear_history').insert({ item_id: item.id, worn_at: now }).select('id').single()
        if (historyError) { saveFailed = true; break }
        historyIds.push(history.id)
      }
      if (saveFailed) {
        await Promise.all(updatedItems.map((item) => admin.from('items').update({
          wear_count: item.wear_count || 0,
          wears_since_wash: item.wears_since_wash || 0,
          last_worn_at: item.last_worn_at || null,
        }).eq('id', item.id)))
        if (historyIds.length) await admin.from('wear_history').delete().in('id', historyIds)
        await admin.from('telegram_widget_sessions').update({ status: 'ready' }).eq('id', session.id)
        status = 'ready'
        notice = 'Не удалось сохранить. Попробуйте ещё раз.'
      } else {
        status = 'worn'
        notice = 'Отметила образ на сегодня ✨'
      }
    }
  } else if (parsed.action === 'nope' && status === 'ready') {
    const { data: outfit } = await admin.from('outfits').insert({
      name: 'Не моё · утренний образ', occasion: 'На каждый день', notes: 'Оценка из Telegram', rating: -1,
    }).select('id').single()
    if (outfit) await admin.from('outfit_items').insert(items.map((item) => ({ outfit_id: outfit.id, item_id: item.id })))
    status = 'rejected'
    notice = 'Такое сочетание больше не предложу'
    await admin.from('telegram_widget_sessions').update({ status }).eq('id', session.id)
  } else if (parsed.action === 'next' && status === 'ready') {
    const [{ data: wardrobe }, { data: rated }] = await Promise.all([
      admin.from('items').select('*'),
      admin.from('outfits').select('rating, outfit_items(item_id)').not('rating', 'is', null),
    ])
    const preferences = (rated || []).reduce<{ itemScores: Record<string, number>, rejectedCombos: string[][] }>((value, outfit) => {
      const ids = outfit.outfit_items.map((link: { item_id: string }) => link.item_id)
      if (outfit.rating === 1) ids.forEach((id: string) => { value.itemScores[id] = (value.itemScores[id] || 0) + 2 })
      if (outfit.rating === -1) value.rejectedCombos.push(ids)
      return value
    }, { itemScores: {}, rejectedCombos: [] })
    const currentKey = [...session.item_ids].sort().join(':')
    const next = recommendOutfits((wardrobe || []) as Item[], session.request as OutfitRequest, 8, preferences)
      .find((candidate) => candidate.items.map((item) => item.id).sort().join(':') !== currentKey)
    if (next) {
      items = next.items
      notice = 'Подобрала другой образ'
      await admin.from('telegram_widget_sessions').update({ item_ids: items.map((item) => item.id) }).eq('id', session.id)
    } else notice = 'Другого подходящего образа пока нет'
  } else notice = status === 'worn' ? 'Образ уже отмечен' : 'Оценка уже сохранена'

  const state = outfitWidgetState(session.id, items, status)
  if (context.widget) {
    const target = context.inlineMessageId ? { inline_message_id: context.inlineMessageId } : { chat_id: context.chatId, message_id: context.messageId }
    await telegram(token, 'editMessageWidgetData', { ...target, chat_data: JSON.stringify(state) })
    await telegram(token, 'answerWidgetQuery', { widget_query_id: context.queryId, data: JSON.stringify({ notice }) })
  } else {
    if (context.chatId && context.messageId && parsed.action === 'next' && status === 'ready') {
      await telegram(token, 'editMessageMedia', {
        chat_id: context.chatId, message_id: context.messageId,
        media: { type: 'photo', media: `${appUrl}/api/telegram/outfit-card/${session.id}?token=${outfitCardToken(session.id)}&v=${Date.now()}`, caption: morningOutfitMessage(items) },
        reply_markup: { inline_keyboard: [[
          { text: 'Надену сегодня', callback_data: `w:wear:${session.id}` },
          { text: 'Другой образ', callback_data: `w:next:${session.id}` },
        ], [{ text: 'Не моё', callback_data: `w:nope:${session.id}` }, { text: 'Открыть приложение', web_app: { url: recommendUrl } }]] },
      })
    }
    await telegram(token, 'answerCallbackQuery', { callback_query_id: context.queryId, text: notice })
  }
  return true
}

export async function POST(request: Request) {
  if (request.headers.get('x-telegram-bot-api-secret-token') !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return new Response('Unauthorized', { status: 401 })
  }

  const update = await request.json() as TelegramUpdate
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return new Response('Bot token is missing', { status: 500 })

  const widget = update.widget_query
  if (widget && widget.type.type === 'data') {
    const handled = await handleOutfitAction(token, widget.data, {
      userId: widget.from.id, queryId: widget.id, widget: true,
      chatId: widget.chat?.id, messageId: widget.message_id, inlineMessageId: widget.inline_message_id,
    })
    if (!handled) await telegram(token, 'answerWidgetQuery', { widget_query_id: widget.id, data: JSON.stringify({ error: 'Действие недоступно' }) })
    return Response.json({ ok: true })
  }

  const callback = update.callback_query
  if (callback && await handleOutfitAction(token, callback.data || '', {
    userId: callback.from.id, queryId: callback.id, widget: false,
    chatId: callback.message?.chat.id, messageId: callback.message?.message_id,
  })) return Response.json({ ok: true })

  if (callback && allowedTelegramUserIds().includes(callback.from.id) && callback.data?.startsWith('laundry:')) {
    const admin = getSupabaseAdmin()
    const since = moscowDayStart()
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

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: message.chat.id,
      text: botReply(message.text),
      reply_markup: {
        inline_keyboard: [[{ text: 'Открыть гардероб', web_app: { url: todayUrl } }]],
      },
    }),
  })

  return response.ok ? Response.json({ ok: true }) : new Response('Telegram API error', { status: 502 })
}
