// Kutilgan kirish natijalari: har bir rol × har bir himoyalangan yo‘l. server/access.js dan MUSTAQIL yozilgan —
// jadval o‘zgarsa, test buni ushlaydi. «ok» (API) — 401/402/403 emas (so‘rov tanasi xato bo‘lsa 400/404 ham bo‘lishi mumkin).
// Rollar: lawyer/org — Pro (yoki sinov) faol; lawyerNoPro/orgNoPro — obuna yo‘q.
export const ACTORS = ["guest", "citizen", "lawyer", "lawyerNoPro", "org", "orgNoPro", "moderator", "admin"];
export const roleOfActor = a => a.replace("NoPro", "");
export const proOfActor = a => a === "lawyer" || a === "org";

const row = (def, over = {}) => Object.fromEntries(ACTORS.map(a => [a, a in over ? over[a] : def]));

export const PAGES = {
  "/hisob":              row(200, { guest: 303, admin: 403 }),
  "/yurist-bolish":      row(403, { guest: 303, citizen: 200 }),
  "/hisob/profil":       row(403, { guest: 303, lawyer: 200, lawyerNoPro: 200 }),
  "/hisob/statistika":   row(403, { guest: 303, lawyer: 200, lawyerNoPro: 303 }),               // Pro yo‘q → /tariflar
  "/kabinet":            row(403, { guest: 303, lawyer: 200, lawyerNoPro: 303, org: 200, orgNoPro: 303 }),
  "/admin":              row(403, { guest: 303, moderator: 200, admin: 200 }),
  "/admin?b=yurist":     row(403, { guest: 303, moderator: 200, admin: 200 }),
  "/admin?b=rasm":       row(403, { guest: 303, moderator: 200, admin: 200 }),
  "/admin?b=daromad":    row(403, { guest: 303, admin: 200 }),                                  // moderator: to‘lov va daromad yo‘q
  "/admin?b=users":      row(403, { guest: 303, admin: 200 }),                                  // moderator: rollar yo‘q
  "/admin?b=baza":       row(403, { guest: 303, admin: 200 }),
  "/admin?b=umumiy":     row(403, { guest: 303, admin: 200 }),
  // Ochiq sahifalar
  "/":                   row(200), "/yuristlar": row(200), "/yuristlar/namuna-1": row(200), "/tariflar": row(200),
  "/statistika":         row(200), "/maxfiylik": row(200)
};

export const API = {
  "POST /api/auth/password":          row("ok", { guest: 401 }),
  "POST /api/subscriptions":          row("ok", { guest: 401, moderator: 403, admin: 403 }),
  "POST /api/consultations":          row("ok", { guest: 401, moderator: 403, admin: 403 }),
  "POST /api/consultations/999999/cancel": row("ok", { guest: 401, moderator: 403, admin: 403 }),
  "POST /api/lawyers/apply":          row(403, { guest: 401, citizen: "ok" }),
  "POST /api/lawyer/profile":         row(403, { guest: 401, lawyer: "ok", lawyerNoPro: "ok" }),
  "POST /api/lawyer/photo":           row(403, { guest: 401, lawyer: "ok", lawyerNoPro: "ok" }),
  "POST /api/lawyer/areas":          row(403, { guest: 401, lawyer: "ok", lawyerNoPro: "ok" }),
  "GET /api/practice":               row(403, { guest: 401, lawyer: "ok", lawyerNoPro: 402, org: "ok", orgNoPro: 402 }),
  "GET /api/cabinet":                 row(403, { guest: 401, lawyer: "ok", lawyerNoPro: 402, org: "ok", orgNoPro: 402 }),
  "POST /api/cabinet":                row(403, { guest: 401, lawyer: "ok", lawyerNoPro: 402, org: "ok", orgNoPro: 402 }),
  "POST /api/admin/lawyer/999999/approve":  row(403, { guest: 401, moderator: "ok", admin: "ok" }),
  "POST /api/admin/photo/999999/approve":   row(403, { guest: 401, moderator: "ok", admin: "ok" }),
  "POST /api/admin/payment/999999/confirm": row(403, { guest: 401, admin: "ok" }),
  "POST /api/admin/practice/0/add":        row(403, { guest: 401, admin: "ok" }),
  "POST /api/admin/user/999999/role":       row(403, { guest: 401, admin: "ok" }),
  // Ochiq API
  "GET /api/me": row("ok"), "GET /api/health": row("ok"), "POST /api/analyze": row("ok"), "POST /api/auth/logout": row("ok")
};
