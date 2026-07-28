// Bounce Daily Hub Audit — service worker
// Strategy: network-first for the app shell (hub-audit.html), so a fresh
// deploy is always picked up when the device is online — this app is
// updated often and already sends no-store headers for that exact reason.
// The cache is ONLY used as a fallback when there's no network at all,
// so the app can still open (even if showing the last-seen version) rather
// than failing outright. Static assets (icons, manifest) are cached
// normally since they rarely change.

const CACHE_VERSION = 'hub-audit-v1';
const SHELL_URLS = [
  './hub-audit.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(SHELL_URLS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return; // never intercept POST/PATCH/DELETE (audit saves, auth, etc.)

  const url = new URL(req.url);

  // Never touch Supabase API or Metabase calls — always go straight to network,
  // audit/config data must never be served stale from cache.
  if (url.hostname.includes('supabase.co') || url.hostname.includes('metabaselatest')) {
    return;
  }

  // App shell (this HTML page, manifest, icons): try network first so
  // updates land immediately; fall back to cache only if offline.
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req).then((cached) => cached || caches.match('./hub-audit.html')))
  );
});
