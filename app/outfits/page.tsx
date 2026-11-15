'use client'

import { useEffect, useState } from 'react'
import { createOutfit, deleteOutfit, editOutfit, getItems, getOutfits, updateOutfit } from '@/lib/api'
import { Item, OutfitWithItems } from '@/lib/supabase'
import OutfitCollage from '@/components/OutfitCollage'
import { Heart, PencilSimple, X } from '@phosphor-icons/react'
import FastImage from '@/components/FastImage'

export default function OutfitsPage() {
  const [outfits, setOutfits] = useState<OutfitWithItems[]>([])
  const [allItems, setAllItems] = useState<Item[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [occasion, setOccasion] = useState('')
  const [notes, setNotes] = useState('')
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([])
  const [role, setRole] = useState<'owner' | 'partner'>('owner')
  const [authorName, setAuthorName] = useState('')
  const [partnerMessage, setPartnerMessage] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)

  async function loadData() {
    const [outfitsData, itemsData] = await Promise.all([getOutfits(), getItems()])
    setOutfits(outfitsData)
    setAllItems(itemsData)
  }

  useEffect(() => {
    fetch('/api/auth/telegram').then((response) => response.json()).then((session) => setRole(session.role || 'owner')).catch(() => undefined)
    Promise.all([getOutfits(), getItems()])
      .then(([outfitsData, itemsData]) => {
        setOutfits(outfitsData)
        setAllItems(itemsData)
      })
      .catch(() => alert('Не удалось загрузить образы'))
      .finally(() => setLoading(false))
  }, [])

  const selectedItems = allItems.filter((item) => selectedItemIds.includes(item.id))
  const visibleOutfits = outfits.filter((outfit) => outfit.rating !== -1)

  function toggleItem(id: string) {
    const item = allItems.find((candidate) => candidate.id === id)
    if (!item) return
    setSelectedItemIds((current) => {
      if (current.includes(id)) return current.filter((itemId) => itemId !== id)
      const sameCategory = current.find((itemId) => allItems.find((candidate) => candidate.id === itemId)?.category === item.category)
      return sameCategory ? current.map((itemId) => itemId === sameCategory ? id : itemId) : [...current, id]
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (selectedItemIds.length < 2) return
    setSaving(true)
    try {
      if (editingId) await editOutfit(editingId, { name, occasion: occasion.trim() || null, notes: notes.trim() || null, itemIds: selectedItemIds })
      else await createOutfit({ name, occasion: occasion.trim() || null, notes: notes.trim() || null, suggested_by_name: role === 'partner' ? authorName.trim() : null, partner_message: role === 'partner' ? partnerMessage.trim() || null : null }, selectedItemIds)
      setName('')
      setOccasion('')
      setNotes('')
      setPartnerMessage('')
      setEditingId(null)
      setSelectedItemIds([])
      setShowForm(false)
      await loadData()
    } catch {
      alert('Не удалось сохранить образ')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Удалить этот образ?')) return
    await deleteOutfit(id)
    setOutfits((current) => current.filter((outfit) => outfit.id !== id))
  }

  async function handleFavorite(outfit: OutfitWithItems) {
    const updated = await updateOutfit(outfit.id, { is_favorite: !outfit.is_favorite })
    setOutfits((current) => current.map((candidate) => candidate.id === outfit.id ? { ...candidate, ...updated } : candidate))
  }

  async function handlePlan(outfit: OutfitWithItems, planned_for: string) {
    const updated = await updateOutfit(outfit.id, { planned_for: planned_for || null })
    setOutfits((current) => current.map((candidate) => candidate.id === outfit.id ? { ...candidate, ...updated } : candidate))
  }

  async function handleProposal(outfit: OutfitWithItems, proposal_status: 'accepted' | 'declined' | 'will_wear') {
    const owner_reaction = proposal_status === 'accepted' ? 'Нравится 🤍' : proposal_status === 'will_wear' ? 'Надену ✨' : 'Не в этот раз'
    const updated = await updateOutfit(outfit.id, { proposal_status, owner_reaction })
    setOutfits((current) => current.map((candidate) => candidate.id === outfit.id ? { ...candidate, ...updated } : candidate))
  }

  function startEdit(outfit: OutfitWithItems) {
    setEditingId(outfit.id); setName(outfit.name); setOccasion(outfit.occasion || ''); setNotes(outfit.notes || ''); setSelectedItemIds(outfit.items.map((item) => item.id)); setShowForm(true); window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <main className="min-h-screen bg-[#f6f0e6] text-[#1e3026]">
      <div className="mx-auto max-w-5xl px-4 pb-32 pt-[max(24px,env(safe-area-inset-top))] sm:px-6">
        <header className="mb-7 flex items-start justify-between gap-4">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#817b70]">Мои сочетания</p>
            <h1 className="text-4xl font-bold leading-none tracking-[-0.04em]">Образы</h1>
            <p className="mt-2 text-sm text-[#817b70]">{loading ? 'Загружаем…' : `${visibleOutfits.length} сохранено`}</p>
          </div>
          <button onClick={() => { setShowForm((current) => !current); setEditingId(null) }} className="rounded-full bg-[#1f422f] px-4 py-3 text-sm font-medium text-white shadow-sm active:scale-95">
            {showForm ? 'Закрыть' : '+ Собрать'}
          </button>
        </header>

        {showForm && (
          <form onSubmit={handleSubmit} className="mb-8 rounded-[24px] bg-[#faf8f4] p-4 shadow-[0_8px_30px_rgba(41,37,31,0.08)] sm:p-6">
            <div className="mb-5 grid grid-cols-[104px_1fr] gap-4">
              <div className="overflow-hidden rounded-2xl bg-[#ece7de]">
                {selectedItems.length ? <OutfitCollage items={selectedItems} /> : <div className="flex aspect-square items-center justify-center px-3 text-center text-xs text-[#8c867b]">Выберите вещи</div>}
              </div>
              <div className="space-y-2">
                <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} placeholder="Название образа" className="w-full rounded-xl border border-[#ddd7cc] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#65786d]" />
                <input value={occasion} onChange={(e) => setOccasion(e.target.value)} maxLength={100} placeholder="Куда пойдёте?" className="w-full rounded-xl border border-[#ddd7cc] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#65786d]" />
                <input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} placeholder="Записка к образу" className="w-full rounded-xl border border-[#ddd7cc] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#65786d]" />
                {role === 'partner' && <><input value={authorName} onChange={(e) => setAuthorName(e.target.value)} required maxLength={60} placeholder="Твоё имя" className="w-full rounded-xl border border-[#ddd7cc] bg-white px-3 py-2.5 text-sm" /><input value={partnerMessage} onChange={(e) => setPartnerMessage(e.target.value)} maxLength={300} placeholder="Короткое сообщение" className="w-full rounded-xl border border-[#ddd7cc] bg-white px-3 py-2.5 text-sm" /></>}
                <p className="text-xs text-[#817b70]">Выбрано: {selectedItems.length}</p>
              </div>
            </div>

            <h2 className="mb-3 text-sm font-semibold">Выберите вещи</h2>
            <div className="grid max-h-[420px] grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-5">
              {allItems.filter((item) => !item.availability || item.availability === 'available').map((item) => {
                const selected = selectedItemIds.includes(item.id)
                return (
                  <button type="button" key={item.id} onClick={() => toggleItem(item.id)} className={`relative overflow-hidden rounded-2xl border-2 bg-[#ece7de] transition ${selected ? 'border-[#26372f]' : 'border-transparent'}`} aria-pressed={selected}>
                    {item.photo_url && <FastImage src={item.photo_url} alt={item.description || item.category} className="aspect-square w-full object-cover" />}
                    <span className="block truncate bg-white/90 px-2 py-2 text-left text-[10px] font-medium">{item.description || item.category}</span>
                    {selected && <span className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#26372f] text-xs text-white">✓</span>}
                  </button>
                )
              })}
            </div>

            <button type="submit" disabled={saving || selectedItemIds.length < 2} className="mt-5 w-full rounded-xl bg-[#26372f] px-4 py-3.5 font-semibold text-white disabled:opacity-35">
              {saving ? 'Сохраняем…' : selectedItemIds.length < 2 ? 'Выберите минимум 2 вещи' : editingId ? 'Сохранить изменения' : 'Сохранить образ'}
            </button>
          </form>
        )}

        {loading ? (
          <div className="grid grid-cols-2 gap-4"><div className="aspect-[4/5] animate-pulse rounded-[24px] bg-[#e6e1d8]" /><div className="aspect-[4/5] animate-pulse rounded-[24px] bg-[#e6e1d8]" /></div>
        ) : visibleOutfits.length ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6">
            {visibleOutfits.map((outfit) => (
              <article key={outfit.id} className="overflow-hidden rounded-[24px] bg-[#faf8f4] shadow-[0_8px_24px_rgba(41,37,31,0.06)]">
                <OutfitCollage items={outfit.items} />
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0"><h2 className="truncate font-semibold">{outfit.name}</h2><p className="mt-1 truncate text-xs text-[#817b70]">{outfit.suggested_by === 'partner' ? '💌 Предложение от любимого' : outfit.occasion || `${outfit.items.length} вещи`}</p></div>
                    <div className="flex shrink-0 gap-2">
                      {role === 'owner' && <button onClick={() => startEdit(outfit)} className="text-[#52635a]" aria-label="Изменить образ"><PencilSimple size={20} /></button>}
                      <button onClick={() => handleFavorite(outfit)} className="text-[#6f1820]" aria-label={outfit.is_favorite ? 'Убрать из избранного' : 'Добавить в избранное'}><Heart size={20} weight={outfit.is_favorite ? 'fill' : 'regular'} aria-hidden /></button>
                      <button onClick={() => handleDelete(outfit.id)} className="text-[#6f1820]" aria-label="Удалить образ"><X size={20} aria-hidden /></button>
                    </div>
                  </div>
                  {outfit.notes && <p className="mt-3 line-clamp-2 text-xs leading-5 text-[#746e64]">{outfit.notes}</p>}
                  {outfit.suggested_by === 'partner' && <div className="mt-3 rounded-xl bg-[#f3ede4] p-3 text-xs"><p className="font-semibold">От {outfit.suggested_by_name || 'любимого'}</p>{outfit.partner_message && <p className="mt-1 text-[#746e64]">{outfit.partner_message}</p>}{role === 'owner' && outfit.proposal_status === 'pending' ? <div className="mt-3 grid grid-cols-3 gap-1"><button onClick={() => handleProposal(outfit, 'accepted')} className="rounded-lg bg-white px-2 py-2">Нравится</button><button onClick={() => handleProposal(outfit, 'will_wear')} className="rounded-lg bg-[#1f422f] px-2 py-2 text-white">Надену</button><button onClick={() => handleProposal(outfit, 'declined')} className="rounded-lg bg-white px-2 py-2">Не сейчас</button></div> : <p className="mt-2 font-medium">{outfit.owner_reaction || (outfit.proposal_status === 'pending' ? 'Ждёт ответа' : '')}</p>}</div>}
                  <label className="mt-3 block text-[10px] font-semibold uppercase tracking-wide text-[#817b70]">
                    Запланировать
                    <input type="date" value={outfit.planned_for || ''} onChange={(event) => handlePlan(outfit, event.target.value)} className="mt-1 w-full rounded-lg border border-[#ddd7cc] bg-white px-2 py-2 text-xs font-normal normal-case tracking-normal" />
                  </label>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-[24px] border border-[#ded8cd] bg-[#faf8f4] px-6 py-14 text-center text-sm text-[#817b70]">Соберите первый образ из вещей гардероба</div>
        )}
      </div>
    </main>
  )
}
