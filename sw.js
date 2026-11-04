// Service worker: l'app si apre anche senza rete. Cambia VERSION a ogni aggiornamento dei file.
const VERSION = 'baggats-v2';
const FILES = [
  './', 'index.html', 'manifest.webmanifest', 'css/app.css',
  'js/app.js', 'js/coach.js', 'js/views.js', 'js/workout.js', 'js/store.js', 'js/logic.js', 'js/charts.js', 'js/pics.js', 'js/ui.js', 'js/util.js', 'js/config.js', 'js/program-data.js',
  'vendor/supabase.js', 'fonts/oswald-latin-600-normal.woff2', 'fonts/oswald-latin-700-normal.woff2',
  'fonts/inter-latin-400-normal.woff2', 'fonts/inter-latin-600-normal.woff2', 'fonts/inter-latin-800-normal.woff2',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png', 'icons/bull.svg', 'icons/bull-mini.svg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// Prima la rete (così gli aggiornamenti arrivano subito), poi la copia salvata se offline.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // Supabase e YouTube passano diretti
  e.respondWith(
    fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('index.html'))),
  );
});
