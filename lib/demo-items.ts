import { Item } from './supabase'

const localDemoFolders = ['demo/', 'demo-core/', 'demo-v2/', 'demo-extra/']

export function localDemoPhoto(item: Item) {
  if (item.ai_meta?.demo !== true || !item.photo_url) return null
  const path = item.photo_url.split('?')[0]
  if (!localDemoFolders.some((folder) => path.startsWith(folder))) return null
  const filename = path.split('/').pop()
  if (!filename || !/^[a-z0-9-]+\.png$/i.test(filename)) return null
  return `/demo-items/${filename.replace(/\.png$/i, '.webp')}?source=${encodeURIComponent(path)}`
}

function normalizedName(item: Item) {
  return (item.custom_name || item.description || item.subcategory || item.category)
    .toLowerCase()
    .replace(/· вариант \d+$/u, '')
    .replace(/[^а-яёa-z0-9]+/giu, ' ')
    .trim()
}

export function uniqueDemoItems(items: Item[]) {
  const photos = new Set<string>()
  const names = new Set<string>()
  return items.filter((item) => {
    if (item.ai_meta?.demo !== true) return true
    const photo = item.photo_url?.split('?')[0] || ''
    const name = `${item.category}|${item.subcategory || ''}|${normalizedName(item)}`
    if ((photo && photos.has(photo)) || names.has(name)) return false
    if (photo) photos.add(photo)
    names.add(name)
    return true
  })
}
