'use client'

import { ReactNode, useEffect, useState } from 'react'
import Script from 'next/script'
import { usePathname, useRouter } from 'next/navigation'

declare global {
  type TelegramLocation = {
    latitude: number
    longitude: number
  }

  type TelegramLocationManager = {
    isInited: boolean
    isLocationAvailable: boolean
    isAccessRequested: boolean
    isAccessGranted: boolean
    init: (callback?: () => void) => TelegramLocationManager
    getLocation: (callback: (location: TelegramLocation | null) => void) => TelegramLocationManager
    openSettings: () => TelegramLocationManager
  }

  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void
        expand: () => void
        initData: string
        LocationManager?: TelegramLocationManager
        setHeaderColor: (color: string) => void
        setBackgroundColor: (color: string) => void
      }
    }
  }
}

export default function TelegramApp({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'authorized' | 'denied'>('loading')
  const [role, setRole] = useState<'owner' | 'partner' | null>(null)
  const pathname = usePathname()
  const router = useRouter()

  const authenticate = async (initData: string) => {
    const response = await fetch('/api/auth/telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData }),
    })
    const session = response.ok ? await response.json() as { role?: 'owner' | 'partner' } : null
    setRole(session?.role || null)
    setStatus(response.ok ? 'authorized' : 'denied')
  }

  const initialize = () => {
    const app = window.Telegram?.WebApp
    if (!app) return

    app.ready()
    app.expand()
    app.setHeaderColor('#0F1115')
    app.setBackgroundColor('#0F1115')
    if (app.initData) authenticate(app.initData)
  }

  useEffect(() => {
    fetch('/api/auth/telegram')
      .then(async (response) => {
        const session = response.ok ? await response.json() as { role?: 'owner' | 'partner' } : null
        setRole(session?.role || null)
        setStatus((current) => current === 'authorized' ? current : response.ok ? 'authorized' : 'denied')
      })
      .catch(() => setStatus('denied'))
  }, [])

  useEffect(() => {
    if (role === 'partner' && ['/', '/today', '/packing'].includes(pathname)) router.replace('/outfits')
  }, [pathname, role, router])

  return (
    <>
      <Script
        src="https://telegram.org/js/telegram-web-app.js?65"
        strategy="afterInteractive"
        onReady={initialize}
      />
      {status === 'loading' && (
        <main className="flex min-h-screen items-center justify-center text-muted">Открываю гардероб…</main>
      )}
      {status === 'authorized' && children}
      {status === 'denied' && (
        <main className="flex min-h-screen items-center justify-center px-8 text-center">
          <div>
            <h1 className="text-2xl font-bold">Откройте приложение в Telegram</h1>
            <p className="mt-3 text-muted">Доступ разрешён только владельцу гардероба через меню бота.</p>
          </div>
        </main>
      )}
    </>
  )
}
