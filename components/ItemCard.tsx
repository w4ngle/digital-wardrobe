'use client'

import { Item } from '@/lib/supabase'
import { CoatHanger, Heart, PencilSimple, X } from '@phosphor-icons/react'

type ItemCardProps = {
  item: Item
  onDelete: (id: string) => Promise<void>
  onEdit: (item: Item) => void
  onFavorite: (item: Item) => Promise<void>
  onWear: (item: Item) => Promise<void>
  onAvailability: (item: Item, availability: NonNullable<Item['availability']>) => Promise<void>
  onSnooze: (item: Item, days: number) => Promise<void>
}

const availabilityLabels = { available: 'Доступна', laundry: 'В стирке', unavailable: 'Недоступна' } as const

export default function ItemCard({ item, onDelete, onEdit, onFavorite, onWear, onAvailability, onSnooze }: ItemCardProps) {
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
    <article className="group overflow-hidden rounded-[22px] bg-[#faf8f4] shadow-[0_1px_0_rgba(41,37,31,0.05),0_8px_24px_rgba(41,37,31,0.06)]">
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-[#e9e4db]">
        {item.photo_url ? (
          <img
            src={item.photo_url}
            alt={item.description || item.category}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[#9d9488]"><CoatHanger size={34} aria-label="Нет фото" /></div>
        )}

        <span className="absolute left-2.5 top-2.5 max-w-[calc(100%-8rem)] truncate rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold text-[#4d4941] shadow-sm backdrop-blur">
          {item.subcategory || item.category}
        </span>

        <div className="absolute right-2.5 top-2.5 flex gap-1.5">
          <button
            onClick={() => onFavorite(item)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-sm text-[#8c4a43] shadow-sm backdrop-blur transition active:scale-95"
            aria-label={item.is_favorite ? 'Убрать из избранного' : 'Добавить в избранное'}
          >
            <Heart size={17} weight={item.is_favorite ? 'fill' : 'regular'} aria-hidden />
          </button>
          <button
            onClick={() => onEdit(item)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-sm text-[#454139] shadow-sm backdrop-blur transition active:scale-95"
            aria-label="Редактировать вещь"
          >
            <PencilSimple size={17} aria-hidden />
          </button>
          <button
            onClick={handleDelete}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-sm text-[#8c4a43] shadow-sm backdrop-blur transition active:scale-95"
            aria-label="Удалить вещь"
          >
            <X size={17} aria-hidden />
          </button>
        </div>
      </div>

      <div className="px-3.5 pb-4 pt-3">
        <h2 className="line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-[#2d2a25] sm:text-base">
          {item.custom_name || item.description || `${item.color}, ${(item.subcategory || item.category).toLowerCase()}`}
        </h2>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-[#eee9df] px-2 py-1 text-[10px] text-[#746e64]">{item.color}</span>
          <span className="rounded-full bg-[#e5ece7] px-2 py-1 text-[10px] text-[#52635a]">{item.season}</span>
        </div>
        <button onClick={() => onWear(item)} className="mt-3 w-full rounded-xl bg-[#eee9df] px-2 py-2 text-xs font-medium text-[#52635a] active:scale-[0.98]">
          Надел сегодня{item.wear_count ? ` · ${item.wear_count}` : ''}
        </button>
        {item.subcategory === 'Джинсы' && (item.wears_since_wash || 0) >= 4 && <p className="mt-2 rounded-lg bg-[#f3e4dd] px-2 py-1.5 text-[10px] text-[#6f1820]">Пора освежить после {item.wears_since_wash} носок</p>}
        <label className="mt-2 block text-[10px] font-medium text-[#817b70]">
          Сейчас
          <select value={item.availability || 'available'} onChange={(event) => onAvailability(item, event.target.value as NonNullable<Item['availability']>)} className="mt-1 w-full rounded-xl border border-[#ddd7cc] bg-white px-2 py-2 text-xs text-[#52635a]">
            {Object.entries(availabilityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="mt-2 block text-[10px] font-medium text-[#817b70]">Не предлагать<select value="" onChange={(event) => { if (event.target.value) void onSnooze(item, Number(event.target.value)); event.target.value = '' }} className="mt-1 w-full rounded-xl border border-[#ddd7cc] bg-white px-2 py-2 text-xs text-[#52635a]"><option value="">Выбрать срок</option><option value="3">3 дня</option><option value="7">Неделю</option><option value="30">Месяц</option></select></label>
      </div>
    </article>
  )
}
