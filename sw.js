const CACHE_NAME = 'zinnour-capillary-pro-v15';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './IMG_8759.png'
];
const OPTIONAL_CDN = [
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(CORE_ASSETS);
      for (const url of OPTIONAL_CDN) {
        try {
          const res = await fetch(url, { mode: 'cors' });
          if (res.ok) await cache.put(url, res);
        } catch (e) {}
      }
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // استثناء خدمات الـ GPS والعداد من الكاش لضمان قراءات حيّة دائماً
  if (
    url.hostname.includes('api.open-meteo.com') ||
    url.hostname.includes('api.counterapi.dev')
  ) {
    return;
  }

  // لملف الصفحة الرئيسية: جلب أحدث نسخة من الشبكة والرجوع للكاش عند انقطاع الإنترنت
  if (event.request.mode === 'navigate' || url.pathname.endsWith('index.html')) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return res;
        })
        .catch(() => caches.match('./index.html') || caches.match('./'))
    );
    return;
  }

  // لباقي الملفات والأيقونات: الكاش أولاً لسرعة الفتح
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((res) => {
        if (res && res.status === 200 && (url.origin === self.location.origin || url.hostname.includes('cdnjs.cloudflare.com'))) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return res;
      });
    })
  );
});
