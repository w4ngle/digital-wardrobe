export type Item = {
  id: string
  photo_url: string | null
  category: string
  color: string
  season: string
  style: string
  description?: string | null
  warmth?: number | null
  formality?: number | null
  ai_meta?: Record<string, unknown> | null
  embedding?: number[] | null
  is_favorite?: boolean
  wear_count?: number
  last_worn_at?: string | null
  created_at: string
}

export type Outfit = {
  id: string
  name: string
  occasion: string | null
  notes: string | null
  source?: string | null
  prompt?: string | null
  reasoning?: string | null
  render_url?: string | null
  is_favorite?: boolean
  planned_for?: string | null
  created_at: string
}

export type OutfitItem = {
  id: string
  outfit_id: string
  item_id: string
  created_at: string
}

export type OutfitWithItems = Outfit & {
  items: Item[]
}
