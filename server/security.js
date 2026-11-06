import { msg, resolveLang } from "./i18n.js";
// Xavfsizlik qatlami: HTTP headerlar, so‘rov turi, rate limit.
// HTTPS ga bog‘liq headerlar (HSTS, upgrade-insecure-requests) faqat so‘rov haqiqatan HTTPS orqali kelganda qo‘yiladi:
// shunda SSL hali ulanmagan hostingda sayt buzilmaydi. Proxy ortida TRUST_PROXY=1 kerak (X-Forwarded-Proto).
const FORCE_HTTPS = /^(1|true)$/i.test(process.env.FORCE_HTTPS || "");

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "style-src-attr 'unsafe-inline'",     // faqat dinamik kenglik (progress bar) uchun
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'"
].join("; ");
const CSP_HTTPS = CSP + "; upgrade-insecure-requests";

// FORCE_HTTPS=1 — http so‘rovlarni https ga yo‘naltirish (health check bundan mustasno)
export function httpsRedirect(req, res, next){
  if (!FORCE_HTTPS || req.secure || req.path === "/api/health") return next();
  if (req.method !== "GET" && req.method !== "HEAD") return res.status(403).json({ error:"HTTPS required" });
  res.redirect(308, `https://${req.headers.host}${req.originalUrl}`);
}

export function securityHeaders(req, res, next){
  res.set({
    "Content-Security-Policy": req.secure ? CSP_HTTPS : CSP,
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": "camera=(), microphone=(self), geolocation=(), payment=(), usb=()",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-origin",
    ...(req.secure ? { "Strict-Transport-Security": "max-age=31536000; includeSubDomains" } : {})
  });
  if (req.path.startsWith("/api/")) res.set("Cache-Control", "no-store");
  next();
}

// POST so‘rovlar faqat JSON bo‘lishi kerak (CSRF va noto‘g‘ri formatdan himoya)
export function requireJson(req, res, next){
  if (req.method === "POST" && !req.is("application/json")) return res.status(415).json({ error: msg(resolveLang(req), "json415") });
  next();
}

// Boshqa saytdan kelgan POST so‘rovlarni rad etish: brauzer Origin sarlavhasini qo‘yadi, u xostga mos bo‘lishi kerak.
// Origin bo‘lmasa (curl, server-server) — ruxsat; brauzer esa POSTda uni har doim yuboradi.
export function sameOrigin(req, res, next){
  const origin = req.headers.origin;
  if (req.method !== "POST" || !origin) return next();
  let host = null;
  try { host = new URL(origin).host; } catch {}
  const own = [req.headers.host, req.app.get("trust proxy") ? req.headers["x-forwarded-host"] : null].filter(Boolean);
  if (host && own.includes(host)) return next();
  return res.status(403).json({ error: msg(resolveLang(req), "origin") });
}

// Xotirada ishlaydigan sliding-window rate limit; eskirgan yozuvlar tozalanadi
export function rateLimit({ windowMs = 60_000, max = 20, name = "api" } = {}){
  const hits = new Map();
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [k, arr] of hits){ const f = arr.filter(t => now - t < windowMs); f.length ? hits.set(k, f) : hits.delete(k); }
  }, windowMs);
  timer.unref();
  return (req, res, next) => {
    const key = `${name}:${req.ip}`, now = Date.now();
    const arr = (hits.get(key) || []).filter(t => now - t < windowMs);
    if (arr.length >= max){
      res.set("Retry-After", String(Math.ceil(windowMs / 1000)));
      return res.status(429).json({ error: msg(resolveLang(req), "rate") });
    }
    arr.push(now); hits.set(key, arr);
    if (hits.size > 50_000) hits.delete(hits.keys().next().value);   // xotira cheklovi
    next();
  };
}
