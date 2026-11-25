// Ikki bosqichli kirish (TOTP, RFC 6238: SHA-1, 30 soniya, 6 raqam) — Google Authenticator, Microsoft Authenticator, Aegis va h.k.
import { createHmac, randomBytes, timingSafeEqual, createHash, createCipheriv, createDecipheriv } from "node:crypto";

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
export const newSecret = () => [...randomBytes(20)].map(b => b.toString(2).padStart(8, "0")).join("").match(/.{5}/g).map(x => B32[parseInt(x, 2)]).join("");
const unb32 = s => Buffer.from([...s].map(c => B32.indexOf(c).toString(2).padStart(5, "0")).join("").match(/.{8}/g).map(x => parseInt(x, 2)));
export function codeAt(secret, step){
  const msg = Buffer.alloc(8); msg.writeBigUInt64BE(BigInt(step));
  const h = createHmac("sha1", unb32(secret)).update(msg).digest(), o = h[19] & 15;
  return String((h.readUInt32BE(o) & 0x7fffffff) % 1e6).padStart(6, "0");
}
export const stepNow = (now = Date.now()) => Math.floor(now / 30000);
/** To‘g‘ri bo‘lsa — qadam raqami (takror ishlatishni to‘sish uchun), aks holda null. Soat farqi uchun ±1 qadam. */
export function checkCode(secret, code, last = 0, now = Date.now()){
  const c = String(code || "").replace(/\s/g, "");
  if (!/^\d{6}$/.test(c)) return null;
  let hit = null;
  for (const d of [-1, 0, 1]){ const s = stepNow(now) + d; if (timingSafeEqual(Buffer.from(codeAt(secret, s)), Buffer.from(c)) && s > Number(last || 0)) hit = s; }
  return hit;
}
export const otpauth = (secret, email) => `otpauth://totp/${encodeURIComponent("HuquqYo‘l")}:${encodeURIComponent(email)}?secret=${secret}&issuer=${encodeURIComponent("HuquqYo‘l")}`;
// Zaxira kodlar: bazada faqat xeshi, har biri bir marta
export const newRecovery = () => Array.from({ length: 8 }, () => randomBytes(5).toString("hex").replace(/(.{5})/, "$1-"));
export const hashRecovery = c => createHash("sha256").update(String(c).toLowerCase().replace(/[^0-9a-f]/g, "")).digest("hex");

// Bazadagi maxfiy kalit APP_SECRET bilan shifrlanadi (baza nusxasi sizsa ham kod yasab bo‘lmaydi)
const key = () => { const s = (process.env.APP_SECRET || "").trim(); return s.length >= 32 ? createHash("sha256").update("totp:" + s).digest() : null; };
export function seal(secret){
  const k = key(); if (!k) return "p:" + secret;
  const iv = randomBytes(12), c = createCipheriv("aes-256-gcm", k, iv), d = Buffer.concat([c.update(secret, "utf8"), c.final()]);
  return "g:" + Buffer.concat([iv, c.getAuthTag(), d]).toString("base64url");
}
export function unseal(v){
  if (!v) return null;
  if (v.startsWith("p:")) return v.slice(2);
  const k = key(); if (!k) return null;
  try { const b = Buffer.from(v.slice(2), "base64url"), d = createDecipheriv("aes-256-gcm", k, b.subarray(0, 12)); d.setAuthTag(b.subarray(12, 28)); return Buffer.concat([d.update(b.subarray(28)), d.final()]).toString("utf8"); }
  catch { return null; }
}
