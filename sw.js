/* Service Worker: 离线可用，网络优先 + 缓存回退 */
const VERSION = 'kb-v1';
const PRECACHE = [
  './',
  './index.html',
  './config.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // 只处理同源 + 允许在清单中的外部 CDN（tailwind/chart/supabase）做缓存回退
  const isSameOrigin = url.origin === self.location.origin;
  const allowedExt = /\.(js|css|png|svg|json|woff2?|html)?$/.test(url.pathname);

  if (!isSameOrigin && !/cdn\.(jsdelivr\.net|tailwindcss\.com|supabase\.co)/.test(url.host)) {
    return; // 其它第三方请求不拦截
  }
  if (url.protocol === 'http:' && url.hostname !== 'localhost') {
    // 允许 http 本地；线上应 https，忽略
  }

  e.respondWith(
    (async () => {
      const cache = await caches.open(VERSION);
      try {
        const fresh = await fetch(req);
        if (fresh && fresh.ok && (isSameOrigin || fresh.ok)) {
          await cache.put(req, fresh.clone());
        }
        return fresh;
      } catch (err) {
        const cached = await cache.match(req);
        if (cached) return cached;
        // 导航请求离线兜底回首页/引导 HTML
        if (isSameOrigin && req.mode === 'navigate') {
          return (await cache.match('./')) || (await cache.match('./index.html'));
        }
        return new Response('', { status: 408, statusText: 'offline' });
      }
    })()
  );
});
