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
  // Yurist hisobi: profilni to‘ldiradi → moderatsiya («Yurist bo‘lish» arizasi faqat fuqaro uchun — yurist uchun 403)
  assert.equal((await lawyer.post("/api/lawyers/apply", { name: "Karim Yurist", phone: "+998 90 000 11 22", consent: true })).status, 403);
  assert.equal((await lawyer.post("/api/lawyer/profile", { name: "Karim Yurist", phone: "+998 90 000 11 22", kind: "advokat", areas: ["mehnat"], region: "Toshkent shahri", formats: ["online"], price: "200000", license: "A-123" })).status, 200);
  const prof = await db.one("select id, status from lawyer_profiles where name = 'Karim Yurist'");
  assert.equal(prof.status, "pending");
  assert.ok(!(await (await citizen.get("/yuristlar?soha=mehnat")).text()).includes("Karim Yurist"));
  assert.equal((await citizen.post(`/api/admin/lawyer/${prof.id}/approve`)).status, 403);
  assert.equal((await admin.post(`/api/admin/lawyer/${prof.id}/approve`)).status, 200);
  // Tasdiqlangan, lekin faqat sinov obunasi — katalogda ko‘rinmaydi; Pro to‘lovi tasdiqlangach ko‘rinadi
  assert.ok(!(await (await citizen.get("/yuristlar?soha=mehnat")).text()).includes("Karim Yurist"));
  assert.equal((await citizen.get(`/yuristlar/y${prof.id}`)).status, 404);
  assert.equal((await lawyer.post("/api/subscriptions", { plan: "pro" })).status, 201);
  assert.equal((await lawyer.post("/api/subscriptions", { plan: "pro" })).status, 200);         // takror — yangi hisob-faktura yo‘q
  const proPay = await db.one("select id from payments where kind = 'subscription' and amount = 149000 and status = 'pending'");
  assert.equal((await admin.post(`/api/admin/payment/${proPay.id}/confirm`)).status, 200);
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
  // Tashkilot obunasi (narx kelishuv bo‘yicha)
  assert.equal((await org.post("/api/subscriptions", { plan: "org" })).status, 201);
  const orgPay = await db.one("select id from payments where kind = 'subscription' and amount = 0 and status = 'pending'");
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

