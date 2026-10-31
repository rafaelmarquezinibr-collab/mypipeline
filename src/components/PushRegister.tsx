'use client'

import { useEffect } from 'react'

/** Registra o service worker. A permissão de notificação é pedida em Ajustes. */
export function PushRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {})
  }, [])
  return null
}
