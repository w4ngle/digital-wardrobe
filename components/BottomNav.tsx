'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { House, CoatHanger, Sparkle, Stack, Suitcase } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'

const links = [
  { href: '/today', label: 'Сегодня', icon: House },
  { href: '/', label: 'Гардероб', icon: CoatHanger },
  { href: '/recommend', label: 'Подбор', icon: Sparkle },
  { href: '/outfits', label: 'Образы', icon: Stack },
  { href: '/packing', label: 'Чемодан', icon: Suitcase },
]

export default function BottomNav() {
  const pathname = usePathname()
  const [role, setRole] = useState<'owner' | 'partner'>('owner')

  useEffect(() => {
    fetch('/api/auth/telegram').then((response) => response.json()).then((session) => setRole(session.role === 'partner' ? 'partner' : 'owner')).catch(() => undefined)
  }, [])

  const visibleLinks = role === 'partner' ? links.filter((link) => ['/recommend', '/outfits'].includes(link.href)) : links

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#dddddd] bg-white/95 px-3 pb-[max(10px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl">
      <div className={`mx-auto grid max-w-lg gap-1 ${role === 'partner' ? 'grid-cols-2' : 'grid-cols-5'}`}>
        {visibleLinks.map((link) => {
          const active = pathname === link.href
          const Icon = link.icon
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center gap-1 px-1 py-2 text-center text-[10px] font-medium transition ${
                active ? 'text-[#1f422f]' : 'text-[#717171]'
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
