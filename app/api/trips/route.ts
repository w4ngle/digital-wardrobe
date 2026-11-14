import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { hasValidSession } from '@/lib/telegram-auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const TripInput = z.object({
  name: z.string().trim().min(1).max(100),
  details: z.record(z.string(), z.unknown()),
  packed_item_ids: z.array(z.string().uuid()).max(100),
  checklist: z.array(z.object({ label: z.string().max(100), checked: z.boolean() })).max(50),
})

export async function GET() {
  if (!await hasValidSession()) return NextResponse.json({ error: 'Доступ запрещён' }, { status: 401 })
  const { data, error } = await getSupabaseAdmin().from('trips').select('*').order('created_at', { ascending: false }).limit(10)
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  if (!await hasValidSession()) return NextResponse.json({ error: 'Доступ запрещён' }, { status: 401 })
  const parsed = TripInput.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Проверьте поездку' }, { status: 400 })
  const { data, error } = await getSupabaseAdmin().from('trips').insert(parsed.data).select().single()
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json(data, { status: 201 })
}
