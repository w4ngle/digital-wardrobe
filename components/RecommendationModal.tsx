'use client'

import { Item } from '@/lib/supabase'

type RecommendationModalProps = {
  items: Item[]
  reason: string
  onClose: () => void
  onSave: () => void
}

export default function RecommendationModal({
  items,
  reason,
  onClose,
  onSave
}: RecommendationModalProps) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-100 mb-1">
                Рекомендованный образ
              </h2>
              <p className="text-sm text-slate-400">{reason}</p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-300 text-2xl"
            >
              ×
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden"
              >
                {item.photo_url && (
                  <div className="w-full h-32 bg-slate-950">
                    <img
                      src={item.photo_url}
                      alt={item.category}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="p-3">
                  <p className="text-sm font-medium text-slate-200 mb-1">
                    {item.category}
                  </p>
                  <p className="text-xs text-slate-400">{item.color}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={onSave}
              className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-medium py-3 px-4 rounded-lg transition"
            >
              Сохранить образ
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition"
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
