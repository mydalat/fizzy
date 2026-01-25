self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  if (event.request.destination === 'document') {
    event.respondWith(
      fetch(event.request, { cache: 'no-cache' })
        .catch(() => caches.match(event.request))
    )
  }
})

self.addEventListener("push", (event) => {
  const data = event.data.json()
  event.waitUntil(Promise.all([ showNotification(data), updateBadgeCount(data.options) ]))
})

async function showNotification({ title, options }) {
  const notificationOptions = {
    ...options,
    requireInteraction: false,
    silent: false
  }
  return self.registration.showNotification(title, notificationOptions)
}

async function updateBadgeCount({ data }) {
  if (data?.badge !== undefined) {
    return self.navigator.setAppBadge?.(data.badge || 0)
  }
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close()

  const url = new URL(event.notification.data.path, self.location.origin).href
  event.waitUntil(openURL(url))
})

async function openURL(url) {
  const clients = await self.clients.matchAll({ type: "window" })
  const focused = clients.find((client) => client.focused)

  if (focused) {
    await focused.navigate(url)
  } else {
    await self.clients.openWindow(url)
  }
}
