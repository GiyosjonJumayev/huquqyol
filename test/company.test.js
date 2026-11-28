// Kompaniya ish joyi va yangi kirish/ro‘yxat (PostgreSQL bilan): rol bo‘yicha ro‘yxat, parol siyosati, parolsiz kirish havolasi,
// shartnoma/muddat/xat/hujjat reestri, tashkilotlar orasidagi ajratish, obunasiz «faqat ko‘rish», eksport, shablondan hujjat, kunlik eslatma.
// TEST_DATABASE_URL bo‘lmasa — o‘tkazib yuboriladi. Bazani tozalaydi: fayllar ketma-ket ishga tushirilsin (--test-concurrency=1).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";

const URL = process.env.TEST_DATABASE_URL;
const opts = { skip: !URL && "TEST_DATABASE_URL berilmagan" };
const PW = "Sinov-Kalit-2468";
let app, db, server, base, mail = [];

before(async () => {
  if (!URL) return;
  process.env.DATABASE_URL = URL;
  process.env.AUTH_RATE = "1000";
  const pg = (await import("pg")).default;
  const c = new pg.Client({ connectionString: URL }); await c.connect();
  await c.query("drop schema public cascade; create schema public;"); await c.end();
  ({ app } = await import("../server/index.js"));
  db = await import("../server/db.js");
  await db.migrate();
  (await import("../server/mail.js")).useTestMail(mail);
  await new Promise(r => { server = app.listen(0, () => { base = `http://127.0.0.1:${server.address().port}`; r(); }); });
});
after(async () => { if (server) server.close(); if (db) await db.closeDb(); });

