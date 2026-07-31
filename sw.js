/**
 * Service worker offline-first.
 * Naikkan VERSION setiap kali file di PRECACHE berubah agar klien mengambil versi baru.
 */
const VERSION = 'v1';
const CACHE   = `markas-gacha-${VERSION}`;
const FONTS   = `markas-gacha-fonts`;

const PRECACHE = [
  './',
  'index.html',
  'manifest.webmanifest',
  'assets/icon.svg',
  'css/tokens.css',
  'css/base.css',
  'css/components.css',
  'js/main.js',
  'js/config.js',
  'js/state.js',
  'js/domain.js',
  'js/util/dom.js',
  'js/util/date.js',
  'js/util/format.js',
  'js/ui/toast.js',
  'js/ui/modal.js',
  'js/views/header.js',
  'js/views/roster.js',
  'js/views/tasks.js',
  'js/views/events.js',
  'js/views/budget.js',
  'js/views/patches.js',
  'js/views/story.js',
  'js/views/pity.js',
  'js/views/settings.js',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE && k !== FONTS).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Font Google: cache-first permanen, supaya tampilan tetap utuh saat offline.
  if (url.hostname.endsWith('googleapis.com') || url.hostname.endsWith('gstatic.com')){
    event.respondWith(cacheFirst(request, FONTS));
    return;
  }

  if (url.origin !== self.location.origin) return;

  // Navigasi: coba jaringan dulu, jatuh ke shell yang tersimpan kalau offline.
  if (request.mode === 'navigate'){
    event.respondWith(
      fetch(request).catch(() => caches.match('index.html', { ignoreSearch: true }))
    );
    return;
  }

  event.respondWith(staleWhileRevalidate(request, CACHE));
});

async function cacheFirst(request, cacheName){
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok || res.type === 'opaque') cache.put(request, res.clone());
  return res;
}

async function staleWhileRevalidate(request, cacheName){
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  const network = fetch(request)
    .then(res => {
      if (res.ok) cache.put(request, res.clone());
      return res;
    })
    .catch(() => hit);
  return hit || network;
}
