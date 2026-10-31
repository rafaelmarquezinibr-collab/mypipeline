// Service worker: recebe as notificações push e abre o app no clique.
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {}
  event.waitUntil(
    self.registration.showNotification(data.title || 'Funil', {
      body: data.body || '',
      icon: '/icon.svg',
      badge: '/icon.svg',
      data: { url: data.url || '/' },
      requireInteraction: true,
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) if ('focus' in c) { c.navigate(url); return c.focus() }
      return clients.openWindow(url)
    }),
  )
})
