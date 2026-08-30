const CACHE = 'boodschappen-v46';
const ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './apple-touch-icon.png', './js/supabase.js'];

// Nieuwe versie meteen installeren
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(() => {}));
});

// Oude caches opruimen en direct de controle overnemen
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network-first: altijd de nieuwste ophalen, cache als terugval (offline).
// cache:'no-store' negeert de gewone HTTP-cache van de browser zelf, zodat
// een update niet per ongeluk nog een keer uit die tussenlaag komt en het
// dus altijd echt de nieuwste bytes van de server zijn.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith(
    fetch(req, { cache: 'no-store' })
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
  );
});
