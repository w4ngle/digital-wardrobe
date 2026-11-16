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
  availability?: 'available' | 'laundry' | 'unavailable'
  subcategory?: string | null
  custom_name?: string | null
  fit?: string | null
  length?: string | null
  pattern?: string | null
  layer_role?: string | null
  comfort?: number | null
  confidence?: number | null
  needs_underlayer?: boolean
  rain_safe?: boolean
  training_suitable?: boolean
  snoozed_until?: string | null
  laundry_return_at?: string | null
  wears_since_wash?: number
  unavailable_reason?: string | null
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
  rating?: -1 | 1 | null
  feedback_reasons?: string[] | null
  suggested_by?: 'owner' | 'partner' | null
  suggested_by_name?: string | null
  partner_message?: string | null
  proposal_status?: 'saved' | 'pending' | 'accepted' | 'declined' | 'will_wear'
  owner_reaction?: string | null
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

export type Trip = {
  id: string
  name: string
  details: Record<string, unknown>
  packed_item_ids: string[]
  checklist: Array<{ label: string, checked: boolean }>
  created_at: string
}

export type WearRecord = { id: string, worn_at: string, laundry_decision: 'keep' | 'laundry' | null, item: Item | null }
