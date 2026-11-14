import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { allowedTelegramUserIds, currentTelegramUserId, hasValidSession } from '@/lib/telegram-auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { signItemPhotos } from '@/lib/server-photos'

const OutfitInput = z.object({
  outfit: z.object({
    name: z.string().trim().min(1).max(100),
    occasion: z.string().trim().max(100).nullable(),
    notes: z.string().trim().max(500).nullable(),
    rating: z.union([z.literal(-1), z.literal(1)]).nullable().optional(),
  }),
  itemIds: z.array(z.string().uuid()).min(1).max(10),
})

export async function GET() {
  if (!await hasValidSession()) return NextResponse.json({ error: 'Доступ запрещён' }, { status: 401 })

  const admin = getSupabaseAdmin()
  const { data: outfits, error } = await admin.from('outfits').select('*').order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const result = await Promise.all((outfits || []).map(async (outfit) => {
    const { data: links } = await admin.from('outfit_items').select('item_id').eq('outfit_id', outfit.id)
    const ids = links?.map((link) => link.item_id) || []
    if (ids.length === 0) return { ...outfit, items: [] }
    const { data: items } = await admin.from('items').select('*').in('id', ids)
    return { ...outfit, items: await signItemPhotos(items || []) }
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
  const { data: outfit, error } = await admin.from('outfits').insert({ ...parsed.data.outfit, suggested_by }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const links = parsed.data.itemIds.map((item_id) => ({ outfit_id: outfit.id, item_id }))
  const { error: linksError } = await admin.from('outfit_items').insert(links)
  if (linksError) {
    await admin.from('outfits').delete().eq('id', outfit.id)
    return NextResponse.json({ error: linksError.message }, { status: 500 })
  }

  const { data: items } = await admin.from('items').select('*').in('id', parsed.data.itemIds)
  return NextResponse.json({ ...outfit, items: await signItemPhotos(items || []) }, { status: 201 })
}
