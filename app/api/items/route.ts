import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { CATEGORIES, FITS, LAYER_ROLES, LENGTHS, PATTERNS, SEASONS, STYLES } from '@/lib/taxonomy'
import { hasValidSession } from '@/lib/telegram-auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { photoPath, signItemPhotos } from '@/lib/server-photos'
import { uniqueDemoItems } from '@/lib/demo-items'

const ItemInput = z.object({
  photo_url: z.string().nullable(),
  category: z.enum(CATEGORIES),
  color: z.string().trim().min(1).max(50),
  season: z.enum(SEASONS),
  style: z.enum(STYLES),
  description: z.string().trim().max(200).optional(),
  warmth: z.number().int().min(1).max(5).optional(),
  formality: z.number().int().min(1).max(5).optional(),
  ai_meta: z.record(z.string(), z.unknown()).nullable().optional(),
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
})

export async function GET() {
  if (!await hasValidSession()) return NextResponse.json({ error: 'Доступ запрещён' }, { status: 401 })

  const admin = getSupabaseAdmin()
  await admin.from('items').update({ availability: 'available', laundry_return_at: null, wears_since_wash: 0 }).eq('availability', 'laundry').lte('laundry_return_at', new Date().toISOString())
  const { data, error } = await admin
    .from('items')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(await signItemPhotos(uniqueDemoItems(data || [])))
}

export async function POST(request: NextRequest) {
  if (!await hasValidSession()) return NextResponse.json({ error: 'Доступ запрещён' }, { status: 401 })

  const parsed = ItemInput.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Проверьте поля вещи' }, { status: 400 })

  const admin = getSupabaseAdmin()
  const input = { ...parsed.data, photo_url: photoPath(parsed.data.photo_url) }
  const { data, error } = await admin.from('items').insert(input).select().single()
  if (error) {
    if (input.photo_url) await admin.storage.from('wardrobe-items').remove([input.photo_url])
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const [item] = await signItemPhotos([data])
  return NextResponse.json(item, { status: 201 })
}
