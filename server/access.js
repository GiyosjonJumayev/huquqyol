import { msg, resolveLang } from "./i18n.js";
// Kirish huquqlari — YAGONA MANBA. Har bir sahifa va /api yo‘li uchun qaysi rollar ocha oladi.
// Server har bir so‘rovda shu jadval bo‘yicha tekshiradi (accessMiddleware); brauzer faqat havolalarni yashiradi (navFor).
// Yangi yo‘l qo‘shilsa — shu yerga yozilishi shart: test barcha Express yo‘llari jadvalda borligini tekshiradi.
//
// Rollar: guest (kirmagan), citizen, lawyer, org, moderator, admin.
// need: "pro" — rol yetarli emas, faol Pro/Firma/Tashkilot obunasi (yoki sinov) ham kerak; bo‘lmasa → /tariflar.
export const ROLES = ["guest", "citizen", "lawyer", "org", "moderator", "admin"];
const ALL = ROLES;
const USERS = ROLES.filter(r => r !== "guest");

// ---------- Sahifalar (GET) ----------
export const PAGES = [
  { path: "/",                 roles: ALL },          // bosh sahifa: vaziyat → reja → ariza (bitta sahifa ichida)
  { path: "/index.html",       roles: ALL },
  { path: "/yuristlar",        roles: ALL },
  { path: "/yuristlar/:id",    roles: ALL },
  { path: "/yuristlar/rasm/:id", roles: ALL },
  { path: "/tariflar",         roles: ALL },
  { path: "/statistika",       roles: ALL },
  { path: "/maxfiylik",        roles: ALL },
  { path: "/oferta",           roles: ALL },          // ommaviy oferta, to‘lov va qaytarish shartlari
  { path: "/parol-unutdim",    roles: ALL },
  { path: "/parol-tiklash",    roles: ALL },          // xatdagi bir martalik havola
  { path: "/tasdiqlash",       roles: ALL },
  { path: "/robots.txt",       roles: ALL },
  { path: "/sitemap.xml",      roles: ALL },
  { path: "/xavfsizlik",       roles: USERS },        // parol, 2FA, qurilmalar, ma’lumotlarim
  { path: "/hisob/tolovlar",   roles: ["citizen", "lawyer", "org"] },
  { path: "/malumotlarim", roles: USERS },
  { path: "/tolov/:id",        roles: ["citizen", "lawyer", "org"] },   // egasi — handler ichida
  { path: "/tolov/:id/hisob-faktura", roles: ["citizen", "lawyer", "org"] },
  { path: "/jamoa",            roles: ["citizen", "lawyer", "org"] },
  { path: "/jamoa/taklif",     roles: ["citizen", "lawyer", "org"] },
  { path: "/kirish",           roles: ALL },          // kirgan foydalanuvchi o‘z bosh sahifasiga yo‘naltiriladi
  { path: "/kirish/havola",    roles: ALL },          // e-pochtadagi parolsiz kirish havolasi (kirish — tugma bosilganda, POST)
  { path: "/royxat",           roles: ALL },
  { path: "/mavzu",            roles: ALL },          // yorug‘/qorong‘i mavzu (JavaScript’siz)
  { path: "/hisob",            roles: ["citizen", "lawyer", "org", "moderator"] },   // hujjatlar, kelishuvlar, obunalar; tashkilot hisobi
  { path: "/yurist-bolish",    roles: ["citizen"] },                                 // «Yurist bo‘lish» arizasi (profil muharriridan alohida)
  { path: "/hisob/ish/:id",    roles: ["citizen", "lawyer", "org"] },               // yuristga yuborilgan ish — faqat ikki ishtirokchi (handler ichida)
  { path: "/hisob/ish/:id/:fmt", roles: ["citizen", "lawyer", "org"] },             // ish arizasi DOCX / PDF
  { path: "/hisob/profil",     roles: ["lawyer"] },
  { path: "/hisob/statistika", roles: ["lawyer"], need: "pro" },
  { path: "/kabinet",          roles: ["lawyer", "org"], need: "pro" },
  // Kompaniya ish joyi: ko‘rish va eksport obunasiz ham (ma’lumot egasiniki), yozish — obuna bilan (API need:"pro")
  { path: "/kompaniya",        roles: ["org"] },
  { path: "/kompaniya/eksport/:kind", roles: ["org"] },                               // CSV (Excel)
  { path: "/kompaniya/kalendar", roles: ["org"] },
  { path: "/admin",            roles: ["admin", "moderator"] }                      // moderator — faqat ADMIN_SECTIONS.moderator
];

