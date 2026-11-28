import { NextRequest, NextResponse } from 'next/server'
import { allowedTelegramUserIds, hasValidSession } from '@/lib/telegram-auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { z } from 'zod'

const OutfitUpdate = z.object({
  is_favorite: z.boolean().optional(),
  planned_for: z.iso.date().nullable().optional(),
  rating: z.union([z.literal(-1), z.literal(1)]).nullable().optional(),
  proposal_status: z.enum(['saved', 'pending', 'accepted', 'declined', 'will_wear']).optional(),
  owner_reaction: z.string().trim().max(200).nullable().optional(),
  name: z.string().trim().min(1).max(100).optional(),
  occasion: z.string().trim().max(100).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
  itemIds: z.array(z.string().uuid()).min(1).max(10).refine((ids) => new Set(ids).size === ids.length).optional(),
})

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await hasValidSession()) return NextResponse.json({ error: 'Доступ запрещён' }, { status: 401 })
  const parsed = OutfitUpdate.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Проверьте данные образа' }, { status: 400 })

  const { id } = await params
  const admin = getSupabaseAdmin()
  const { itemIds, ...updates } = parsed.data
  const { data, error } = Object.keys(updates).length
    ? await admin.from('outfits').update(updates).eq('id', id).select().single()
    : await admin.from('outfits').select().eq('id', id).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (itemIds) {
    const { data: oldLinks, error: oldLinksError } = await admin.from('outfit_items').select('id').eq('outfit_id', id)
    if (oldLinksError) return NextResponse.json({ error: oldLinksError.message }, { status: 500 })
    const { data: newLinks, error: insertError } = await admin.from('outfit_items').insert(itemIds.map((item_id) => ({ outfit_id: id, item_id }))).select('id')
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })
    if (oldLinks?.length) {
      const { error: deleteError } = await admin.from('outfit_items').delete().in('id', oldLinks.map((link) => link.id))
      if (deleteError) {
        if (newLinks?.length) await admin.from('outfit_items').delete().in('id', newLinks.map((link) => link.id))
        return NextResponse.json({ error: deleteError.message }, { status: 500 })
      }
    }
  }
  if (parsed.data.proposal_status && process.env.TELEGRAM_BOT_TOKEN && allowedTelegramUserIds()[1]) {
    const labels = { accepted: 'Образ понравился 🤍', declined: 'Сегодня не подошёл', will_wear: 'Этот образ наденут ✨', saved: 'Образ сохранён', pending: 'Предложение ждёт ответа' }
    await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: allowedTelegramUserIds()[1], text: labels[parsed.data.proposal_status] }) })
  }
  return NextResponse.json(data)
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await hasValidSession()) return NextResponse.json({ error: 'Доступ запрещён' }, { status: 401 })

  const { id } = await params
  const { error } = await getSupabaseAdmin().from('outfits').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
