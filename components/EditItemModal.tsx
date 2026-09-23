'use client'

import { useState } from 'react'
import { Item } from '@/lib/supabase'
import { uploadPhoto } from '@/lib/api'

type EditItemModalProps = {
  item: Item
  onSave: (id: string, data: {
    category: string
    color: string
    season: string
    style: string
    photo_url: string | null
  }) => Promise<void>
  onClose: () => void
}

const categories = ['Верх', 'Низ', 'Обувь', 'Верхняя одежда', 'Аксессуар']
const seasons = ['Лето', 'Зима', 'Демисезон', 'Всесезонное']
const styles = ['Повседневный', 'Деловой', 'Спортивный', 'Нарядный']

export default function EditItemModal({ item, onSave, onClose }: EditItemModalProps) {
  const [category, setCategory] = useState(item.category)
  const [color, setColor] = useState(item.color)
  const [season, setSeason] = useState(item.season)
  const [style, setStyle] = useState(item.style)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(item.photo_url)
  const [loading, setLoading] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPhotoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      let photoUrl = item.photo_url
      if (photoFile) {
        photoUrl = await uploadPhoto(photoFile)
      }
      await onSave(item.id, { category, color, season, style, photo_url: photoUrl })
      onClose()
    } catch (error) {
      console.error('Ошибка редактирования:', error)
      alert('Не удалось сохранить изменения')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-slate-800 rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <h2 className="text-xl font-bold text-slate-100 mb-4">Редактировать вещь</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Фото</label>
              {photoPreview && (
                <div className="mb-3 w-32 h-32">
                  <img src={photoPreview} alt="Превью" className="w-full h-full object-cover rounded border border-slate-700" />
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-100 file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:bg-cyan-600 file:text-white file:cursor-pointer hover:file:bg-cyan-700"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Категория</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-100"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Цвет</label>
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                required
                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Сезон</label>
              <select
                value={season}
                onChange={(e) => setSeason(e.target.value)}
                required
                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-100"
              >
                {seasons.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Стиль</label>
              <select
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                required
                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-100"
              >
                {styles.map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-700 text-white font-medium py-2 px-4 rounded transition"
              >
                {loading ? 'Сохранение...' : 'Сохранить'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition"
              >
                Отмена
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
