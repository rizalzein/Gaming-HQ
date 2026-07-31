/**
 * Service worker offline-first.
 * Naikkan VERSION setiap kali file di PRECACHE berubah agar klien mengambil versi baru.
 */
const VERSION = 'v4';
const CACHE   = `markas-gacha-${VERSION}`;
const VENDOR  = `markas-gacha-vendor`;   // font + supabase-js dari CDN

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
  'js/views/sync.js',
  'js/sync/credentials.js',
  'js/sync/client.js',
  'js/sync/sync.js',
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
        keys.filter(k => k !== CACHE && k !== VENDOR).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Dependensi pihak ketiga (font Google, supabase-js dari esm.sh): cache-first
  // permanen. Semuanya ber-versi di URL-nya, jadi aman disimpan selamanya dan
  // tampilan tetap utuh saat offline.
  if (url.hostname.endsWith('googleapis.com') ||
      url.hostname.endsWith('gstatic.com') ||
      url.hostname === 'esm.sh'){
    event.respondWith(cacheFirst(request, VENDOR));
    return;
  }

  // Permintaan ke Supabase tidak boleh disentuh cache sama sekali.
  if (url.pathname.startsWith('/auth/') || url.pathname.startsWith('/rest/')) return;

  if (url.origin !== self.location.origin) return;

  // Navigasi: coba jaringan dulu, jatuh ke shell yang tersimpan kalau offline.
  if (request.mode === 'navigate'){
    event.respondWith(
      fetch(request).catch(() => caches.match('index.html', { ignoreSearch: true }))
    );
    return;
  }

  // File app sendiri: network-first. Cache hanya jadi jaring pengaman offline.
  // Kalau memakai cache-first, satu file lama bisa tercampur dengan file baru
  // setelah deploy — dan perubahan saat ngoding tidak langsung terlihat.
  event.respondWith(networkFirst(request, CACHE));
});

async function cacheFirst(request, cacheName){
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok || res.type === 'opaque') cache.put(request, res.clone());
  return res;
}

async function networkFirst(request, cacheName){
  const cache = await caches.open(cacheName);
  try {
    // cache:'no-cache' memaksa revalidasi ke server. GitHub Pages mengirim
    // Cache-Control: max-age=600, jadi tanpa ini browser bisa menyajikan modul
    // lama sampai 10 menit setelah deploy — dan mencampurnya dengan modul baru.
    // Revalidasi tetap murah karena server membalas 304 kalau tidak berubah.
    const res = await fetch(request, { cache: 'no-cache' });
    if (res.ok) cache.put(request, res.clone());
    return res;
  } catch (err){
    const hit = await cache.match(request);
    if (hit) return hit;
    throw err;
  }
}
