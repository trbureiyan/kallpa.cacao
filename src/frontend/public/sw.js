// Service worker mínimo: guarda solo el "shell" de la app (HTML y assets con hash) para poder abrirla
// con conectividad limitada. NO intercepta /api ni /publico ni peticiones a otros orígenes (el backend
// corre en otro puerto en desarrollo): los datos siempre vienen del servidor o de la cola local (Dexie).
const CACHE = 'kallpa-shell-v1'

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.add('/index.html')).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  const url = new URL(req.url)
  if (req.method !== 'GET' || url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/publico')) return

  // Navegación (rutas de la SPA): red primero; sin red, el shell guardado.
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match('/index.html')))
    return
  }

  // Assets con hash en el nombre: caché primero; si no están, se piden y se guardan.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            const copia = res.clone()
            void caches.open(CACHE).then((c) => c.put(req, copia))
            return res
          }),
      ),
    )
  }
})
