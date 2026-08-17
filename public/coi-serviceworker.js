const COI_HEADERS = {
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Opener-Policy': 'same-origin',
}

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', event => {
  const { request } = event
  if (new URL(request.url).origin !== self.location.origin) return
  if (request.cache === 'only-if-cached' && request.mode !== 'same-origin') return

  event.respondWith(fetch(request).then(response => {
    if (response.status === 0) return response
    const headers = new Headers(response.headers)
    Object.entries(COI_HEADERS).forEach(([name, value]) => headers.set(name, value))
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    })
  }))
})
