import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { CATEGORIES, SEASONS, STYLES } from '@/lib/taxonomy'
import { hasValidSession } from '@/lib/telegram-auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { photoPath, signItemPhotos } from '@/lib/server-photos'

const ItemUpdate = z.object({
  photo_url: z.string().nullable().optional(),
  category: z.enum(CATEGORIES).optional(),
  color: z.string().trim().min(1).max(50).optional(),
  season: z.enum(SEASONS).optional(),
  style: z.enum(STYLES).optional(),
  description: z.string().trim().max(200).nullable().optional(),
  warmth: z.number().int().min(1).max(5).nullable().optional(),
  formality: z.number().int().min(1).max(5).nullable().optional(),
  is_favorite: z.boolean().optional(),
})

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await hasValidSession()) return NextResponse.json({ error: 'Доступ запрещён' }, { status: 401 })

  const parsed = ItemUpdate.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Проверьте поля вещи' }, { status: 400 })
  const { id } = await params
  const updates = parsed.data.photo_url === undefined
    ? parsed.data
    : { ...parsed.data, photo_url: photoPath(parsed.data.photo_url) }
  const { data, error } = await getSupabaseAdmin().from('items').update(updates).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const [item] = await signItemPhotos([data])
  return NextResponse.json(item)
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await hasValidSession()) return NextResponse.json({ error: 'Доступ запрещён' }, { status: 401 })

  const { id } = await params
  const { error } = await getSupabaseAdmin().from('items').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
