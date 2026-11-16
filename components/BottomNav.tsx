'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { House, CoatHanger, Sparkle, Stack, Suitcase } from '@phosphor-icons/react'

const links = [
  { href: '/today', label: 'Сегодня', icon: House },
  { href: '/', label: 'Гардероб', icon: CoatHanger },
  { href: '/recommend', label: 'Подбор', icon: Sparkle },
  { href: '/outfits', label: 'Образы', icon: Stack },
  { href: '/packing', label: 'Чемодан', icon: Suitcase },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#dfd4c4] bg-[#fffaf2]/95 px-3 pb-[max(10px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl">
      <div className="mx-auto grid max-w-lg grid-cols-5 gap-1">
        {links.map((link) => {
          const active = pathname === link.href
          const Icon = link.icon
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-center text-[10px] font-semibold transition ${
                active ? 'bg-[#1f422f] text-white' : 'text-[#81786d]'
              }`}
            >
              <Icon size={21} weight={active ? 'fill' : 'regular'} aria-hidden />
              {link.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
