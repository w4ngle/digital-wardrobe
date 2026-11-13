import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { CATEGORIES, SEASONS, STYLES } from '@/lib/taxonomy'
import { hasValidSession } from '@/lib/telegram-auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { photoPath, signItemPhotos } from '@/lib/server-photos'

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
})

export async function GET() {
  if (!await hasValidSession()) return NextResponse.json({ error: 'Доступ запрещён' }, { status: 401 })

  const { data, error } = await getSupabaseAdmin()
    .from('items')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(await signItemPhotos(data || []))
}

export async function POST(request: NextRequest) {
  if (!await hasValidSession()) return NextResponse.json({ error: 'Доступ запрещён' }, { status: 401 })

  const parsed = ItemInput.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Проверьте поля вещи' }, { status: 400 })

  const input = { ...parsed.data, photo_url: photoPath(parsed.data.photo_url) }
  const { data, error } = await getSupabaseAdmin().from('items').insert(input).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const [item] = await signItemPhotos([data])
  return NextResponse.json(item, { status: 201 })
}
