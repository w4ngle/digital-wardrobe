'use client'

import { CATEGORIES, SEASONS, STYLES } from '@/lib/taxonomy'

type ItemFiltersProps = {
  category: string
  season: string
  style: string
  onCategoryChange: (value: string) => void
  onSeasonChange: (value: string) => void
  onStyleChange: (value: string) => void
  onReset: () => void
}

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
    <section className="mb-7">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[#454139]">Категории</h2>
        {hasFilters && (
          <button
            onClick={onReset}
            className="text-xs font-medium text-[#65786d]"
          >
            Сбросить
          </button>
        )}
      </div>

      <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0">
        {['', ...CATEGORIES].map((cat) => (
          <button
            key={cat || 'all'}
            onClick={() => onCategoryChange(cat)}
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-medium transition ${
              category === cat ? 'bg-[#26372f] text-white' : 'border border-[#ddd7cc] bg-[#faf8f4] text-[#686258]'
            }`}
          >
            {cat || 'Все вещи'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="relative">
          <span className="sr-only">Сезон</span>
          <select
            value={season}
            onChange={(e) => onSeasonChange(e.target.value)}
            className="w-full appearance-none rounded-xl border border-[#ddd7cc] bg-[#faf8f4] px-3 py-2.5 text-xs text-[#5e594f]"
          >
            <option value="">Любой сезон</option>
            {SEASONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <label className="relative">
          <span className="sr-only">Стиль</span>
          <select
            value={style}
            onChange={(e) => onStyleChange(e.target.value)}
            className="w-full appearance-none rounded-xl border border-[#ddd7cc] bg-[#faf8f4] px-3 py-2.5 text-xs text-[#5e594f]"
          >
            <option value="">Любой стиль</option>
            {STYLES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  )
}
