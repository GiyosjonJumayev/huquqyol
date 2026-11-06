// HuquqYo‘l service worker: interfeys oflayn ochiladi; API javoblari hech qachon keshlanmaydi.
const VERSION = "hy-3.3.0";
const SHELL = ["/", "/manifest.webmanifest", "/icons/icon.svg"];   // versiyali CSS/JS birinchi ochilishda keshga tushadi

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  // API: faqat o‘zgarmas /api/meta oflayn uchun saqlanadi; qolgan API hech qachon keshlanmaydi
  if (url.pathname.startsWith("/api/") && url.pathname !== "/api/meta") return;
  if (url.pathname.startsWith("/fonts/") || url.pathname.startsWith("/icons/")){
    // Shriftlar o‘zgarmaydi: avval kesh
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => { const copy = res.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); return res; })));
    return;
  }
  // Qolganlari: avval tarmoq (yangi versiya), bo‘lmasa kesh
  e.respondWith(fetch(e.request).then(res => {
    if (res.ok){ const copy = res.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); }
    return res;
  }).catch(() => caches.match(e.request).then(r => r || caches.match("/"))));
});
