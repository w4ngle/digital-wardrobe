import { Item } from '@/lib/supabase'
import FastImage from '@/components/FastImage'

export default function OutfitCollage({ items, onExpand }: { items: Item[], onExpand?: () => void }) {
  const visible = items.slice(0, 4)

  return (
    <div className="grid aspect-square grid-cols-2 gap-px overflow-hidden bg-[#ded8cd]">
      {visible.map((item, index) => (
        <div key={item.id} className="relative overflow-hidden bg-[#ece7de]">
          {item.photo_url ? (
            <FastImage src={item.photo_url} alt={item.description || `${item.color}, ${item.category.toLowerCase()}`} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center px-2 text-center text-xs text-[#8c867b]">{item.category}</div>
          )}
          {index === 3 && items.length > 4 && (onExpand
            ? <button type="button" onClick={(event) => { event.stopPropagation(); onExpand() }} className="absolute inset-0 flex items-center justify-center bg-[#26372f]/65 text-xl font-semibold text-white" aria-label={`Показать ещё ${items.length - 4} вещей`}>+{items.length - 4}</button>
            : <div className="absolute inset-0 flex items-center justify-center bg-[#26372f]/65 text-xl font-semibold text-white">+{items.length - 4}</div>
          )}
        </div>
      ))}
    </div>
  )
}
