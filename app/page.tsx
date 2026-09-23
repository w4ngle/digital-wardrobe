'use client'

import { useState, useEffect } from 'react'
import { getItems, createItem, deleteItem, createOutfit, updateItem } from '@/lib/api'
import { Item } from '@/lib/supabase'
import ItemCard from '@/components/ItemCard'
import ItemForm from '@/components/ItemForm'
import ItemFilters from '@/components/ItemFilters'
import RecommendationModal from '@/components/RecommendationModal'
import EditItemModal from '@/components/EditItemModal'
import { recommendOutfit } from '@/lib/recommendations'

export default function Home() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [filterCategory, setFilterCategory] = useState('')
  const [filterSeason, setFilterSeason] = useState('')
  const [filterStyle, setFilterStyle] = useState('')
  const [recommendation, setRecommendation] = useState<{
    items: Item[]
    reason: string
  } | null>(null)
  const [editingItem, setEditingItem] = useState<Item | null>(null)

  useEffect(() => {
    loadItems()
  }, [])

  const loadItems = async () => {
    try {
      const data = await getItems()
      setItems(data)
    } catch (error) {
      console.error('Ошибка загрузки вещей:', error)
      alert('Не удалось загрузить гардероб')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateItem = async (itemData: {
    category: string
    color: string
    season: string
    style: string
    photo_url: string | null
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

  const handleRecommend = () => {
    if (!filterSeason || !filterStyle) {
      alert('Выберите сезон и стиль для подбора образа')
      return
    }

    const result = recommendOutfit(items, filterSeason, filterStyle)

    if (!result) {
      alert('Не найдено подходящих вещей для образа')
      return
    }

    setRecommendation(result)
  }

  const handleSaveRecommendation = async () => {
    if (!recommendation) return

    try {
      await createOutfit(
        {
          name: recommendation.reason,
          occasion: null,
          notes: null
        },
        recommendation.items.map(item => item.id)
      )
      alert('Образ сохранён!')
      setRecommendation(null)
    } catch (error) {
      console.error('Ошибка сохранения образа:', error)
      alert('Не удалось сохранить образ')
    }
  }

  const filteredItems = items.filter(item => {
    if (filterCategory && item.category !== filterCategory) return false
    if (filterSeason && item.season !== filterSeason) return false
    if (filterStyle && item.style !== filterStyle) return false
    return true
  })

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-slate-100 mb-2">
            Цифровой гардероб
          </h1>
          <p className="text-slate-400">
            Управляйте своим гардеробом и создавайте образы
          </p>
        </header>

        <div className="mb-6 flex justify-between items-center">
          <div>
            {!showForm ? (
              <button
                onClick={() => setShowForm(true)}
                className="bg-cyan-600 hover:bg-cyan-700 text-white font-medium py-3 px-6 rounded-lg transition"
              >
                + Добавить вещь
              </button>
            ) : null}
          </div>
          <a
            href="/outfits"
            className="bg-slate-800 hover:bg-slate-700 text-white font-medium py-3 px-6 rounded-lg transition"
          >
            Образы
          </a>
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

        {filterSeason && filterStyle && (
          <div className="mb-6">
            <button
              onClick={handleRecommend}
              className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-medium py-3 px-4 rounded-lg transition"
            >
              🎯 Подобрать образ
            </button>
          </div>
        )}

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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

      {recommendation && (
        <RecommendationModal
          items={recommendation.items}
          reason={recommendation.reason}
          onClose={() => setRecommendation(null)}
          onSave={handleSaveRecommendation}
        />
      )}

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
