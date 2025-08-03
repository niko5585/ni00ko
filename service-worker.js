const CACHE = 'guitar-practice-v1';
const ASSETS = [
  '/', '/index.html', '/style.css', '/app.js',
  'https://cdn.jsdelivr.net/npm/chart.js'
];

self.addEventListener('install', evt => {
  evt.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
});
self.addEventListener('fetch', evt => {
  evt.respondWith(
    caches.match(evt.request)
      .then(res => res || fetch(evt.request))
  );
});
