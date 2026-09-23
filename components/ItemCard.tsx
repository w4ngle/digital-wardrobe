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
    <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden hover:border-cyan-500 transition">
      {item.photo_url && (
        <div className="w-full h-48 bg-slate-900">
          <img
            src={item.photo_url}
            alt={item.category}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="p-4">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-medium text-slate-100">{item.category}</h3>
          <div className="flex gap-2">
            <button
              onClick={() => onEdit(item)}
              className="text-cyan-400 hover:text-cyan-300 text-sm"
              title="Редактировать"
            >
              ✎
            </button>
            <button
              onClick={handleDelete}
              className="text-red-400 hover:text-red-300 text-sm"
              title="Удалить"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">Цвет:</span>
            <span className="text-slate-200">{item.color}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Сезон:</span>
            <span className="text-slate-200">{item.season}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Стиль:</span>
            <span className="text-slate-200">{item.style}</span>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-700">
          <span className="text-xs text-slate-500">
            {new Date(item.created_at).toLocaleDateString('ru-RU')}
          </span>
        </div>
      </div>
    </div>
  )
}
