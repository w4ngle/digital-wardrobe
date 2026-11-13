import 'server-only'

import { Item } from './supabase'
import { getSupabaseAdmin } from './supabase-admin'

export function photoPath(value: string | null) {
  if (!value) return null
  if (!value.startsWith('http')) return value

  const marker = '/wardrobe-items/'
  const path = new URL(value).pathname.split(marker)[1]
  return path ? decodeURIComponent(path) : null
}

export async function signItemPhotos<T extends Item>(items: T[]) {
  const storage = getSupabaseAdmin().storage.from('wardrobe-items')
  return Promise.all(items.map(async (item) => {
    const path = photoPath(item.photo_url)
    if (!path) return item

    const { data } = await storage.createSignedUrl(path, 60 * 60)
    return { ...item, photo_url: data?.signedUrl ?? null }
  }))
}
