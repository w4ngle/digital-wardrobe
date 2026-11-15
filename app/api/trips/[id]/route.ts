import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { hasValidSession } from '@/lib/telegram-auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const UpdateTrip = z.object({
  details: z.record(z.string(), z.unknown()).optional(),
  packed_item_ids: z.array(z.string().uuid()).optional(),
  checklist: z.array(z.object({ label: z.string().trim().min(1).max(100), checked: z.boolean() })).optional(),
}).refine((value) => Object.keys(value).length > 0)

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await hasValidSession()) return NextResponse.json({ error: 'Доступ запрещён' }, { status: 401 })
  const parsed = UpdateTrip.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Проверьте данные поездки' }, { status: 400 })
  const { id } = await params
  const { data, error } = await getSupabaseAdmin().from('trips').update(parsed.data).eq('id', id).select().single()
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json(data)
}