// ---------- API ----------
export const API = [
  // Fuqaro oqimi va ochiq ma’lumot — hamma uchun (hisobsiz ham)
  ...["/api/health", "/api/meta", "/api/stats", "/api/stats.csv", "/api/courts", "/api/me"].map(path => ({ method: "GET", path, roles: ALL })),
  ...["/api/analyze", "/api/plan", "/api/document/preview", "/api/document/:format", "/api/custom/:format", "/api/photo",
      "/api/auth/register", "/api/auth/login", "/api/auth/logout", "/api/auth/forgot", "/api/auth/reset", "/api/auth/confirm", "/api/auth/link", "/api/auth/link/use"].map(path => ({ method: "POST", path, roles: ALL })),
  { method: "GET", path: "/api/ready", roles: ALL },
  // Provayder serverlari chaqiradi: imzo / Basic kalit handler ichida tekshiriladi (server/payGateways.js)
  ...["/api/pay/payme", "/api/pay/click/prepare", "/api/pay/click/complete"].map(path => ({ method: "POST", path, roles: ALL })),
  // Hisob talab qilinadi
  ...["/api/auth/verify", "/api/auth/2fa/start", "/api/auth/2fa/enable", "/api/auth/2fa/disable", "/api/auth/sessions/:ref/end", "/api/account/delete"].map(path => ({ method: "POST", path, roles: USERS })),
  { method: "GET",  path: "/api/payments/:id",           roles: ["citizen", "lawyer", "org"] },
  { method: "POST", path: "/api/payments/:id/cancel",    roles: ["citizen", "lawyer", "org"] },
  ...["/api/team/invite", "/api/team/invite/:ref/cancel", "/api/team/accept", "/api/team/members/:id/remove"].map(path => ({ method: "POST", path, roles: ["citizen", "lawyer", "org"] })),
  { method: "GET",  path: "/api/team/cabinet",           roles: ["lawyer", "org"], need: "pro" },
  { method: "POST", path: "/api/team/cabinet",           roles: ["lawyer", "org"], need: "pro" },
  { method: "POST", path: "/api/auth/password",          roles: USERS },
  { method: "POST", path: "/api/subscriptions",          roles: ["citizen", "lawyer", "org"] },
  { method: "POST", path: "/api/consultations",          roles: ["citizen", "lawyer", "org"] },
  { method: "POST", path: "/api/consultations/:id/:act", roles: ["citizen", "lawyer", "org"] },   // egasi — handler ichida tekshiriladi
  { method: "POST", path: "/api/lawyers/apply",          roles: ["citizen"] },
  { method: "POST", path: "/api/lawyer/profile",         roles: ["lawyer"] },
  { method: "POST", path: "/api/lawyer/photo",           roles: ["lawyer"] },
  { method: "POST", path: "/api/lawyer/areas",           roles: ["lawyer"] },
  { method: "GET",  path: "/api/practice",               roles: ["lawyer", "org"], need: "pro" },
  { method: "GET",  path: "/api/cabinet",                roles: ["lawyer", "org"], need: "pro" },
  { method: "POST", path: "/api/cabinet",                roles: ["lawyer", "org"], need: "pro" },
  ...["/api/company/records", "/api/company/records/:id", "/api/company/records/:id/:act", "/api/company/requisites", "/api/company/doc/:fmt"]
      .map(path => ({ method: "POST", path, roles: ["org"], need: "pro" })),                       // egasi / tashkilot — handler ichida
  { method: "POST", path: "/api/admin/:kind/:id/:act",   roles: ["admin", "moderator"] }        // moderator — faqat ADMIN_ACTS.moderator
];

// Admin paneli bo‘limlari va amallari: moderator — faqat yurist arizalari va rasm moderatsiyasi (to‘lov, daromad, rollar yo‘q)
export const ADMIN_SECTIONS = {
  admin: ["umumiy", "murojaat", "daromad", "obuna", "yurist", "rasm", "kelishuv", "baza", "users", "jurnal", "parol"],
  moderator: ["yurist", "rasm"]
};
export const ADMIN_ACTS = {
  admin: ["lawyer", "photo", "payment", "subscription", "user", "practice"],
  moderator: ["lawyer", "photo"]
};

// Har bir rolning «uyi»: kirgandan keyin va 403 sahifasidagi havola
export const HOME = { guest: "/", citizen: "/hisob", lawyer: "/hisob", org: "/kompaniya", moderator: "/admin", admin: "/admin" };

