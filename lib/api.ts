import { supabase, Item, Outfit, OutfitWithItems } from '@/lib/supabase'

export async function getItems(): Promise<Item[]> {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function uploadPhoto(file: File): Promise<string> {
  const ext = file.name.split('.').pop()
  const path = `${Date.now()}.${ext}`

  const { error } = await supabase.storage
    .from('wardrobe-items')
    .upload(path, file)

  if (error) throw error

  const { data: { publicUrl } } = supabase.storage
    .from('wardrobe-items')
    .getPublicUrl(path)

  return publicUrl
}

export async function createItem(item: Omit<Item, 'id' | 'created_at'>): Promise<Item> {
  const { data, error } = await supabase
    .from('items')
    .insert(item)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateItem(id: string, updates: Partial<Omit<Item, 'id' | 'created_at'>>): Promise<Item> {
  const { data, error } = await supabase
    .from('items')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteItem(id: string): Promise<void> {
  const { error } = await supabase
    .from('items')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function getOutfits(): Promise<OutfitWithItems[]> {
  const { data: outfits, error: outfitsError } = await supabase
    .from('outfits')
    .select('*')
    .order('created_at', { ascending: false })

  if (outfitsError) throw outfitsError

  const outfitsWithItems = await Promise.all(
    (outfits || []).map(async (outfit) => {
      const { data: outfitItems, error: itemsError } = await supabase
        .from('outfit_items')
        .select('item_id')
        .eq('outfit_id', outfit.id)

      if (itemsError) throw itemsError

      const itemIds = outfitItems?.map(oi => oi.item_id) || []

      if (itemIds.length === 0) {
        return { ...outfit, items: [] }
      }

      const { data: items, error: itemsFetchError } = await supabase
        .from('items')
        .select('*')
        .in('id', itemIds)

      if (itemsFetchError) throw itemsFetchError

      return { ...outfit, items: items || [] }
    })
  )

  return outfitsWithItems
}

export async function createOutfit(
  outfit: Omit<Outfit, 'id' | 'created_at'>,
  itemIds: string[]
): Promise<OutfitWithItems> {
  console.log('Creating outfit:', outfit)
  const { data: newOutfit, error: outfitError } = await supabase
    .from('outfits')
    .insert(outfit)
    .select()
    .single()

  console.log('Insert result:', { data: newOutfit, error: outfitError })
  if (outfitError) {
    console.error('Outfit insert error:', JSON.stringify(outfitError, null, 2))
    throw outfitError
  }

  if (itemIds.length > 0) {
    const outfitItems = itemIds.map(item_id => ({
      outfit_id: newOutfit.id,
      item_id
    }))

    const { error: itemsError } = await supabase
      .from('outfit_items')
      .insert(outfitItems)

    if (itemsError) throw itemsError
  }

  const { data: items, error: itemsFetchError } = await supabase
    .from('items')
    .select('*')
    .in('id', itemIds)

  if (itemsFetchError) throw itemsFetchError

  return { ...newOutfit, items: items || [] }
}

export async function deleteOutfit(id: string): Promise<void> {
  const { error } = await supabase
    .from('outfits')
    .delete()
    .eq('id', id)

  if (error) throw error
}
