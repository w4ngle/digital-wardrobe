import { NextResponse } from 'next/server'
import { hasValidSession } from '@/lib/telegram-auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { signItemPhotos } from '@/lib/server-photos'

export async function GET() {
  if (!await hasValidSession()) return NextResponse.json({ error: 'Доступ запрещён' }, { status: 401 })
  const { data, error } = await getSupabaseAdmin().from('wear_history').select('id, worn_at, laundry_decision, item:items(*)').order('worn_at', { ascending: false }).limit(30)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const result = await Promise.all((data || []).map(async (entry) => ({ ...entry, item: entry.item?.[0] ? (await signItemPhotos([entry.item[0]]))[0] : null })))
  return NextResponse.json(result)
}
