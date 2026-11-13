'use client'

import Script from 'next/script'

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void
        expand: () => void
        setHeaderColor: (color: string) => void
        setBackgroundColor: (color: string) => void
      }
    }
  }
}

export default function TelegramApp() {
  const initialize = () => {
    const app = window.Telegram?.WebApp
    if (!app) return

    app.ready()
    app.expand()
    app.setHeaderColor('#0F1115')
    app.setBackgroundColor('#0F1115')
  }

  return (
    <Script
      src="https://telegram.org/js/telegram-web-app.js?65"
      strategy="afterInteractive"
      onReady={initialize}
    />
  )
}
