// Labianca Desk — service worker (v2)
// Deliberately conservative: never serve stale app code. Only provide an
// offline fallback for navigations and cache a few static brand assets.
const CACHE = 'labianca-desk-v2'
const ASSETS = ['/manifest.webmanifest', '/icon-192.png', '/icon-512.png', '/labianca-logo.jpg', '/apple-touch-icon.png']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).catch(() => {}))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // App code and data: ALWAYS go to the network. Never serve a cached JS/RSC
  // chunk, which would risk a stale-bundle client exception after a deploy.
  if (
    url.pathname.startsWith('/_next/') ||
    url.pathname.startsWith('/api/')
  ) return

  // Navigations: network-first, fall back to a cached shell only when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/offline').then((r) => r || caches.match(request)))
    )
    return
  }

  // Brand/static images: cache-first (safe, content-addressed or stable).
  if (ASSETS.includes(url.pathname) || url.pathname.endsWith('.png') || url.pathname.endsWith('.jpg') || url.pathname.endsWith('.webmanifest')) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((res) => {
        const copy = res.clone()
        caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {})
        return res
      }).catch(() => cached))
    )
  }
})
