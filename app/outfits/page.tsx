'use client'

import { useEffect, useState } from 'react'
import { getOutfits, getItems, createOutfit, deleteOutfit } from '@/lib/api'
import { OutfitWithItems, Item } from '@/lib/supabase'

export default function OutfitsPage() {
  const [outfits, setOutfits] = useState<OutfitWithItems[]>([])
  const [allItems, setAllItems] = useState<Item[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)

  const [name, setName] = useState('')
  const [occasion, setOccasion] = useState('')
  const [notes, setNotes] = useState('')
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([])

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const [outfitsData, itemsData] = await Promise.all([
      getOutfits(),
      getItems()
    ])
    setOutfits(outfitsData)
    setAllItems(itemsData)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await createOutfit(
        {
          name,
          occasion: occasion.trim() || null,
          notes: notes.trim() || null
        },
        selectedItemIds
      )
      setName('')
      setOccasion('')
      setNotes('')
      setSelectedItemIds([])
      setShowForm(false)
      await loadData()
    } catch (err) {
      console.error('Ошибка создания образа:', JSON.stringify(err, null, 2))
      alert('Ошибка создания образа')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Удалить образ?')) return
    await deleteOutfit(id)
    await loadData()
  }

  function toggleItem(id: string) {
    setSelectedItemIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  return (
    <div className="min-h-screen bg-[#0B0E14] px-4 pb-28 pt-[max(24px,env(safe-area-inset-top))] text-[#F8FAFC]">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex items-center justify-between gap-3">
          <h1 className="text-3xl font-bold">Образы</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="rounded-xl bg-[#F97316] px-4 py-2 transition hover:bg-[#EA580C]"
          >
            {showForm ? 'Отмена' : 'Создать'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-[#1E293B] p-6 rounded-lg mb-8">
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Название образа"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="w-full p-3 bg-[#0F172A] border border-[#334155] rounded-lg"
              />
              <input
                type="text"
                placeholder="Повод (опционально)"
                value={occasion}
                onChange={e => setOccasion(e.target.value)}
                className="w-full p-3 bg-[#0F172A] border border-[#334155] rounded-lg"
              />
              <textarea
                placeholder="Заметки (опционально)"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                className="w-full p-3 bg-[#0F172A] border border-[#334155] rounded-lg"
              />

              <div>
                <h3 className="text-lg font-semibold mb-3">Выберите вещи</h3>
                <div className="grid max-h-96 grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3">
                  {allItems.map(item => (
                    <div
                      key={item.id}
                      onClick={() => toggleItem(item.id)}
                      className={`cursor-pointer border-2 rounded-lg p-2 transition ${
                        selectedItemIds.includes(item.id)
                          ? 'border-[#38BDF8] bg-[#38BDF8]/10'
                          : 'border-[#334155] hover:border-[#475569]'
                      }`}
                    >
                      {item.photo_url && (
                        <img
                          src={item.photo_url}
                          alt={item.category}
                          className="w-full h-32 object-cover rounded mb-2"
                        />
                      )}
                      <p className="text-sm">{item.category}</p>
                      <p className="text-xs text-[#94A3B8]">{item.color}</p>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#F97316] rounded-lg hover:bg-[#EA580C] transition disabled:opacity-50"
              >
                {loading ? 'Создание...' : 'Создать образ'}
              </button>
            </div>
          </form>
        )}

        <div className="grid gap-6">
          {outfits.map(outfit => (
            <div key={outfit.id} className="bg-[#1E293B] p-6 rounded-lg border border-[#334155]">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold">{outfit.name}</h2>
                  {outfit.occasion && (
                    <p className="text-[#38BDF8] text-sm mt-1">{outfit.occasion}</p>
                  )}
                  {outfit.notes && (
                    <p className="text-[#94A3B8] text-sm mt-2">{outfit.notes}</p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(outfit.id)}
                  className="px-3 py-1 bg-red-600 rounded hover:bg-red-700 transition text-sm"
                >
                  Удалить
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
                {outfit.items.map(item => (
                  <div key={item.id} className="bg-[#0F172A] rounded-lg p-3 border border-[#334155]">
                    {item.photo_url && (
                      <img
                        src={item.photo_url}
                        alt={item.category}
                        className="w-full h-40 object-cover rounded mb-2"
                      />
                    )}
                    <p className="font-semibold">{item.category}</p>
                    <p className="text-sm text-[#94A3B8]">{item.color}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {outfits.length === 0 && !showForm && (
          <p className="text-center text-[#94A3B8] mt-12">
            Нет образов. Создайте первый!
          </p>
        )}
      </div>
    </div>
  )
}