test("Yurist profili: tahrirlash, rasm, qayta moderatsiya; Pro vositalari, kabinet hisobda, statistika; mavzu", opts, async () => {
  const lw = client(), cz = client(), admin = client();
  await reg(lw, { name: "Nodira Advokat", email: "nodira@test.uz", role: "lawyer" });
  await reg(cz, { name: "Fuqaro", email: "fuqaro2@test.uz" });
  await admin.post("/api/auth/login", { email: "admin@test.uz", password: "Parol1234" });
  // Profil sahifasi va saqlash
  assert.match(await (await lw.get("/hisob/profil")).text(), /data-api="\/api\/lawyer\/profile"/);
  const pf = { name: "Nodira Advokat", kind: "advokat", phone: "+998 91 222 33 44", email: "nodira@test.uz", telegram: "@nodira_law", website: "https://nodira.example.com",
    license: "L-777", licenseIssuer: "Adliya vazirligi, 2019", experience: "9", region: "Samarqand viloyati", district: "Urgut tumani", address: "Mustaqillik 5",
    hours: "Du–Ju 09:00–18:00", headline: "Oila va meros nizolari", about: "Oilaviy nizolarda 9 yillik tajriba. Sudgacha kelishuvga e’tibor beraman, kerak bo‘lsa sudda vakillik qilaman.",
    education: "TDYU, 2015", achievements: "200+ ish", areas: ["oila", "meros", "yoq"], formats: ["online", "office"], langs: ["uz", "ru"],
    services: [{ name: "Konsultatsiya", min: "45", format: "online", price: "150 000" }, { name: "", price: "1" }, { name: "Sudda vakillik", format: "office", price: "2000000", from: true }] };
  assert.equal((await lw.post("/api/lawyer/profile", { ...pf, telegram: "@x" })).status, 400);
  assert.equal((await lw.post("/api/lawyer/profile", { ...pf, website: "http://ochiq" })).status, 400);
  const r1 = await lw.post("/api/lawyer/profile", pf);
  assert.equal(r1.status, 200);
  const p = await db.one("select * from lawyer_profiles where user_id = (select id from users where email = 'nodira@test.uz')");
  assert.equal(p.status, "pending");
  assert.deepEqual(p.areas, ["oila", "meros"]);
  assert.equal(p.services.length, 2);                                            // bo‘sh qator saqlanmaydi
  assert.equal(Number(p.price), 150000);                                         // katalogda eng arzon xizmat
  assert.equal(p.telegram, "nodira_law");
  // Rasm: faqat haqiqiy rasm
  const png = Buffer.from("89504E470D0A1A0A0000000D4948445200000001000000010806000000" + "1F15C4890000000D49444154789C6360000002000154A24F5D0000000049454E44AE426082", "hex");
  assert.equal((await lw.post("/api/lawyer/photo", { data: "data:image/png;base64," + Buffer.from("salom dunyo, bu rasm emas — ".repeat(10)).toString("base64") })).status, 400);
  const ph = await lw.post("/api/lawyer/photo", { data: "data:image/png;base64," + Buffer.concat([png, Buffer.alloc(200)]).toString("base64") });
  assert.equal(ph.status, 200);
  const img = await cz.get((await ph.json()).url);
  assert.equal(img.status, 200);
  assert.equal(img.headers.get("content-type"), "image/png");
  // Tasdiq + Pro to‘lovi → katalogda rasm, Telegram, ta’lim, xizmatlar
  await admin.post(`/api/admin/lawyer/${p.id}/approve`);
  await lw.post("/api/subscriptions", { plan: "pro" });
  const pay = await db.one("select p.id from payments p join users u on u.id = p.user_id where u.email = 'nodira@test.uz' and p.status = 'pending'");
  await admin.post(`/api/admin/payment/${pay.id}/confirm`);
  const prof = await (await cz.get(`/yuristlar/y${p.id}`)).text();
  for (const s of ["Nodira Advokat", "@nodira_law", "TDYU, 2015", "Sudda vakillik", `/yuristlar/rasm/${p.id}`, "L-777"]) assert.ok(prof.includes(s), s);
  // Faqat tavsif o‘zgarsa — tasdiq saqlanadi; litsenziya o‘zgarsa — qayta moderatsiya va katalogdan chiqadi
  assert.equal((await (await lw.post("/api/lawyer/profile", { ...pf, headline: "Oila, meros va aliment" })).json()).recheck, false);
  assert.equal((await db.one("select status from lawyer_profiles where id = $1", [p.id])).status, "approved");
  assert.equal((await (await lw.post("/api/lawyer/profile", { ...pf, license: "L-778" })).json()).recheck, true);
  assert.equal((await cz.get(`/yuristlar/y${p.id}`)).status, 404);
  // Yurist paneli va statistika (Pro bilan)
  const home = await (await lw.get("/hisob")).text();
  for (const s of ["Yurist Pro faol", "Mijozlar va ishlar kartotekasi", "Barcha muddatlar bitta kalendarda", "O‘z blankasi, shablon tahriri", "Statistika va tahlil", "Katalogda profil"]) assert.ok(home.includes(s), s);
  const st = await lw.get("/hisob/statistika");
  assert.equal(st.status, 200);
  assert.match(await st.text(), /Profil ko‘rishlari — so‘nggi 30 kun/);
  // Kabinet: fuqaro — rol yetmaydi (403, server/access.js); yurist — ilova va hisobda saqlash
  assert.equal((await cz.get("/kabinet")).status, 403);
  assert.equal((await cz.post("/api/cabinet", { data: { v: 1 } })).status, 403);
  assert.equal(cz.cookie !== "", true);
  assert.equal((await cz.get("/hisob/statistika")).status, 403);
  assert.match(await (await lw.get("/kabinet")).text(), /data-sync="1"/);
  const data = { v: 1, plan: "pro", clients: [{ id: "a", name: "Mijoz 1" }], cases: [{ id: "c", title: "Ish 1", deadlines: [{ id: "d", date: "2026-12-01", note: "Sud" }] }], templates: [], org: { name: "", docs: [] }, letterhead: { on: false, lines: [] }, savedAt: "2026-11-21T10:00:00Z" };
  assert.equal((await lw.post("/api/cabinet", { data: { v: 2 } })).status, 400);
  assert.equal((await lw.post("/api/cabinet", { data })).status, 200);
  const back = await (await lw.get("/api/cabinet")).json();
  assert.equal(back.data.clients[0].name, "Mijoz 1");
  assert.equal(back.data.cases[0].deadlines[0].date, "2026-12-01");
  // Mavzu: cookie → <html data-theme>, /mavzu almashtiradi va xavfsiz manzilga qaytaradi
  const th = await fetch(base + "/mavzu?to=toggle&back=/tariflar", { redirect: "manual" });
  assert.equal(th.status, 303);
  assert.equal(th.headers.get("location"), "/tariflar");
  assert.match(th.headers.get("set-cookie"), /hy_theme=dark/);
  assert.equal((await fetch(base + "/mavzu?to=light&back=//yomon.example", { redirect: "manual" })).headers.get("location"), "/");
  assert.match(await (await fetch(base + "/tariflar", { headers: { Cookie: "hy_theme=dark" } })).text(), /<html data-theme="dark"/);
  assert.match(await (await fetch(base + "/", { headers: { Cookie: "hy_theme=light" } })).text(), /<html data-theme="light"/);
});


