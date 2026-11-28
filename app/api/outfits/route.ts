import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { allowedTelegramUserIds, currentTelegramUserId, hasValidSession } from '@/lib/telegram-auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { signItemPhotos } from '@/lib/server-photos'
import { Item } from '@/lib/supabase'
import { outfitsUrl } from '@/lib/bot-messages'

const OutfitInput = z.object({
  outfit: z.object({
    name: z.string().trim().min(1).max(100),
    occasion: z.string().trim().max(100).nullable(),
    notes: z.string().trim().max(500).nullable(),
    rating: z.union([z.literal(-1), z.literal(1)]).nullable().optional(),
    feedback_reasons: z.preprocess((value) => value ?? [], z.array(z.string().trim().min(1).max(80)).max(5)),
    suggested_by_name: z.string().trim().min(1).max(60).nullable().optional(),
    partner_message: z.string().trim().max(300).nullable().optional(),
  }),
  itemIds: z.array(z.string().uuid()).min(1).max(10),
})

export async function GET() {
  if (!await hasValidSession()) return NextResponse.json({ error: 'Доступ запрещён' }, { status: 401 })

  const admin = getSupabaseAdmin()
  const { data: outfits, error } = await admin.from('outfits').select('*, outfit_items(item:items(*))').order('created_at', { ascending: false }).limit(200)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const allItems = (outfits || []).flatMap((outfit) => outfit.outfit_items.map((link: { item: Item | null }) => link.item).filter((item: Item | null): item is Item => Boolean(item)))
  const signedItems = await signItemPhotos(allItems)
  const signedById = new Map(signedItems.map((item) => [item.id, item]))
  const result = (outfits || []).map(({ outfit_items, ...outfit }) => ({
    ...outfit,
    items: outfit_items.map((link: { item: Item | null }) => link.item && signedById.get(link.item.id)).filter(Boolean),
  }))

  return NextResponse.json(result)
}

export async function POST(request: NextRequest) {
  const userId = await currentTelegramUserId()
  if (!userId) return NextResponse.json({ error: 'Доступ запрещён' }, { status: 401 })

  const parsed = OutfitInput.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Проверьте образ' }, { status: 400 })

  const admin = getSupabaseAdmin()
  const suggested_by = userId === allowedTelegramUserIds()[0] ? 'owner' : 'partner'
  const proposal_status = suggested_by === 'partner' ? 'pending' : 'saved'
  const { data: selectedItems, error: itemsError } = await admin.from('items').select('*').in('id', parsed.data.itemIds)
  if (itemsError) return NextResponse.json({ error: itemsError.message }, { status: 500 })
  if (selectedItems?.length !== parsed.data.itemIds.length || selectedItems.some((item) => item.availability && item.availability !== 'available')) {
    return NextResponse.json({ error: 'В образе есть недоступная или удалённая вещь' }, { status: 400 })
  }
  const { data: outfit, error } = await admin.from('outfits').insert({ ...parsed.data.outfit, suggested_by, proposal_status }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const links = parsed.data.itemIds.map((item_id) => ({ outfit_id: outfit.id, item_id }))
  const { error: linksError } = await admin.from('outfit_items').insert(links)
  if (linksError) {
    await admin.from('outfits').delete().eq('id', outfit.id)
    return NextResponse.json({ error: linksError.message }, { status: 500 })
  }

  let notification_warning: string | undefined
  if (suggested_by === 'partner' && process.env.TELEGRAM_BOT_TOKEN && allowedTelegramUserIds()[0]) {
    try {
      const notification = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(8000), body: JSON.stringify({
          chat_id: allowedTelegramUserIds()[0],
          text: `Тебе предложили новый образ 💌\n\n${parsed.data.outfit.suggested_by_name || 'Любимый'}: ${parsed.data.outfit.partner_message || parsed.data.outfit.name}`,
          reply_markup: { inline_keyboard: [[{ text: 'Посмотреть', web_app: { url: outfitsUrl } }]] },
        }),
      })
      if (!notification.ok) notification_warning = 'Образ сохранён, но уведомление не отправилось'
    } catch { notification_warning = 'Образ сохранён, но уведомление не отправилось' }
  }
  return NextResponse.json({ ...outfit, items: await signItemPhotos(selectedItems || []), notification_warning }, { status: 201 })
}
