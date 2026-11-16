'use client'

import { useState } from 'react'
import { Item } from '@/lib/supabase'
import { CoatHanger, Heart, PencilSimple, X } from '@phosphor-icons/react'
import FastImage from '@/components/FastImage'

type ItemCardProps = {
  item: Item
  onDelete: (id: string) => Promise<void>
  onEdit: (item: Item) => void
  onFavorite: (item: Item) => Promise<void>
  onWear: (item: Item) => Promise<void>
  onAvailability: (item: Item, availability: NonNullable<Item['availability']>) => Promise<void>
  onSnooze: (item: Item, days: number) => Promise<void>
  onUnavailableReason: (item: Item, reason: string | null) => Promise<void>
}

const availabilityLabels = { available: 'Доступна', laundry: 'В стирке', unavailable: 'Недоступна' } as const

export default function ItemCard({ item, onDelete, onEdit, onFavorite, onWear, onAvailability, onSnooze, onUnavailableReason }: ItemCardProps) {
  const [detailsOpen, setDetailsOpen] = useState(false)
  const handleDelete = async () => {
    if (!confirm('Удалить эту вещь?')) return
    try {
      await onDelete(item.id)
    } catch (error) {
      console.error('Ошибка при удалении:', error)
      alert('Не удалось удалить вещь')
    }
  }

  return (
    <article className="group relative overflow-hidden rounded-[22px] bg-[#faf8f4] shadow-[0_1px_0_rgba(41,37,31,0.05),0_8px_24px_rgba(41,37,31,0.06)]">
      <button type="button" onClick={() => setDetailsOpen(true)} className="relative block aspect-[4/5] w-full overflow-hidden bg-[#e9e4db] text-left" aria-label="Открыть карточку вещи">
        {item.photo_url ? (
          <FastImage
            src={item.photo_url}
            alt={item.description || item.category}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[#9d9488]"><CoatHanger size={34} aria-label="Нет фото" /></div>
        )}

        <span className="absolute left-2.5 top-2.5 max-w-[calc(100%-8rem)] rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold leading-tight text-[#4d4941] shadow-sm backdrop-blur">
          {item.ai_meta?.demo === true ? 'Демо · ' : ''}{item.subcategory || item.category}
        </span>

      </button>
        <div className="absolute right-2.5 top-2.5 z-10 flex gap-1.5">
          <button
            onClick={() => onFavorite(item)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-sm text-[#8c4a43] shadow-sm backdrop-blur transition active:scale-95"
            aria-label={item.is_favorite ? 'Убрать из избранного' : 'Добавить в избранное'}
          >
            <Heart size={17} weight={item.is_favorite ? 'fill' : 'regular'} aria-hidden />
          </button>
        </div>

      <div className="px-3.5 pb-4 pt-3">
        <h2 className="line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-[#2d2a25] sm:text-base">
          {item.custom_name || item.description || `${item.color}, ${(item.subcategory || item.category).toLowerCase()}`}
        </h2>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-[#eee9df] px-2 py-1 text-[10px] text-[#746e64]">{item.color}</span>
          <span className="rounded-full bg-[#e5ece7] px-2 py-1 text-[10px] text-[#52635a]">{item.season}</span>
          <span className="rounded-full bg-[#f3e4dd] px-2 py-1 text-[10px] text-[#6f1820]">{availabilityLabels[item.availability || 'available']}</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => onWear(item)} className="rounded-xl bg-[#1f422f] px-2 py-2.5 text-xs font-semibold text-white active:scale-[0.98]">Надела</button>
          <button type="button" onClick={() => setDetailsOpen(true)} className="rounded-xl bg-[#eee9df] px-2 py-2.5 text-xs font-medium text-[#52635a] active:scale-[0.98]">Подробнее</button>
        </div>
      </div>

      {detailsOpen && <div className="fixed inset-0 z-50 flex items-end bg-black/45 p-3 sm:items-center sm:justify-center" onClick={() => setDetailsOpen(false)}><section className="max-h-[88vh] w-full max-w-md overflow-y-auto rounded-[28px] bg-[#fffaf2] p-5 text-[#2d2a25]" onClick={(event) => event.stopPropagation()}><div className="mb-4 flex items-start justify-between gap-3"><div><p className="text-xs text-[#817b70]">{item.subcategory || item.category}</p><h2 className="mt-1 text-xl font-bold">{item.custom_name || item.description || `${item.color}, ${(item.subcategory || item.category).toLowerCase()}`}</h2></div><button type="button" onClick={() => setDetailsOpen(false)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#eee9df]" aria-label="Закрыть"><X size={18} /></button></div><div className="mb-4 grid grid-cols-2 gap-2"><button type="button" onClick={() => { setDetailsOpen(false); onEdit(item) }} className="flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#1f422f] text-sm font-semibold"><PencilSimple size={17} />Изменить</button><button type="button" onClick={handleDelete} className="min-h-11 rounded-full border border-[#8c4a43] text-sm font-semibold text-[#8c4a43]">Удалить</button></div>
        <button onClick={() => onWear(item)} className="mt-3 w-full rounded-xl bg-[#eee9df] px-2 py-3 text-xs font-medium text-[#52635a] active:scale-[0.98]">
          Надела сегодня{item.wears_since_wash ? ` · после стирки ${item.wears_since_wash}` : ''}
        </button>
        {Boolean(item.wear_count) && <p className="mt-1 text-center text-[10px] text-[#817b70]">Всего надеваний: {item.wear_count}</p>}
        {(item.wears_since_wash || 0) >= (item.category === 'Верхняя одежда' ? 5 : item.subcategory === 'Джинсы' ? 4 : item.layer_role === 'Второй слой' ? 2 : 1) && <p className="mt-2 rounded-lg bg-[#f3e4dd] px-2 py-1.5 text-[10px] text-[#6f1820]">Пора решить: в стирку или надеть ещё раз</p>}
        <label className="mt-2 block text-[10px] font-medium text-[#817b70]">
          Сейчас
          <select value={item.availability || 'available'} onChange={(event) => onAvailability(item, event.target.value as NonNullable<Item['availability']>)} className="mt-1 w-full rounded-xl border border-[#ddd7cc] bg-white px-2 py-2 text-xs text-[#52635a]">
            {Object.entries(availabilityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        {item.availability === 'unavailable' && <label className="mt-2 block text-[10px] font-medium text-[#817b70]">Почему<select value={item.unavailable_reason || ''} onChange={(event) => onUnavailableReason(item, event.target.value || null)} className="mt-1 w-full rounded-xl border border-[#ddd7cc] bg-white px-2 py-2 text-xs text-[#52635a]"><option value="">Выберите причину</option>{['В плохом состоянии', 'Не могу найти', 'Больше не ношу', 'Отдать или выбросить'].map((reason) => <option key={reason}>{reason}</option>)}</select></label>}
        <label className="mt-2 block text-[10px] font-medium text-[#817b70]">Не предлагать<select value="" onChange={(event) => { if (event.target.value) void onSnooze(item, Number(event.target.value)); event.target.value = '' }} className="mt-1 w-full rounded-xl border border-[#ddd7cc] bg-white px-2 py-2 text-xs text-[#52635a]"><option value="">Выбрать срок</option><option value="3">3 дня</option><option value="7">Неделю</option><option value="30">Месяц</option></select></label>
      </section></div>}
    </article>
  )
}
