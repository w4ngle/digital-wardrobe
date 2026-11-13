'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/', label: 'Гардероб' },
  { href: '/recommend', label: 'Подбор' },
  { href: '/outfits', label: 'Образы' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#ded8cd] bg-[#faf8f4]/95 px-3 pb-[max(10px,env(safe-area-inset-bottom))] pt-2 backdrop-blur">
      <div className="mx-auto grid max-w-lg grid-cols-3 gap-2">
        {links.map((link) => {
          const active = pathname === link.href
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-xl px-2 py-2.5 text-center text-sm font-medium transition ${
                active ? 'bg-[#26372f] text-white' : 'text-[#817b70]'
              }`}
            >
              {link.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
