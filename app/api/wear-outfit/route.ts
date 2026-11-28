import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { hasOwnerSession } from '@/lib/telegram-auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { signItemPhotos } from '@/lib/server-photos'
import { moscowDate } from '@/lib/date'

const Input = z.object({
  itemIds: z.array(z.string().uuid()).min(1).max(10).refine((ids) => new Set(ids).size === ids.length),
  worn: z.boolean(),
})

export async function POST(request: NextRequest) {
  if (!await hasOwnerSession()) return NextResponse.json({ error: 'Отмечать носку может только владелица' }, { status: 403 })
  const parsed = Input.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Проверьте состав образа' }, { status: 400 })

  const { itemIds, worn } = parsed.data
  const result = worn
    ? await getSupabaseAdmin().rpc('mark_items_worn', { p_item_ids: itemIds })
    : await getSupabaseAdmin().rpc('unmark_items_worn', { p_item_ids: itemIds, p_since: `${moscowDate()}T00:00:00+03:00` })
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 })
  return NextResponse.json(await signItemPhotos(result.data || []))
}
