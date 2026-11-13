'use client'

import { Item } from '@/lib/supabase'

type ItemCardProps = {
  item: Item
  onDelete: (id: string) => Promise<void>
  onEdit: (item: Item) => void
}

export default function ItemCard({ item, onDelete, onEdit }: ItemCardProps) {
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
          <div className="flex h-full items-center justify-center text-3xl text-[#b1aa9e]">◇</div>
        )}

        <span className="absolute left-2.5 top-2.5 max-w-[calc(100%-5.75rem)] truncate rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold text-[#4d4941] shadow-sm backdrop-blur">
          {item.category}
        </span>

        <div className="absolute right-2.5 top-2.5 flex gap-1.5">
          <button
            onClick={() => onEdit(item)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-sm text-[#454139] shadow-sm backdrop-blur transition active:scale-95"
            aria-label="Редактировать вещь"
          >
            ✎
          </button>
          <button
            onClick={handleDelete}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-sm text-[#8c4a43] shadow-sm backdrop-blur transition active:scale-95"
            aria-label="Удалить вещь"
          >
            ×
          </button>
        </div>
      </div>

      <div className="px-3.5 pb-4 pt-3">
        <h2 className="line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-[#2d2a25] sm:text-base">
          {item.description || `${item.color}, ${item.category.toLowerCase()}`}
        </h2>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-[#eee9df] px-2 py-1 text-[10px] text-[#746e64]">{item.color}</span>
          <span className="rounded-full bg-[#e5ece7] px-2 py-1 text-[10px] text-[#52635a]">{item.season}</span>
        </div>
      </div>
    </article>
  )
}
