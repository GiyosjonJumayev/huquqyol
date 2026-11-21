// PostgreSQL bilan to‘liq oqim: ro‘yxat, kirish, bloklash, yurist profili va moderatsiya, kelishuv (komissiya),
// obunalar, admin paneli. TEST_DATABASE_URL bo‘lmasa — o‘tkazib yuboriladi (CI da postgres xizmati bilan ishlaydi).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";

const URL = process.env.TEST_DATABASE_URL;
const opts = { skip: !URL && "TEST_DATABASE_URL berilmagan" };
let app, db, server, base;

before(async () => {
  if (!URL) return;
  process.env.DATABASE_URL = URL;
  process.env.ADMIN_EMAILS = "admin@test.uz";
  process.env.AUTH_RATE = "1000";
  const pg = (await import("pg")).default;
  const c = new pg.Client({ connectionString: URL }); await c.connect();
  await c.query("drop schema public cascade; create schema public;"); await c.end();
  ({ app } = await import("../server/index.js"));
  db = await import("../server/db.js");
  assert.ok((await db.migrate()) >= 1);
  assert.equal(await db.migrate(), 0);                                       // takror — hech narsa qilmaydi
  await new Promise(r => { server = app.listen(0, () => { base = `http://127.0.0.1:${server.address().port}`; r(); }); });
});
after(async () => { if (server) server.close(); if (db) await db.closeDb(); });

// Har bir foydalanuvchi uchun alohida cookie
function client(){
  let cookie = "";
  const keep = r => { const sc = r.headers.getSetCookie?.() || []; for (const c of sc){ const [kv] = c.split(";"); cookie = /=$/.test(kv) || /Max-Age=0|Expires=Thu, 01 Jan 1970/i.test(c) ? "" : kv; } return r; };
  return {
    get: p => fetch(base + p, { headers: { Cookie: cookie }, redirect: "manual" }).then(keep),
    post: (p, b = {}) => fetch(base + p, { method: "POST", headers: { "Content-Type": "application/json", Cookie: cookie }, body: JSON.stringify(b) }).then(keep),
    get cookie(){ return cookie; }
  };
}
const reg = (c, b) => c.post("/api/auth/register", { password: "Parol1234", consent: true, ...b });

test("Ro‘yxat va kirish: parol talabi, email bandligi, sessiya, xato urinishlar bloki", opts, async () => {
  const c = client();
  assert.equal((await reg(c, { name: "Ali", email: "ali@test.uz", password: "qisqa" })).status, 400);
  assert.equal((await reg(c, { name: "Ali", email: "ali@test.uz", consent: false })).status, 400);
  const r = await reg(c, { name: "Ali Valiyev", email: "Ali@Test.uz", phone: "+998 90 111 22 33" });
  assert.equal(r.status, 201);
  assert.match(c.cookie, /^hy_sid=/);
  assert.equal((await reg(client(), { name: "Boshqa", email: "ali@test.uz" })).status, 400);   // band (katta-kichik harf farqsiz)
  const h = await c.get("/hisob");
  assert.equal(h.status, 200);
  assert.match(await h.text(), /Ali Valiyev/);
  assert.notEqual((await c.get("/admin")).status, 200);                    // fuqaro admin emas
  // Chiqish va kirish
  assert.equal((await c.post("/api/auth/logout")).status, 200);
  assert.equal((await c.get("/hisob")).status, 303);
  assert.equal((await c.post("/api/auth/login", { email: "ali@test.uz", password: "xato12345" })).status, 401);
  assert.equal((await c.post("/api/auth/login", { email: "ali@test.uz", password: "Parol1234" })).status, 200);
  // Parolni almashtirish
  assert.equal((await c.post("/api/auth/password", { current: "xato", password: "Yangi12345" })).status, 401);
  assert.equal((await c.post("/api/auth/password", { current: "Parol1234", password: "Yangi12345" })).status, 200);
  // 5 ta xato — 15 daqiqa blok (to‘g‘ri parol ham o‘tmaydi)
  const x = client();
  for (let i = 0; i < 5; i++) await x.post("/api/auth/login", { email: "ali@test.uz", password: "Notog11ri" });
  const locked = await x.post("/api/auth/login", { email: "ali@test.uz", password: "Yangi12345" });
  assert.equal(locked.status, 400);
  assert.match((await locked.json()).error, /15 daqiqa/);
  const u = await db.one("select password_hash from users where lower(email) = 'ali@test.uz'");
  assert.match(u.password_hash, /^scrypt\$16384\$/);                         // parol ochiq saqlanmaydi
  assert.ok((await db.one("select count(*)::int n from sessions")).n >= 1);
  assert.ok(!(await db.one("select id from sessions limit 1")).id.startsWith("hy_"));   // bazada token emas, xesh
});