// Kirish huquqlari: har bir rol × har bir himoyalangan yo‘l, haqiqiy sessiya bilan (kutilgan jadval — test/fixtures/access-matrix.js)
test("Kirish huquqlari: har bir rol × har bir sahifa va API (200 / 303 / 401 / 402 / 403)", opts, async () => {
  const { ACTORS, PAGES, API } = await import("./fixtures/access-matrix.js");
  const actors = { guest: client() };
  for (const a of ACTORS.filter(x => x !== "guest")){
    const c = client(), role = a.replace("NoPro", "");
    const r = await reg(c, { name: `Rol ${a}`, email: `acc-${a.toLowerCase()}@test.uz`, role: ["lawyer", "org"].includes(role) ? role : "citizen", orgName: role === "org" ? "«Sinov» MChJ" : undefined });
    assert.equal(r.status, 201, a);
    const id = (await db.one("select id from users where email = $1", [`acc-${a.toLowerCase()}@test.uz`])).id;
    if (["moderator", "admin"].includes(role)) await db.q("update users set role = $2 where id = $1", [id, role]);
    if (a.endsWith("NoPro")) await db.q("update subscriptions set status = 'cancelled', ends_at = now() where user_id = $1", [id]);
    actors[a] = c;
  }
  const fails = [];
  for (const [url, exp] of Object.entries(PAGES)) for (const a of ACTORS){
    const r = await actors[a].get(url);
    if (r.status !== exp[a]) fails.push(`${a} GET ${url}: ${r.status} ≠ ${exp[a]}`);
    if (r.status === 403 && !/Mening sahifamga/.test(await r.text())) fails.push(`${a} ${url}: 403 sahifasida rol havolasi yo‘q`);
  }
  for (const [k, exp] of Object.entries(API)){
    const [method, url] = k.split(" ");
    for (const a of ACTORS){
      if (url === "/api/auth/logout") continue;                                 // sessiyani o‘chirmaslik uchun
      const r = method === "GET" ? await actors[a].get(url) : await actors[a].post(url, {});
      const got = [401, 402, 403].includes(r.status) ? r.status : "ok";
      if (got !== exp[a]) fails.push(`${a} ${k}: ${r.status} ≠ ${exp[a]}`);
    }
  }
  assert.deepEqual(fails, []);
  // Kirgan foydalanuvchi /kirish ga kelsa — o‘z «uyi»ga
  assert.equal((await actors.admin.get("/kirish")).headers.get("location"), "/admin");
  assert.equal((await actors.moderator.get("/kirish")).headers.get("location"), "/admin");
  assert.equal((await actors.citizen.get("/kirish")).headers.get("location"), "/hisob");
  // /api/me: navbar uchun rol ocha oladigan sahifalar
  assert.deepEqual((await (await actors.admin.get("/api/me")).json()).nav, ["/", "/yuristlar", "/tariflar", "/admin"]);
  // Moderator panelida faqat 2 bo‘lim; chiqish tugmasi bor
  const mod = await (await actors.moderator.get("/admin")).text();
  assert.match(mod, /href="\/admin\?b=yurist"/);
  assert.ok(!/href="\/admin\?b=daromad"/.test(mod) && !/href="\/admin\?b=users"/.test(mod));
  assert.match(mod, /<button class="btn danger logoutbtn" type="button" data-logout>/);
  // Chiqish: sessiya yopiladi
  assert.equal((await actors.citizen.post("/api/auth/logout")).status, 200);
  assert.equal((await actors.citizen.get("/hisob")).status, 303);
});
