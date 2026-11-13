import { NextResponse } from 'next/server'
import { hasValidSession } from '@/lib/telegram-auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { signItemPhotos } from '@/lib/server-photos'

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await hasValidSession()) return NextResponse.json({ error: 'Доступ запрещён' }, { status: 401 })

  const { id } = await params
  const admin = getSupabaseAdmin()
  // shortcut: read-then-update is enough for one user; replace with an atomic RPC for shared accounts.
  const { data: current, error: readError } = await admin.from('items').select('wear_count').eq('id', id).single()
  if (readError) return NextResponse.json({ error: readError.message }, { status: 500 })

  const { data, error } = await admin
    .from('items')
    .update({ wear_count: (current.wear_count || 0) + 1, last_worn_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const [item] = await signItemPhotos([data])
  return NextResponse.json(item)
}
