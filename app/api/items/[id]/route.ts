import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { CATEGORIES, FITS, LAYER_ROLES, LENGTHS, PATTERNS, SEASONS, STYLES } from '@/lib/taxonomy'
import { hasOwnerSession } from '@/lib/telegram-auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { photoPath, signItemPhotos } from '@/lib/server-photos'

const ItemUpdate = z.object({
  photo_url: z.string().nullable().optional(),
  category: z.enum(CATEGORIES).optional(),
  color: z.string().trim().min(1).max(50).optional(),
  season: z.enum(SEASONS).optional(),
  style: z.enum(STYLES).optional(),
  description: z.string().trim().max(200).nullable().optional(),
  ai_meta: z.record(z.string(), z.unknown()).nullable().optional(),
  warmth: z.number().int().min(1).max(5).nullable().optional(),
  formality: z.number().int().min(1).max(5).nullable().optional(),
  is_favorite: z.boolean().optional(),
  availability: z.enum(['available', 'laundry', 'unavailable']).optional(),
  subcategory: z.string().trim().min(1).max(60).nullable().optional(),
  custom_name: z.string().trim().max(80).nullable().optional(),
  fit: z.enum(FITS).nullable().optional(),
  length: z.enum(LENGTHS).nullable().optional(),
  pattern: z.enum(PATTERNS).nullable().optional(),
  layer_role: z.enum(LAYER_ROLES).nullable().optional(),
  comfort: z.number().int().min(1).max(5).nullable().optional(),
  confidence: z.number().int().min(1).max(5).nullable().optional(),
  needs_underlayer: z.boolean().optional(),
  rain_safe: z.boolean().optional(),
  snoozed_until: z.iso.date().nullable().optional(),
  laundry_return_at: z.iso.datetime().nullable().optional(),
  wears_since_wash: z.number().int().min(0).optional(),
  unavailable_reason: z.enum(['В плохом состоянии', 'Не могу найти', 'Больше не ношу', 'Отдать или выбросить']).nullable().optional(),
})

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await hasOwnerSession()) return NextResponse.json({ error: 'Изменять гардероб может только владелица' }, { status: 403 })

  const parsed = ItemUpdate.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Проверьте поля вещи' }, { status: 400 })
  const { id } = await params
  const admin = getSupabaseAdmin()
  const { data: existing, error: existingError } = parsed.data.photo_url === undefined
    ? { data: null, error: null }
    : await admin.from('items').select('photo_url').eq('id', id).single()
  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 })
  const updates = parsed.data.photo_url === undefined
    ? parsed.data
    : { ...parsed.data, photo_url: photoPath(parsed.data.photo_url) }
  const { data, error } = await admin.from('items').update(updates).eq('id', id).select().single()
  const oldPath = photoPath(existing?.photo_url || null)
  const newPath = parsed.data.photo_url === undefined ? null : photoPath(parsed.data.photo_url)
  if (error) {
    if (newPath && newPath !== oldPath) await admin.storage.from('wardrobe-items').remove([newPath])
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (oldPath && oldPath !== newPath) await admin.storage.from('wardrobe-items').remove([oldPath])

  const [item] = await signItemPhotos([data])
  return NextResponse.json(item)
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await hasOwnerSession()) return NextResponse.json({ error: 'Изменять гардероб может только владелица' }, { status: 403 })

  const { id } = await params
  const admin = getSupabaseAdmin()
  const { data: item } = await admin.from('items').select('photo_url').eq('id', id).single()
  const { error } = await admin.from('items').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const path = photoPath(item?.photo_url || null)
  if (path) await admin.storage.from('wardrobe-items').remove([path])
  return new NextResponse(null, { status: 204 })
}