function client(){
  let cookie = "";
  const keep = r => { for (const c of r.headers.getSetCookie?.() || []){ const [kv] = c.split(";"); cookie = /=$/.test(kv) || /Max-Age=0|Expires=Thu, 01 Jan 1970/i.test(c) ? "" : kv; } return r; };
  return {
    get: p => fetch(base + p, { headers: { Cookie: cookie }, redirect: "manual" }).then(keep),
    post: (p, b = {}) => fetch(base + p, { method: "POST", headers: { "Content-Type": "application/json", Cookie: cookie }, body: JSON.stringify(b) }).then(keep),
    json: async (p, b) => { const r = await fetch(base + p, { method: "POST", headers: { "Content-Type": "application/json", Cookie: cookie }, body: JSON.stringify(b ?? {}) }).then(keep); return { status: r.status, ...(await r.json()) }; }
  };
}
const iso = n => { const d = new Date(); d.setDate(d.getDate() + n); const z = x => String(x).padStart(2, "0"); return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`; };
const reg = (c, b) => c.json("/api/auth/register", { password: PW, consent: true, ...b });

test("Ro‘yxat: parol siyosati (keng tarqalgan, shaxsiy), maydon bo‘yicha xato, rol bo‘yicha birinchi sahifa", opts, async () => {
  const c = client();
  let r = await reg(c, { name: "Aziza Karimova", email: "aziza@test.uz", password: "Password123", role: "org", orgName: "«Sinov» MChJ" });
  assert.equal(r.status, 400); assert.equal(r.field, "password"); assert.match(r.error, /keng tarqalgan/);
  r = await reg(c, { name: "Aziza Karimova", email: "aziza@test.uz", password: "karimova2026", role: "org", orgName: "«Sinov» MChJ" });
  assert.equal(r.field, "password"); assert.match(r.error, /ismingiz/);
  r = await reg(c, { name: "Aziza Karimova", email: "aziza@test.uz", role: "org", orgName: "" });
  assert.equal(r.field, "orgName");
  r = await reg(c, { name: "Aziza Karimova", email: "aziza@test.uz", role: "org", orgName: "«Sinov» MChJ", inn: "12345" });
  assert.equal(r.field, "inn");
  r = await reg(c, { name: "Aziza Karimova", email: "aziza@test.uz", role: "org", orgName: "«Sinov» MChJ", inn: "301234567", orgSize: "11-50" });
  assert.equal(r.status, 201); assert.equal(r.next, "/kompaniya?yangi=1");
  const s = await db.one("select s.plan, s.status, o.size from subscriptions s join organizations o on o.id = s.org_id join users u on u.id = s.user_id where u.email = 'aziza@test.uz'");
  assert.deepEqual([s.plan, s.status, s.size], ["biznes", "trial", "11-50"]);
  // Yurist: turi va litsenziyasi bilan qoralama profil (moderatsiyaga tushmaydi — telefon bo‘sh)
  r = await reg(client(), { name: "Dilshod Rahimov", email: "dilshod@test.uz", role: "lawyer", lawyerKind: "advokat", license: "AV-1234", firm: "«Adolat» byurosi" });
  assert.equal(r.next, "/hisob/profil?yangi=1");
  const p = await db.one("select kind, license, firm, phone from lawyer_profiles where name = 'Dilshod Rahimov'");
  assert.deepEqual([p.kind, p.license, p.firm, p.phone], ["advokat", "AV-1234", "«Adolat» byurosi", ""]);
  // Login xatosi — parol maydoni; API xatolari foydalanuvchi tilida
  const l = await client().json("/api/auth/login", { email: "aziza@test.uz", password: "Notogri-123" });
  assert.equal(l.status, 401); assert.equal(l.field, "password");
  const g = await client().json("/api/company/records", { kind: "deadline" });
  assert.equal(g.status, 401); assert.equal(g.key, "auth"); assert.match(g.error, /kiring/);
});

test("Parolsiz kirish: bir xil javob, havola bir marta, 15 daqiqa; e-pochta tasdiqlanadi", opts, async () => {
  mail.length = 0;
  const a = await client().json("/api/auth/link", { email: "aziza@test.uz" }), b = await client().json("/api/auth/link", { email: "yoq@test.uz" });
  assert.equal(a.status, 200); assert.equal(b.status, 200); assert.equal(a.message, b.message);       // hisob borligi bilinmaydi
  await new Promise(r => setTimeout(r, 300));
  const m = mail.find(x => x.kind === "login" && x.to === "aziza@test.uz");
  assert.ok(m); assert.equal(mail.filter(x => x.kind === "login").length, 1);
  const token = new globalThis.URL(m.link).searchParams.get("t");
  const c = client();
  const page = await c.get(`/kirish/havola?t=${token}`);
  assert.equal(page.status, 200); assert.match(await page.text(), /data-api="\/api\/auth\/link\/use"/);    // ochish kirgizmaydi (skanerlar uchun)
  assert.equal((await c.get("/kompaniya")).status, 303);
  const u = await c.json("/api/auth/link/use", { token });
  assert.equal(u.status, 200); assert.equal(u.next, "/kompaniya");
  assert.equal((await c.get("/kompaniya")).status, 200);
  assert.equal((await client().json("/api/auth/link/use", { token })).status, 400);                     // takror — yo‘q
  assert.ok((await db.one("select email_verified_at from users where email = 'aziza@test.uz'")).email_verified_at);
});

test("Kompaniya: reestr, avtomatik raqam, takrorlanadigan muddat, ajratish, eksport, hujjat, obunasiz «faqat ko‘rish»", opts, async () => {
  const c = client();
  assert.equal((await c.post("/api/auth/login", { email: "aziza@test.uz", password: PW })).status, 200);
  assert.equal((await c.get("/kompaniya")).status, 200);
  for (const b of ["shartnomalar", "muddatlar", "xatlar", "kutubxona", "hujjatlar", "qonunlar", "rekvizitlar", "hujjatlar&shablon=bz_talab", "yoq"]) assert.equal((await c.get(`/kompaniya?b=${b}`)).status, 200, b);
  // Boshqa rollar
  const cit = client(); await reg(cit, { name: "Bobur Aliyev", email: "bobur@test.uz" });
  assert.equal((await cit.get("/kompaniya")).status, 403);
  assert.equal((await client().get("/kompaniya")).status, 303);
  // Tekshiruv: maydon bo‘yicha
  let r = await c.json("/api/company/records", { kind: "contract", title: "x", party: "A" });
  assert.equal(r.field, "title");
  r = await c.json("/api/company/records", { kind: "contract", title: "Shartnoma", party: "«Tekstil» MChJ", start_date: "2026-03-01", due_date: "2026-02-01" });
  assert.equal(r.field, "due_date");
  r = await c.json("/api/company/records", { kind: "contract", title: "Shartnoma", party: "«Tekstil» MChJ", amount: "abc" });
  assert.equal(r.field, "amount");
  r = await c.json("/api/company/records", { kind: "deadline", title: "Hisobot", due_date: "2026-02-30" });
  assert.equal(r.field, "due_date");
  r = await c.json("/api/company/records", { kind: "contract", title: "=HYPERLINK(\"x\")", party: "«Tekstil Plyus» MChJ", party_inn: "302222222", amount: "150 000 000", due_date: iso(10), remind_days: 30 });
  assert.equal(r.status, 201);
  const contract = r.id;
  // Xatlar: kiruvchi va chiquvchi alohida raqamlanadi
  const l1 = await c.json("/api/company/records", { kind: "letter", direction: "in", party: "Soliq inspeksiyasi", title: "So‘rov", due_date: iso(2) });
  const l2 = await c.json("/api/company/records", { kind: "letter", direction: "in", party: "Bank", title: "Xabar" });
  const l3 = await c.json("/api/company/records", { kind: "letter", direction: "out", party: "Bank", title: "Javob" });
  const y = new Date().getFullYear();
  assert.deepEqual([l1.number, l2.number, l3.number], [`K-${y}/001`, `K-${y}/002`, `Ch-${y}/001`]);
  // Takrorlanadigan muddat: «bajarildi» → keyingisi bir yildan keyin
  const d = await c.json("/api/company/records", { kind: "deadline", title: "Litsenziyani uzaytirish", category: "litsenziya", due_date: "2026-02-28", repeat: "year" });
  const done = await c.json(`/api/company/records/${d.id}/done`);
  assert.ok(done.nextId);
  assert.equal((await db.one("select to_char(due_date, 'YYYY-MM-DD') as d, status from org_records where id = $1", [done.nextId])).d, "2027-02-28");
  assert.equal((await c.json(`/api/company/records/${d.id}/done`)).status, 409);
  // Panel va filtr
  const dash = await (await c.get("/kompaniya")).text();
  assert.match(dash, /Tekstil Plyus/); assert.match(dash, /class="due soon"/);
  const soon = await (await c.get("/kompaniya?b=shartnomalar&muddat=soon&q=tekstil")).text();
  assert.match(soon, /Topildi: 1/);
  // Rekvizitlar: faqat egasi; noto‘g‘ri hisob raqami — maydon xatosi
  assert.equal((await c.json("/api/company/requisites", { name: "«Sinov» MChJ", account: "123" })).field, "account");
  assert.equal((await c.json("/api/company/requisites", { name: "«Sinov» MChJ", inn: "301234567", city: "Toshkent sh.", director: "A. Karimova", directorPos: "Direktor", account: "20208000900123456001", mfo: "00873" })).status, 200);
  // Shablondan hujjat: chiquvchi xat jurnalga yoziladi, raqam hujjatda
  const doc = await c.post("/api/company/doc/docx", { tpl: "bz_talab", values: { other: "«Tekstil Plyus» MChJ", sum: "150 000 000" }, logOut: true });
  assert.equal(doc.status, 200);
  assert.equal(decodeURIComponent(doc.headers.get("x-record-number")), `Ch-${y}/002`);
  assert.match(doc.headers.get("content-type"), /wordprocessingml/);
  const pdf = await c.post("/api/company/doc/pdf", { tpl: "m_buyruq", values: { person: "Ali Valiyev" }, docLang: "cyr" });
  assert.equal(pdf.status, 200); assert.equal(pdf.headers.get("x-record-number"), null);
  assert.equal((await c.post("/api/company/doc/pdf", { tpl: "sorov" })).status, 400);                 // advokat shabloni — kompaniyada yo‘q
  // Eksport: Excel formula in’ektsiyasidan himoya; kalendar
  const bytes = Buffer.from(await (await c.get("/kompaniya/eksport/contract")).arrayBuffer()), csv = bytes.toString("utf8");
  assert.deepEqual([...bytes.subarray(0, 3)], [0xEF, 0xBB, 0xBF]); assert.match(csv, /number,title/); assert.match(csv, /'=HYPERLINK/);
  const ics = await (await c.get("/kompaniya/kalendar")).text();
  assert.match(ics, /BEGIN:VCALENDAR/); assert.match(ics, /TRIGGER:-P30D/);
  // Boshqa kompaniya: birovning yozuvini ko‘rmaydi va o‘zgartira olmaydi
  const o2 = client(); await reg(o2, { name: "Sardor Tursunov", email: "sardor@test.uz", role: "org", orgName: "«Boshqa» MChJ" });
  assert.equal((await o2.json(`/api/company/records/${contract}`, { title: "Buzildi", party: "X" })).status, 404);
  assert.equal((await o2.json(`/api/company/records/${contract}/delete`)).status, 404);
  assert.doesNotMatch(await (await o2.get("/kompaniya?b=shartnomalar")).text(), /Tekstil/);
  assert.doesNotMatch(await (await o2.get(`/kompaniya?b=shartnomalar&id=${contract}`)).text(), /Tekstil/);
  // Jurnal: amal yoziladi, matn yozilmaydi
  const au = await db.q("select action, data from audit_log where action like 'company.%'");
  assert.ok(au.rows.some(x => x.action === "company.create")); assert.ok(au.rows.every(x => !JSON.stringify(x.data || {}).includes("Tekstil")));
  // Obuna tugadi: yozish — 402, ko‘rish va eksport — ochiq
  await db.q("update subscriptions set status = 'expired', ends_at = now() - interval '1 day' where org_id = (select org_id from users where email = 'aziza@test.uz')");
  r = await c.json("/api/company/records", { kind: "deadline", title: "Yangi", due_date: iso(5) });
  assert.equal(r.status, 402); assert.match(r.error, /obuna/i);
  const ro = await (await c.get("/kompaniya?b=shartnomalar")).text();
  assert.match(ro, /Obuna faol emas/); assert.doesNotMatch(ro, /data-api="\/api\/company\/records"/);
  assert.equal((await c.get("/kompaniya/eksport/letter")).status, 200);
  await db.q("update subscriptions set status = 'trial', ends_at = now() + interval '5 days' where org_id = (select org_id from users where email = 'aziza@test.uz')");
});

test("Kunlik eslatma: egasiga (va mas’ulga) — bir kunda bir marta, faqat faol tarifda", opts, async () => {
  process.env.PUBLIC_HOST = "huquqyol.test";
  const { runJobs } = await import("../server/jobs.js");
  mail.length = 0;
  const at9 = new Date(); at9.setHours(9, 0, 0, 0);
  const r = await runJobs(at9.getTime());
  assert.ok(r.digest >= 1);
  const m = mail.filter(x => x.kind === "digest");
  assert.ok(m.some(x => x.to === "aziza@test.uz" && /Tekstil Plyus/.test(x.text) && x.link === "https://huquqyol.test/kompaniya"));
  assert.ok(!m.some(x => x.to === "sardor@test.uz"));                                                   // yozuvi yo‘q
  mail.length = 0;
  await runJobs(at9.getTime());
  assert.equal(mail.filter(x => x.kind === "digest").length, 0);                                         // bugun yuborilgan
  delete process.env.PUBLIC_HOST;
});

test("Hisob egasi o‘chirilsa — kompaniya yozuvlari va rekvizitlar ham o‘chadi", opts, async () => {
  const c = client();
  assert.equal((await c.post("/api/auth/login", { email: "aziza@test.uz", password: PW })).status, 200);
  const org = (await db.one("select org_id from users where email = 'aziza@test.uz'")).org_id;
  assert.ok((await db.one("select count(*)::int n from org_records where org_id = $1", [org])).n > 0);
  assert.equal((await c.json("/api/account/delete", { password: PW })).status, 200);
  assert.equal((await db.one("select count(*)::int n from org_records where org_id = $1", [org])).n, 0);
  assert.deepEqual((await db.one("select req from organizations where id = $1", [org])).req, {});
});
