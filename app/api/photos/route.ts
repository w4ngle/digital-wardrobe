import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { hasValidSession } from '@/lib/telegram-auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const extensions: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
}

export async function POST(request: NextRequest) {
  if (!await hasValidSession()) return NextResponse.json({ error: 'Доступ запрещён' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('photo')
  if (!(file instanceof File) || !extensions[file.type] || file.size > 8 * 1024 * 1024) {
    return NextResponse.json({ error: 'Нужна фотография до 8 МБ' }, { status: 400 })
  }

  const path = `${randomUUID()}.${extensions[file.type]}`
  const { error } = await getSupabaseAdmin().storage.from('wardrobe-items').upload(path, file, {
    contentType: file.type,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ path }, { status: 201 })
}