export const roleOf = user => user && ROLES.includes(user.role) && user.role !== "guest" ? user.role : "guest";

// "/api/admin/:kind/:id/:act" → RegExp + parametr nomlari
const compile = p => { const keys = []; const re = new RegExp("^" + p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\?:(\w+)/g, (_, k) => { keys.push(k); return "([^/]+)"; }) + "/?$"); return { re, keys }; };
const RULES = [...PAGES.map(r => ({ ...r, method: "GET" })), ...API].map(r => ({ ...r, ...compile(r.path) }));

export function findRule(method, path){
  const m = method === "HEAD" ? "GET" : method;
  for (const r of RULES){
    if (r.method !== m) continue;
    const x = r.re.exec(path);
    if (x) return { ...r, params: Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(x[i + 1])])) };
  }
  return null;
}

/**
 * Qaror: { ok:true } yoki { status, location? , reason }.
 * ctx: { pro: () => Promise<boolean> | boolean, query } — Pro holati faqat kerak bo‘lganda so‘raladi.
 */
export async function decide(role, rule, ctx = {}){
  if (!rule) return { ok: true };
  const api = rule.path.startsWith("/api/");
  if (!rule.roles.includes(role)){
    if (role === "guest") return api ? { status: 401, reason: "auth" } : { status: 303, location: `/kirish?next=${encodeURIComponent(ctx.url || rule.path)}`, reason: "auth" };
    return { status: 403, reason: "role" };
  }
  // Production: admin va moderator uchun ikki bosqichli kirish majburiy (REQUIRE_ADMIN_2FA=0 — o‘chirish)
  if (ctx.second && ["admin", "moderator"].includes(role) && (rule.path === "/admin" || rule.path.startsWith("/api/admin/")))
    return api ? { status: 403, reason: "2fa" } : { status: 303, location: "/xavfsizlik?majburiy=1", reason: "2fa" };
  if (rule.path === "/admin"){
    const b = ctx.query?.b;
    if (b && !ADMIN_SECTIONS[role].includes(b)) return { status: 403, reason: "section" };
  }
  if (rule.path === "/api/admin/:kind/:id/:act" && !ADMIN_ACTS[role].includes(rule.params?.kind)) return { status: 403, reason: "act" };
  if (rule.need === "pro" && !(await ctx.pro?.())) return api ? { status: 402, reason: "pro" } : { status: 303, location: "/tariflar", reason: "pro" };
  return { ok: true };
}

/** Express middleware: jadval bo‘yicha tekshiradi. forbidden(req, res, reason) — 403 sahifasi (HTML). */
export function accessMiddleware({ proStatus, forbidden }){
  return (req, res, next) => {
    const rule = findRule(req.method, req.path);
    if (!rule) return next();
    const role = roleOf(req.user);
    let pro = null;
    const ctx = { url: req.originalUrl, query: req.query, second: !!req.user && !req.user.totp && process.env.REQUIRE_ADMIN_2FA !== "0" && process.env.NODE_ENV === "production",
      pro: async () => { if (!req.user) return false; pro ??= await proStatus(req.user.id); req.pro = pro; return pro.tools; } };
    decide(role, rule, ctx).then(d => {
      req.role = role;
      if (d.ok) return next();
      const api = rule.path.startsWith("/api/");
      if (api){
        const key = d.reason === "2fa" ? "need2fa" : { 401: "auth", 402: "needPro", 403: "forbidden" }[d.status];
        return res.status(d.status).json({ error: msg(req.lang || resolveLang(req), key), key });   // foydalanuvchiga — tushunarli matn; key — dastur uchun
      }
      if (d.status === 303) return res.redirect(303, d.location);
      return forbidden(req, res, d.reason);
    }).catch(next);
  };
}

// Navbar va hisob menyusi uchun: rol ocha oladigan sahifalar (brauzer faqat yashiradi, tekshiruv serverda)
const NAV_PATHS = ["/", "/yuristlar", "/tariflar", "/kompaniya", "/kabinet", "/hisob", "/hisob/profil", "/yurist-bolish", "/admin"];
const NAV_HIDE = { org: ["/kabinet"] };                // kompaniya uchun asosiy ish joyi — /kompaniya (kabinet manzil orqali ochiq qoladi)
export const navFor = role => NAV_PATHS.filter(p => PAGES.find(x => x.path === p).roles.includes(role) && !NAV_HIDE[role]?.includes(p));
