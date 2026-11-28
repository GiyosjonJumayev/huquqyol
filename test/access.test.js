// Kirish huquqlari: server/access.js jadvali — har bir rol × har bir himoyalangan yo‘l (bazasiz, decide() orqali),
// mehmon uchun haqiqiy HTTP javoblar, va Express’dagi har bir yo‘l jadvalda borligi.
// Kirgan foydalanuvchilar bilan to‘liq HTTP tekshiruv — test/db.test.js (TEST_DATABASE_URL bilan).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { decide, findRule, navFor, HOME, ADMIN_SECTIONS, PAGES as RULE_PAGES } from "../server/access.js";
import { ACTORS, PAGES, API, roleOfActor, proOfActor } from "./fixtures/access-matrix.js";

const { app } = await import("../server/index.js");
let server, base;
before(() => new Promise(r => { server = app.listen(0, "127.0.0.1", () => { base = `http://127.0.0.1:${server.address().port}`; r(); }); }));
after(() => server?.close());

const split = u => { const [path, qs = ""] = u.split("?"); return { path, query: Object.fromEntries(new URLSearchParams(qs)) }; };
async function verdict(actor, method, url){
  const { path, query } = split(url);
  const d = await decide(roleOfActor(actor), findRule(method, path), { url, query, pro: () => proOfActor(actor) });
  return d.ok ? (method === "GET" && !path.startsWith("/api/") ? 200 : "ok") : d.status;
}

test("Jadval: har bir rol × har bir sahifa — 200 / 303 / 403", async () => {
  for (const [url, exp] of Object.entries(PAGES)) for (const a of ACTORS)
    assert.equal(await verdict(a, "GET", url), exp[a], `${a} → ${url}`);
});

test("Jadval: har bir rol × har bir API — ruxsat / 401 / 402 / 403", async () => {
  for (const [k, exp] of Object.entries(API)){
    const [method, url] = k.split(" ");
    for (const a of ACTORS) assert.equal(await verdict(a, method, url), exp[a], `${a} → ${k}`);
  }
});

test("Mehmon (haqiqiy HTTP): himoyalangan sahifa → /kirish?next=…, API → 401", async () => {
  for (const [url, exp] of Object.entries(PAGES)){
    const r = await fetch(base + url, { redirect: "manual" });
    assert.equal(r.status, exp.guest, url);
    if (exp.guest === 303) assert.equal(r.headers.get("location"), `/kirish?next=${encodeURIComponent(url)}`, url);
  }
  for (const [k, exp] of Object.entries(API)){
    const [method, url] = k.split(" ");
    const r = await fetch(base + url, { method, redirect: "manual", ...(method === "POST" ? { headers: { "Content-Type": "application/json" }, body: "{}" } : {}) });
    if (exp.guest === 401) assert.equal(r.status, 401, k);
    else assert.ok(![401, 402, 403].includes(r.status), `${k}: ${r.status}`);
  }
});

test("Express’dagi har bir sahifa va /api yo‘li server/access.js jadvalida bor (yangi yo‘l jadvalsiz qolmaydi)", () => {
  const skip = p => /\.(js|mjs|webmanifest)$/.test(p) || p.startsWith("/pdfjs") || p.startsWith("/fonts") || p === "/api";
  const routes = [];
  for (const layer of app.router.stack){
    if (!layer.route) continue;
    const paths = Array.isArray(layer.route.path) ? layer.route.path : [layer.route.path];
    for (const p of paths) for (const m of Object.keys(layer.route.methods)) if (typeof p === "string" && !skip(p)) routes.push([m.toUpperCase(), p]);
  }
  assert.ok(routes.length > 30, String(routes.length));
  const missing = routes.filter(([m, p]) => !findRule(m, p.replace(/:(\w+)/g, "x")));
  assert.deepEqual(missing, []);
});

test("Rol «uyi», navbar ro‘yxati va admin bo‘limlari", () => {
  assert.deepEqual(HOME, { guest: "/", citizen: "/hisob", lawyer: "/hisob", org: "/kompaniya", moderator: "/admin", admin: "/admin" });
  assert.deepEqual(navFor("guest"), ["/", "/yuristlar", "/tariflar"]);
  assert.deepEqual(navFor("citizen"), ["/", "/yuristlar", "/tariflar", "/hisob", "/yurist-bolish"]);
  assert.deepEqual(navFor("lawyer"), ["/", "/yuristlar", "/tariflar", "/kabinet", "/hisob", "/hisob/profil"]);
  assert.deepEqual(navFor("org"), ["/", "/yuristlar", "/tariflar", "/kompaniya", "/hisob"]);          // kabinet manzil orqali ochiq, navbarda — Kompaniya
  assert.deepEqual(navFor("moderator"), ["/", "/yuristlar", "/tariflar", "/hisob", "/admin"]);
  assert.deepEqual(navFor("admin"), ["/", "/yuristlar", "/tariflar", "/admin"]);              // profil muharriri, kabinet, fuqaro kabineti yo‘q
  assert.deepEqual(ADMIN_SECTIONS.moderator, ["yurist", "rasm"]);
  for (const r of RULE_PAGES.filter(x => x.path === "/kabinet" || x.path.startsWith("/hisob"))) assert.ok(!r.roles.includes("admin"), r.path);
});
