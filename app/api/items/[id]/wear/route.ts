import { NextResponse } from 'next/server'
import { hasOwnerSession } from '@/lib/telegram-auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { signItemPhotos } from '@/lib/server-photos'
import { moscowDate } from '@/lib/date'

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await hasOwnerSession()) return NextResponse.json({ error: 'Отмечать носку может только владелица' }, { status: 403 })

  const { id } = await params
  const { data, error } = await getSupabaseAdmin().rpc('mark_items_worn', { p_item_ids: [id] })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const [item] = await signItemPhotos(data || [])
  if (!item) return NextResponse.json({ error: 'Вещь не найдена' }, { status: 404 })
  return NextResponse.json(item)
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await hasOwnerSession()) return NextResponse.json({ error: 'Отмечать носку может только владелица' }, { status: 403 })

  const { id } = await params
  const since = new Date(`${moscowDate()}T00:00:00+03:00`)
  const { data, error } = await getSupabaseAdmin().rpc('unmark_items_worn', { p_item_ids: [id], p_since: since.toISOString() })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const [item] = await signItemPhotos(data || [])
  return item ? NextResponse.json(item) : NextResponse.json({ error: 'Вещь не найдена' }, { status: 404 })
}
