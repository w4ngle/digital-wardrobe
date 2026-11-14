import { NextResponse } from 'next/server'
import { hasValidSession } from '@/lib/telegram-auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { photoPath } from '@/lib/server-photos'

export async function DELETE() {
  if (!await hasValidSession()) return NextResponse.json({ error: 'Доступ запрещён' }, { status: 401 })
  const admin = getSupabaseAdmin()
  const { data, error } = await admin.from('items').select('id, photo_url').contains('ai_meta', { demo: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const paths = (data || []).map((item) => photoPath(item.photo_url)).filter((path): path is string => Boolean(path))
  if (paths.length) await admin.storage.from('wardrobe-items').remove(paths)
  const ids = (data || []).map((item) => item.id)
  if (ids.length) {
    const result = await admin.from('items').delete().in('id', ids)
    if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 })
  }
  return new NextResponse(null, { status: 204 })
}
