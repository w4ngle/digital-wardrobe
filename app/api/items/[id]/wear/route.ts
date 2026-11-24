import { NextResponse } from 'next/server'
import { hasValidSession } from '@/lib/telegram-auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { signItemPhotos } from '@/lib/server-photos'
import { moscowDate } from '@/lib/date'

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await hasValidSession()) return NextResponse.json({ error: 'Доступ запрещён' }, { status: 401 })

  const { id } = await params
  const admin = getSupabaseAdmin()
  // shortcut: read-then-update is enough for one user; replace with an atomic RPC for shared accounts.
  const { data: current, error: readError } = await admin.from('items').select('wear_count, wears_since_wash').eq('id', id).single()
  if (readError) return NextResponse.json({ error: readError.message }, { status: 500 })

  const { data, error } = await admin
    .from('items')
    .update({ wear_count: (current.wear_count || 0) + 1, wears_since_wash: (current.wears_since_wash || 0) + 1, last_worn_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await admin.from('wear_history').insert({ item_id: id })

  const [item] = await signItemPhotos([data])
  return NextResponse.json(item)
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await hasValidSession()) return NextResponse.json({ error: 'Доступ запрещён' }, { status: 401 })

  const { id } = await params
  const admin = getSupabaseAdmin()
  const since = new Date(`${moscowDate()}T00:00:00+03:00`)
  const { data: current, error: readError } = await admin.from('items').select('*').eq('id', id).single()
  if (readError) return NextResponse.json({ error: readError.message }, { status: 500 })

  const { data: history, error: historyError } = await admin.from('wear_history').select('id').eq('item_id', id).gte('worn_at', since.toISOString()).order('worn_at', { ascending: false }).limit(1)
  if (historyError) return NextResponse.json({ error: historyError.message }, { status: 500 })
  if (!history?.length) return NextResponse.json((await signItemPhotos([current]))[0])

  const { error: deleteError } = await admin.from('wear_history').delete().eq('id', history[0].id)
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })
  const { data: previous } = await admin.from('wear_history').select('worn_at').eq('item_id', id).order('worn_at', { ascending: false }).limit(1).maybeSingle()
  const { data, error } = await admin.from('items').update({
    wear_count: Math.max(0, (current.wear_count || 0) - 1),
    wears_since_wash: Math.max(0, (current.wears_since_wash || 0) - 1),
    last_worn_at: previous?.worn_at || null,
  }).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json((await signItemPhotos([data]))[0])
}
