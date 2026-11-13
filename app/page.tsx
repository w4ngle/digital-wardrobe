'use client'

import { useState, useEffect } from 'react'
import { getItems, createItem, deleteItem, updateItem } from '@/lib/api'
import { Item } from '@/lib/supabase'
import ItemCard from '@/components/ItemCard'
import ItemForm from '@/components/ItemForm'
import ItemFilters from '@/components/ItemFilters'
import EditItemModal from '@/components/EditItemModal'

export default function Home() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [filterCategory, setFilterCategory] = useState('')
  const [filterSeason, setFilterSeason] = useState('')
  const [filterStyle, setFilterStyle] = useState('')
  const [editingItem, setEditingItem] = useState<Item | null>(null)

  useEffect(() => {
    getItems()
      .then(setItems)
      .catch((error) => {
        console.error('Ошибка загрузки вещей:', error)
        alert('Не удалось загрузить гардероб')
      })
      .finally(() => setLoading(false))
  }, [])

  const handleCreateItem = async (itemData: {
    category: string
    color: string
    season: string
    style: string
    description: string
    warmth: number
    formality: number
    photo_url: string | null
    ai_meta: Record<string, unknown> | null
  }) => {
    const newItem = await createItem(itemData)
    setItems([newItem, ...items])
    setShowForm(false)
  }

  const handleDeleteItem = async (id: string) => {
    await deleteItem(id)
    setItems(items.filter(item => item.id !== id))
  }

  const handleEditItem = async (id: string, updates: {
    category: string
    color: string
    season: string
    style: string
    photo_url: string | null
  }) => {
    const updated = await updateItem(id, updates)
    setItems(items.map(item => item.id === id ? updated : item))
  }

  const handleResetFilters = () => {
    setFilterCategory('')
    setFilterSeason('')
    setFilterStyle('')
  }

  const filteredItems = items.filter(item => {
    if (filterCategory && item.category !== filterCategory) return false
    if (filterSeason && item.season !== filterSeason) return false
    if (filterStyle && item.style !== filterStyle) return false
    return true
  })

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-6xl mx-auto px-4 pb-28 pt-[max(24px,env(safe-area-inset-top))]">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-slate-100 mb-2">
            Цифровой гардероб
          </h1>
          <p className="text-slate-400">
            Управляйте своим гардеробом и создавайте образы
          </p>
        </header>

        <div className="mb-6">
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="w-full rounded-xl bg-accent px-6 py-3 font-medium text-white transition sm:w-auto"
            >
              + Добавить вещь
            </button>
          )}
        </div>

        {showForm && (
          <div className="mb-6">
            <ItemForm
              onSubmit={handleCreateItem}
              onCancel={() => setShowForm(false)}
            />
          </div>
        )}

        <ItemFilters
          category={filterCategory}
          season={filterSeason}
          style={filterStyle}
          onCategoryChange={setFilterCategory}
          onSeasonChange={setFilterSeason}
          onStyleChange={setFilterStyle}
          onReset={handleResetFilters}
        />

        {loading ? (
          <div className="text-center py-12 text-slate-400">
            Загрузка...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12 bg-slate-900 rounded-lg border border-slate-800">
            <p className="text-slate-400 mb-4">
              {items.length === 0 ? 'Ваш гардероб пока пуст' : 'Ничего не найдено'}
            </p>
            <p className="text-sm text-slate-500">
              {items.length === 0 ? 'Добавьте первую вещь, чтобы начать' : 'Попробуйте изменить фильтры'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
            {filteredItems.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                onDelete={handleDeleteItem}
                onEdit={(item) => setEditingItem(item)}
              />
            ))}
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-slate-800 text-center text-sm text-slate-500">
          Показано: {filteredItems.length} из {items.length}
        </div>
      </div>

      {editingItem && (
        <EditItemModal
          item={editingItem}
          onSave={handleEditItem}
          onClose={() => setEditingItem(null)}
        />
      )}
    </main>
  )
}
