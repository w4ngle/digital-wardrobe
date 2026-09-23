'use client'

type ItemFiltersProps = {
  category: string
  season: string
  style: string
  onCategoryChange: (value: string) => void
  onSeasonChange: (value: string) => void
  onStyleChange: (value: string) => void
  onReset: () => void
}

const categories = ['Верх', 'Низ', 'Обувь', 'Верхняя одежда', 'Аксессуар']
const seasons = ['Лето', 'Зима', 'Демисезон', 'Всесезонное']
const styles = ['Повседневный', 'Деловой', 'Спортивный', 'Нарядный']

export default function ItemFilters({
  category,
  season,
  style,
  onCategoryChange,
  onSeasonChange,
  onStyleChange,
  onReset
}: ItemFiltersProps) {
  const hasFilters = category || season || style

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-slate-300">Фильтры</h3>
        {hasFilters && (
          <button
            onClick={onReset}
            className="text-xs text-cyan-400 hover:text-cyan-300"
          >
            Сбросить
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Категория</label>
          <select
            value={category}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100"
          >
            <option value="">Все</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">Сезон</label>
          <select
            value={season}
            onChange={(e) => onSeasonChange(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100"
          >
            <option value="">Все</option>
            {seasons.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">Стиль</label>
          <select
            value={style}
            onChange={(e) => onStyleChange(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100"
          >
            <option value="">Все</option>
            {styles.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