test("Biznes oqimi: yurist profili → moderatsiya → katalog → kelishuv → komissiya; obunalar; admin paneli", opts, async () => {
  const lawyer = client(), citizen = client(), admin = client(), org = client();
  assert.equal((await reg(lawyer, { name: "Karim Yurist", email: "karim@test.uz", role: "lawyer" })).status, 201);
  assert.equal((await reg(citizen, { name: "Fuqaro Bek", email: "bek@test.uz" })).status, 201);
  const ra = await reg(admin, { name: "Admin", email: "admin@test.uz" });
  assert.equal((await ra.json()).role, "admin");
  assert.equal((await reg(org, { name: "Tashkilot yuristi", email: "org@test.uz", role: "org", orgName: "«Namuna» MChJ", orgKind: "korxona", inn: "123456789" })).status, 201);
  // Yurist: 14 kunlik sinov obunasi
  assert.equal((await db.one("select s.status from subscriptions s join users u on u.id = s.user_id where u.email = 'karim@test.uz'")).status, "trial");
  // Katalogga ariza (tizimga kirgan yurist) → moderatsiya
  assert.equal((await lawyer.post("/api/lawyers/apply", { name: "Karim Yurist", phone: "+998 90 000 11 22", kind: "advokat", areas: ["mehnat"], region: "Toshkent shahri", formats: ["online"], price: "200000", license: "A-123", consent: true })).status, 201);
  const prof = await db.one("select id, status from lawyer_profiles where name = 'Karim Yurist'");
  assert.equal(prof.status, "pending");
  assert.ok(!(await (await citizen.get("/yuristlar?soha=mehnat")).text()).includes("Karim Yurist"));
  assert.equal((await citizen.post(`/api/admin/lawyer/${prof.id}/approve`)).status, 403);
  assert.equal((await admin.post(`/api/admin/lawyer/${prof.id}/approve`)).status, 200);
  const list = await (await citizen.get("/yuristlar?soha=mehnat")).text();
  assert.match(list, /Karim Yurist/);
  const page = await (await citizen.get(`/yuristlar/y${prof.id}?holat=ish_haqi`)).text();
  assert.match(page, /data-api="\/api\/consultations"/);
  assert.match(page, /\+998 90 000 11 22/);                                   // haqiqiy yurist kontakti ochiq
  // Kelishuv: so‘rov → taklif → rozilik → bajarildi
  const rq = await citizen.post("/api/consultations", { lawyer: prof.id, scenario: "ish_haqi", format: "online", message: "Ish beruvchi 3 oydan beri maosh bermayapti." });
  assert.equal(rq.status, 201);
  const cid = (await rq.json()).id;
  assert.equal((await citizen.post(`/api/consultations/${cid}/agree`)).status, 409);       // taklif hali yo‘q
  assert.equal((await citizen.post(`/api/consultations/${cid}/offer`, { price: 1 })).status, 403);   // fuqaro narx qo‘ya olmaydi
  assert.equal((await lawyer.post(`/api/consultations/${cid}/offer`, { price: "500 000", note: "Da’vo va sud" })).status, 200);
  assert.equal((await citizen.post(`/api/consultations/${cid}/agree`)).status, 200);
  const comm = await db.one("select id, amount, status from payments where kind = 'commission' and consultation_id = $1", [cid]);
  assert.equal(Number(comm.amount), 50000);                                     // 10% komissiya
  assert.equal((await lawyer.post(`/api/consultations/${cid}/complete`)).status, 200);
  assert.match(await (await lawyer.get("/hisob")).text(), /Bajarilgan/);
  // Obunalar: yurist Pro, tashkilot (narx kelishuv bo‘yicha)
  assert.equal((await lawyer.post("/api/subscriptions", { plan: "pro" })).status, 201);
  assert.equal((await org.post("/api/subscriptions", { plan: "org" })).status, 201);
  const pend = (await db.q("select id, kind, amount, user_id from payments where status = 'pending' order by id")).rows;
  const proPay = pend.find(p => p.kind === "subscription" && Number(p.amount) === 149000);
  const orgPay = pend.find(p => p.kind === "subscription" && Number(p.amount) === 0);
  assert.ok(proPay && orgPay);
  assert.equal((await admin.post(`/api/admin/payment/${proPay.id}/confirm`)).status, 200);
  assert.equal((await admin.post(`/api/admin/payment/${orgPay.id}/confirm`, { amount: "2000000" })).status, 200);
  assert.equal((await admin.post(`/api/admin/payment/${comm.id}/confirm`)).status, 200);
  assert.equal((await admin.post(`/api/admin/payment/${comm.id}/confirm`)).status, 409);  // ikki marta emas
  // Admin paneli: barcha bo‘limlar va asosiy ko‘rsatkichlar
  for (const b of ["umumiy", "murojaat", "daromad", "obuna", "yurist", "kelishuv", "users"]){
    const r = await admin.get(`/admin?b=${b}`);
    assert.equal(r.status, 200, b);
    const html = await r.text();
    assert.ok(!/\sstyle=/.test(html) && !/<script(?![^>]*\bsrc=)/.test(html), b);
    if (b === "umumiy") assert.match(html, /2\s149\s000 so‘m/);                // MRR: Pro + tashkilot
    if (b === "daromad") assert.match(html, /2\s199\s000 so‘m/);               // shu oy: 149 000 + 2 000 000 + 50 000
    if (b === "obuna") assert.match(html, /«Namuna» MChJ/);
    if (b === "yurist") assert.match(html, /Karim Yurist/);
  }
  // Rolni o‘zgartirish va o‘zini admin rolidan chiqara olmaslik
  const me = await db.one("select id from users where email = 'admin@test.uz'");
  assert.equal((await admin.post(`/api/admin/user/${me.id}/role`, { role: "citizen" })).status, 400);
});
