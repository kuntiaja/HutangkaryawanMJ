/* Service worker: aplikasi tetap bisa dibuka tanpa sinyal (data terakhir tampil dari cache aplikasi) */
const VERSION = 'kasbon-v7';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VERSION)
      .then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Jaringan dulu (supaya selalu dapat versi terbaru); jika lambat >3 detik atau offline, pakai cache */
function networkFirst(req) {
  return new Promise(resolve => {
    let done = false;
    const timer = setTimeout(() => {
      caches.match(req, { ignoreSearch: true }).then(r => {
        if (r && !done) { done = true; resolve(r); }
      });
    }, 3000);

    fetch(req, { cache: 'no-cache' }).then(res => {
      clearTimeout(timer);
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(VERSION).then(c => c.put(req, copy));
      }
      if (!done) { done = true; resolve(res); }
    }).catch(() => {
      clearTimeout(timer);
      caches.match(req, { ignoreSearch: true }).then(r => {
        if (!done) { done = true; resolve(r || Response.error()); }
      });
    });
  });
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;                       // POST ke server tidak dicegat
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;        // Google Script / font tidak dicegat
  e.respondWith(networkFirst(req));
});
