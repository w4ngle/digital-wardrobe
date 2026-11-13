import { NextRequest, NextResponse } from 'next/server'
import { hasValidSession } from '@/lib/telegram-auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { z } from 'zod'

const OutfitUpdate = z.object({
  is_favorite: z.boolean().optional(),
  planned_for: z.iso.date().nullable().optional(),
})

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await hasValidSession()) return NextResponse.json({ error: 'Доступ запрещён' }, { status: 401 })
  const parsed = OutfitUpdate.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Проверьте данные образа' }, { status: 400 })

  const { id } = await params
  const { data, error } = await getSupabaseAdmin().from('outfits').update(parsed.data).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await hasValidSession()) return NextResponse.json({ error: 'Доступ запрещён' }, { status: 401 })

  const { id } = await params
  const { error } = await getSupabaseAdmin().from('outfits').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
