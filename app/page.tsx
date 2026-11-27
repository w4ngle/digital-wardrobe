'use client'

import { useState, useEffect, useRef } from 'react'
import { getItems, createItem, deleteItem, updateItem, markItemWorn, unmarkItemWorn, clearDemoItems } from '@/lib/api'
import { Item } from '@/lib/supabase'
import ItemCard from '@/components/ItemCard'
import ItemForm from '@/components/ItemForm'
import ItemFilters from '@/components/ItemFilters'
import EditItemModal from '@/components/EditItemModal'
import { Plus } from '@phosphor-icons/react'
import { moscowDate } from '@/lib/date'

export default function Home() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [filterCategory, setFilterCategory] = useState('')
  const [filterSeason, setFilterSeason] = useState('')
  const [filterStyle, setFilterStyle] = useState('')
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [visibleCount, setVisibleCount] = useState(30)
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [notice, setNotice] = useState('')
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const demoItems = items.filter((item) => item.ai_meta?.demo === true)

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
    warmth?: number
    formality: number
    photo_url: string | null
    ai_meta: Record<string, unknown> | null
    subcategory: string | null
    custom_name: string | null
    fit: string | null
    length: string | null
    pattern: string | null
    layer_role: string | null
    comfort: number
    confidence: number
    needs_underlayer: boolean
    rain_safe: boolean
  }) => {
    const newItem = await createItem(itemData)
    setItems([newItem, ...items])
    setShowForm(false)
  }

  const handleDeleteItem = async (id: string) => {
    await deleteItem(id)
    setItems(items.filter(item => item.id !== id))
  }

  const handleEditItem = async (id: string, updates: Partial<Omit<Item, 'id' | 'created_at'>>) => {
    const updated = await updateItem(id, updates)
    setItems(items.map(item => item.id === id ? updated : item))
  }

  const handleResetFilters = () => {
    setFilterCategory('')
    setFilterSeason('')
    setFilterStyle('')
    setVisibleCount(30)
  }

  const handleFavorite = async (item: Item) => {
    const updated = await updateItem(item.id, { is_favorite: !item.is_favorite })
    setItems((current) => current.map((candidate) => candidate.id === item.id ? updated : candidate))
  }

  const handleWear = async (item: Item) => {
    const wornToday = Boolean(item.last_worn_at && moscowDate(item.last_worn_at) === moscowDate())
    const updated = wornToday ? await unmarkItemWorn(item.id) : await markItemWorn(item.id)
    setItems((current) => current.map((candidate) => candidate.id === item.id ? updated : candidate))
    setNotice(wornToday ? 'Отметка «Надето сегодня» отменена' : 'Отмечено: надето сегодня')
    window.setTimeout(() => setNotice(''), 2500)
  }

  const handleAvailability = async (item: Item, availability: NonNullable<Item['availability']>) => {
    const returnAt = new Date()
    returnAt.setDate(returnAt.getDate() + 2)
    const updated = await updateItem(item.id, {
      availability,
      laundry_return_at: availability === 'laundry' ? returnAt.toISOString() : null,
      ...(availability === 'available' ? { wears_since_wash: 0 } : {}),
    })
    setItems((current) => current.map((candidate) => candidate.id === item.id ? updated : candidate))
  }

  const handleSnooze = async (item: Item, days: number) => {
    const date = new Date()
    date.setDate(date.getDate() + days)
    const updated = await updateItem(item.id, { snoozed_until: date.toISOString().slice(0, 10) })
    setItems((current) => current.map((candidate) => candidate.id === item.id ? updated : candidate))
  }

  const handleUnavailableReason = async (item: Item, unavailable_reason: string | null) => {
    const updated = await updateItem(item.id, { unavailable_reason })
    setItems((current) => current.map((candidate) => candidate.id === item.id ? updated : candidate))
  }

  const handleClearDemo = async () => {
    if (!confirm('Удалить все демонстрационные вещи? Настоящие вещи останутся.')) return
    await clearDemoItems()
    setItems((current) => current.filter((item) => item.ai_meta?.demo !== true))
  }

  const filteredItems = items.filter(item => {
    if (filterCategory && item.category !== filterCategory) return false
    if (filterSeason && item.season !== filterSeason) return false
    if (filterStyle && item.style !== filterStyle) return false
    if (favoritesOnly && !item.is_favorite) return false
    return true
  }).filter((item, index, all) => all.findIndex((candidate) => (candidate.photo_url?.split('?')[0] || candidate.id) === (item.photo_url?.split('?')[0] || item.id)) === index)
  const visibleItems = filteredItems.slice(0, visibleCount)

  useEffect(() => {
    const target = loadMoreRef.current
    if (!target || visibleCount >= filteredItems.length) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setVisibleCount((count) => Math.min(count + 30, filteredItems.length))
    }, { rootMargin: '300px' })
    observer.observe(target)
    return () => observer.disconnect()
  }, [filteredItems.length, visibleCount])

  return (
    <main className="min-h-screen bg-[#f6f0e6] text-[#1e3026]">
      <div className="mx-auto max-w-6xl px-4 pb-32 pt-[max(24px,env(safe-area-inset-top))] sm:px-6">
        <header className="mb-7 flex items-start justify-between gap-4">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#817b70]">
              Личный гардероб
            </p>
            <h1 className="text-4xl font-bold leading-none tracking-[-0.04em] text-[#1e3026] sm:text-5xl">
              Гардероб
            </h1>
            <p className="mt-2 text-sm text-[#817b70]">
              {loading ? 'Загружаем вещи…' : `${items.length} ${items.length === 1 ? 'вещь' : items.length > 1 && items.length < 5 ? 'вещи' : 'вещей'}`}
            </p>
          </div>

          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#1f422f] text-white shadow-sm transition active:scale-95"
              aria-label="Добавить вещь"
            >
              <Plus size={22} aria-hidden />
            </button>
          )}
        </header>

        {showForm && (
          <div className="mb-7 overflow-hidden rounded-[24px] shadow-sm">
            <ItemForm
              onSubmit={handleCreateItem}
              onCancel={() => setShowForm(false)}
            />
          </div>
        )}

        {!loading && demoItems.length > 0 && <div className="mb-5 flex items-center justify-between gap-3 rounded-2xl bg-[#e5ece7] px-4 py-3 text-xs text-[#52635a]"><span>Демо-гардероб: {demoItems.length} вещей для знакомства с приложением</span><button type="button" onClick={handleClearDemo} className="shrink-0 font-semibold underline">Очистить</button></div>}

        <button type="button" onClick={() => { setFavoritesOnly((value) => !value); setVisibleCount(30) }} aria-pressed={favoritesOnly} className={`mb-4 rounded-full px-4 py-2 text-xs font-semibold ${favoritesOnly ? 'bg-[#1f422f] text-white' : 'border border-[#ddd7cc] bg-[#faf8f4]'}`}>♡ Избранное</button>

        <ItemFilters
          category={filterCategory}
          season={filterSeason}
          style={filterStyle}
          onCategoryChange={(value) => { setFilterCategory(value); setVisibleCount(30) }}
          onSeasonChange={(value) => { setFilterSeason(value); setVisibleCount(30) }}
          onStyleChange={(value) => { setFilterStyle(value); setVisibleCount(30) }}
          onReset={handleResetFilters}
        />

        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="aspect-[3/4] animate-pulse rounded-[22px] bg-[#e6e1d8]" />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="rounded-[24px] border border-[#ded8cd] bg-[#faf8f4] px-6 py-14 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#ece7dd] text-xl">◇</div>
            <p className="mb-2 font-medium text-[#454139]">
              {items.length === 0 ? 'Ваш гардероб пока пуст' : 'Ничего не найдено'}
            </p>
            <p className="text-sm text-[#8c867b]">
              {items.length === 0 ? 'Добавьте первую вещь, чтобы начать' : 'Попробуйте изменить фильтры'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 sm:gap-x-5 sm:gap-y-7">
            {visibleItems.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                onDelete={handleDeleteItem}
                onEdit={(item) => setEditingItem(item)}
                onFavorite={handleFavorite}
                onWear={handleWear}
                onAvailability={handleAvailability}
                onSnooze={handleSnooze}
                onUnavailableReason={handleUnavailableReason}
              />
            ))}
          </div>
        )}

        {!loading && visibleCount < filteredItems.length && <div ref={loadMoreRef} className="h-10" aria-label="Загружаем ещё вещи" />}

        {!loading && items.length > 0 && (
          <p className="mt-10 text-center text-xs text-[#9b958a]">
            Показано {visibleItems.length} из {filteredItems.length}{filteredItems.length !== items.length ? ` · всего ${items.length}` : ''}
          </p>
        )}
      </div>

      {editingItem && (
        <EditItemModal
          item={editingItem}
          onSave={handleEditItem}
          onClose={() => setEditingItem(null)}
        />
      )}
      {notice && <div role="status" className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-sm rounded-xl bg-[#1f422f] px-4 py-3 text-center text-sm font-semibold text-white shadow-lg">{notice}</div>}
    </main>
  )
}
