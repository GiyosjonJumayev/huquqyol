// HuquqYo‘l service worker: interfeys oflayn ochiladi; API javoblari hech qachon keshlanmaydi.
const VERSION = "hy-__BUILD__";   // server har relizda resurslar xeshi bilan almashtiradi
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
  // Shaxsiy sahifalar (hisob, kabinet, admin, to‘lov…) va bir martalik havolalar: kesh yo‘q — umumiy kompyuterda chiqqandan keyin ko‘rinmaydi
  if (/^\/(hisob|malumotlarim|kabinet|admin|tolov|jamoa|xavfsizlik|parol|tasdiqlash|kirish|royxat|yurist-bolish)/.test(url.pathname)) return;
  // Qolganlari: avval tarmoq (yangi versiya), bo‘lmasa kesh. Server «no-store / private» degan javob saqlanmaydi.
  e.respondWith(fetch(e.request).then(res => {
    if (res.ok && !/no-store|private/.test(res.headers.get("Cache-Control") || "")){ const copy = res.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); }
    return res;
  }).catch(() => caches.match(e.request).then(r => r || caches.match("/"))));
});
