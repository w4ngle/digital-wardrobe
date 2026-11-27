import 'server-only'

import { Item } from './supabase'
import { getSupabaseAdmin } from './supabase-admin'
import { localDemoPhoto } from './demo-items'

export function photoPath(value: string | null) {
  if (!value) return null
  if (value.startsWith('/demo-items/')) {
    const source = new URL(value, 'https://local.invalid').searchParams.get('source')
    return source && /^(demo|demo-core|demo-v2|demo-extra)\/[a-z0-9-]+\.png$/i.test(source) ? source : null
  }
  if (!value.startsWith('http')) return value

  const marker = '/wardrobe-items/'
  const path = new URL(value).pathname.split(marker)[1]
  return path ? decodeURIComponent(path) : null
}

export async function signItemPhotos<T extends Item>(items: T[]) {
  const storage = getSupabaseAdmin().storage.from('wardrobe-items')
  const localUrls = items.map(localDemoPhoto)
  const paths = items.map((item, index) => localUrls[index] ? null : photoPath(item.photo_url))
  const uniquePaths = [...new Set(paths.filter((path): path is string => Boolean(path)))]
  if (!uniquePaths.length) return items.map((item, index) => ({ ...item, photo_url: localUrls[index] }))
  const { data } = await storage.createSignedUrls(uniquePaths, 60 * 60)
  const urls = new Map((data || []).map((entry) => [entry.path, entry.signedUrl]))
  return items.map((item, index) => ({ ...item, photo_url: localUrls[index] || (paths[index] ? urls.get(paths[index]!) || null : null) }))
}
