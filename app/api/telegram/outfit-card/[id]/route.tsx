import { ImageResponse } from 'next/og'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { signItemPhotos } from '@/lib/server-photos'
import { Item } from '@/lib/supabase'
import { isValidOutfitCardToken } from '@/lib/outfit-card-token'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export const runtime = 'nodejs'

async function embeddedPhoto(url: string | null, requestUrl: string) {
  if (!url) return null
  try {
    if (url.startsWith('/demo-items/')) {
      const filename = new URL(url, requestUrl).pathname.split('/').pop()
      if (!filename || !/^[a-z0-9-]+\.webp$/i.test(filename)) return null
      const bytes = await readFile(join(process.cwd(), 'public', 'demo-items', filename))
      return `data:image/webp;base64,${bytes.toString('base64')}`
    }
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) })
    if (!response.ok) return null
    const type = response.headers.get('content-type') || 'image/jpeg'
    if (!type.startsWith('image/')) return null
    const bytes = Buffer.from(await response.arrayBuffer())
    return bytes.length <= 2 * 1024 * 1024 ? `data:${type};base64,${bytes.toString('base64')}` : null
  } catch {
    return null
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const token = new URL(request.url).searchParams.get('token')
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id) || !isValidOutfitCardToken(id, token)) return new Response('Not found', { status: 404 })

  const admin = getSupabaseAdmin()
  const { data: session } = await admin.from('telegram_widget_sessions').select('item_ids').eq('id', id).single()
  if (!session) return new Response('Not found', { status: 404 })
  const { data } = await admin.from('items').select('*').in('id', session.item_ids)
  const signedItems = await signItemPhotos((data || []) as Item[])
  const items = await Promise.all(signedItems.map(async (item) => ({
    ...item,
    photo_url: await embeddedPhoto(item.photo_url, request.url),
  })))

  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: 54, background: '#f4efe5', color: '#193328', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 30 }}>
        <span style={{ fontSize: 24, letterSpacing: 5, color: '#857f75' }}>ОБРАЗ НА СЕГОДНЯ</span>
        <span style={{ fontSize: 54, fontWeight: 700 }}>Всё уже сочетается</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, flex: 1 }}>
        {items.slice(0, 6).map((item) => (
          <div key={item.id} style={{ width: items.length <= 4 ? '48%' : '31.5%', height: items.length <= 4 ? '46%' : '44%', display: 'flex', flexDirection: 'column', background: '#fffdfa', borderRadius: 26, overflow: 'hidden', border: '2px solid #e3ddd2' }}>
            <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {item.photo_url
                // ImageResponse renders remote images itself; next/image isn't supported here.
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={item.photo_url} alt="" width="100%" height="100%" style={{ objectFit: 'contain' }} />
                : <span style={{ fontSize: 42 }}>{item.category === 'Обувь' ? '👟' : item.category === 'Низ' ? '👖' : '👕'}</span>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', padding: '12px 16px 15px' }}>
              <span style={{ fontSize: 18, color: '#857f75' }}>{item.category}</span>
              <span style={{ fontSize: 23, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden' }}>{item.custom_name || item.description || item.subcategory || item.color}</span>
            </div>
          </div>
        ))}
      </div>
    </div>,
    { width: 1200, height: 900 },
  )
}
