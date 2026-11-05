import { msg, resolveLang } from "./i18n.js";
// Xavfsizlik qatlami: HTTP headerlar, so‘rov turi, rate limit.
const PROD = process.env.NODE_ENV === "production";

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
  "frame-ancestors 'none'",
  ...(PROD ? ["upgrade-insecure-requests"] : [])
].join("; ");

export function securityHeaders(req, res, next){
  res.set({
    "Content-Security-Policy": CSP,
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-origin",
    ...(PROD ? { "Strict-Transport-Security": "max-age=31536000; includeSubDomains" } : {})
  });
  if (req.path.startsWith("/api/")) res.set("Cache-Control", "no-store");
  next();
}

// POST so‘rovlar faqat JSON bo‘lishi kerak (CSRF va noto‘g‘ri formatdan himoya)
export function requireJson(req, res, next){
  if (req.method === "POST" && !req.is("application/json")) return res.status(415).json({ error: msg(resolveLang(req), "json415") });
  next();
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
