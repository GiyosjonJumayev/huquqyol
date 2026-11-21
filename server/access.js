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
  { path: "/kirish",           roles: ALL },          // kirgan foydalanuvchi o‘z bosh sahifasiga yo‘naltiriladi
  { path: "/royxat",           roles: ALL },
  { path: "/mavzu",            roles: ALL },          // yorug‘/qorong‘i mavzu (JavaScript’siz)
  { path: "/hisob",            roles: ["citizen", "lawyer", "org", "moderator"] },   // hujjatlar, kelishuvlar, obunalar; tashkilot hisobi
  { path: "/yurist-bolish",    roles: ["citizen"] },                                 // «Yurist bo‘lish» arizasi (profil muharriridan alohida)
  { path: "/hisob/profil",     roles: ["lawyer"] },
  { path: "/hisob/statistika", roles: ["lawyer"], need: "pro" },
  { path: "/kabinet",          roles: ["lawyer", "org"], need: "pro" },
  { path: "/admin",            roles: ["admin", "moderator"] }                      // moderator — faqat ADMIN_SECTIONS.moderator
];

// ---------- API ----------
export const API = [
  // Fuqaro oqimi va ochiq ma’lumot — hamma uchun (hisobsiz ham)
  ...["/api/health", "/api/meta", "/api/stats", "/api/courts", "/api/me"].map(path => ({ method: "GET", path, roles: ALL })),
  ...["/api/analyze", "/api/plan", "/api/document/preview", "/api/document/:format", "/api/custom/:format", "/api/photo",
      "/api/auth/register", "/api/auth/login", "/api/auth/logout"].map(path => ({ method: "POST", path, roles: ALL })),
  // Hisob talab qilinadi
  { method: "POST", path: "/api/auth/password",          roles: USERS },
  { method: "POST", path: "/api/subscriptions",          roles: ["citizen", "lawyer", "org"] },
  { method: "POST", path: "/api/consultations",          roles: ["citizen", "lawyer", "org"] },
  { method: "POST", path: "/api/consultations/:id/:act", roles: ["citizen", "lawyer", "org"] },   // egasi — handler ichida tekshiriladi
  { method: "POST", path: "/api/lawyers/apply",          roles: ["citizen"] },
  { method: "POST", path: "/api/lawyer/profile",         roles: ["lawyer"] },
  { method: "POST", path: "/api/lawyer/photo",           roles: ["lawyer"] },
  { method: "GET",  path: "/api/cabinet",                roles: ["lawyer", "org"], need: "pro" },
  { method: "POST", path: "/api/cabinet",                roles: ["lawyer", "org"], need: "pro" },
  { method: "POST", path: "/api/admin/:kind/:id/:act",   roles: ["admin", "moderator"] }        // moderator — faqat ADMIN_ACTS.moderator
];

// Admin paneli bo‘limlari va amallari: moderator — faqat yurist arizalari va rasm moderatsiyasi (to‘lov, daromad, rollar yo‘q)
export const ADMIN_SECTIONS = {
  admin: ["umumiy", "murojaat", "daromad", "obuna", "yurist", "rasm", "kelishuv", "users", "parol"],
  moderator: ["yurist", "rasm"]
};
export const ADMIN_ACTS = {
  admin: ["lawyer", "photo", "payment", "subscription", "user"],
  moderator: ["lawyer", "photo"]
};

// Har bir rolning «uyi»: kirgandan keyin va 403 sahifasidagi havola
export const HOME = { guest: "/", citizen: "/hisob", lawyer: "/hisob", org: "/hisob", moderator: "/admin", admin: "/admin" };

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
    const ctx = { url: req.originalUrl, query: req.query,
      pro: async () => { if (!req.user) return false; pro ??= await proStatus(req.user.id); req.pro = pro; return pro.tools; } };
    decide(role, rule, ctx).then(d => {
      req.role = role;
      if (d.ok) return next();
      const api = rule.path.startsWith("/api/");
      if (api){
        const key = { 401: "auth", 402: "needPro", 403: "forbidden" }[d.status];
        return res.status(d.status).json({ error: key, key });
      }
      if (d.status === 303) return res.redirect(303, d.location);
      return forbidden(req, res, d.reason);
    }).catch(next);
  };
}

// Navbar va hisob menyusi uchun: rol ocha oladigan sahifalar (brauzer faqat yashiradi, tekshiruv serverda)
const NAV_PATHS = ["/", "/yuristlar", "/tariflar", "/kabinet", "/hisob", "/hisob/profil", "/yurist-bolish", "/admin"];
export const navFor = role => NAV_PATHS.filter(p => PAGES.find(x => x.path === p).roles.includes(role));
