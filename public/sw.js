/*
 * Service worker for the installed app.
 *
 * The app is online only (PRD): attendance is never cached or queued here.
 * This worker does exactly two things:
 *   1. makes the app installable as a PWA, and
 *   2. shows a clear offline screen instead of the browser's error page when a
 *      page is opened without a connection.
 * Static build files (/_next/static) are content-hashed, so caching them is
 * safe and makes the app open faster on slow connections.
 */
const VERSION = "v1"
const OFFLINE_URL = "/offline.html"
const STATIC_CACHE = `static-${VERSION}`
const SHELL_CACHE = `shell-${VERSION}`

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll([OFFLINE_URL, "/pwa-icon/192"]))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => ![STATIC_CACHE, SHELL_CACHE].includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener("fetch", (event) => {
  const { request } = event
  if (request.method !== "GET") return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // Pages: always the network; the offline screen only when there is none.
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)))
    return
  }

  // Immutable build assets: cache first.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const hit = await cache.match(request)
        if (hit) return hit
        const res = await fetch(request)
        if (res.ok) cache.put(request, res.clone())
        return res
      })
    )
  }
  // Everything else (data, API, exports) goes straight to the network.
})
