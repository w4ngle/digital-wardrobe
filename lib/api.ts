import { Item, Outfit, OutfitWithItems, Trip, WearRecord } from '@/lib/supabase'

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init)
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: string } | null
    throw new Error(body?.error || 'Ошибка запроса')
  }
  return response.status === 204 ? undefined as T : response.json()
}

export function getItems() {
  return api<Item[]>('/api/items')
}

export async function uploadPhoto(file: File) {
  const formData = new FormData()
  formData.append('photo', file)
  const { path } = await api<{ path: string }>('/api/photos', { method: 'POST', body: formData })
  return path
}

export function createItem(item: Omit<Item, 'id' | 'created_at'>) {
  return api<Item>('/api/items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item),
  })
}

export function updateItem(id: string, updates: Partial<Omit<Item, 'id' | 'created_at'>>) {
  return api<Item>(`/api/items/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
}

export function deleteItem(id: string) {
  return api<void>(`/api/items/${id}`, { method: 'DELETE' })
}

export function clearDemoItems() { return api<void>('/api/demo-items', { method: 'DELETE' }) }

export function markItemWorn(id: string) {
  return api<Item>(`/api/items/${id}/wear`, { method: 'POST' })
}

export function unmarkItemWorn(id: string) {
  return api<Item>(`/api/items/${id}/wear`, { method: 'DELETE' })
}

export function getOutfits() {
  return api<OutfitWithItems[]>('/api/outfits')
}

export function createOutfit(outfit: Omit<Outfit, 'id' | 'created_at'>, itemIds: string[]) {
  return api<OutfitWithItems>('/api/outfits', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ outfit, itemIds }),
  })
}

export function deleteOutfit(id: string) {
  return api<void>(`/api/outfits/${id}`, { method: 'DELETE' })
}

export function updateOutfit(id: string, updates: Pick<Partial<Outfit>, 'is_favorite' | 'planned_for' | 'rating' | 'proposal_status' | 'owner_reaction'>) {
  return api<Outfit>(`/api/outfits/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
}

export function editOutfit(id: string, updates: Pick<Outfit, 'name' | 'occasion' | 'notes'> & { itemIds: string[] }) {
  return api<Outfit>(`/api/outfits/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) })
}

export function getTrips() { return api<Trip[]>('/api/trips') }

export function createTrip(trip: Omit<Trip, 'id' | 'created_at'>) {
  return api<Trip>('/api/trips', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(trip) })
}

export function updateTrip(id: string, updates: Partial<Pick<Trip, 'details' | 'packed_item_ids' | 'checklist'>>) {
  return api<Trip>(`/api/trips/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) })
}

export function deleteTrip(id: string) {
  return api<void>(`/api/trips/${id}`, { method: 'DELETE' })
}

export function getWearHistory() { return api<WearRecord[]>('/api/wear-history') }
