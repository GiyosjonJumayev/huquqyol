// To‘lovlar (PostgreSQL bilan): Payme sandbox ssenariylari, Click Prepare/Complete, obuna uzaytirish, qaytarish, poyga holatlari,
// hisob xavfsizligi (e-pochta, parol tiklash, 2FA, qurilmalar), jamoa va davriy vazifalar.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

const URL_ = process.env.TEST_DATABASE_URL;
const opts = { skip: !URL_ && "TEST_DATABASE_URL berilmagan" };
const DB = URL_ && (() => { const u = new URL(URL_); u.searchParams.set("options", "-c search_path=paytest"); return u.href; })();   // boshqa DB testlari bilan to‘qnashmaslik uchun alohida sxema
let app, db, server, base, mails = [], totp, jobs, billing;

before(async () => {
  if (!URL_) return;
  Object.assign(process.env, { DATABASE_URL: DB, ADMIN_EMAILS: "boss@test.uz", AUTH_RATE: "10000", PAYME_MERCHANT_ID: "587f72c72cac0d162c722ae2", PAYME_KEY: "test-key-123", PAYME_TEST: "1",
    CLICK_SERVICE_ID: "31", CLICK_MERCHANT_ID: "20", CLICK_SECRET_KEY: "click-secret", COMPANY_NAME: "«Mizon» MChJ", COMPANY_INN: "123456789", COMPANY_ACCOUNT: "20208000000000000001", COMPANY_MFO: "00014", FIRMA_SEATS: "2", APP_SECRET: "x".repeat(40) });
  const pg = (await import("pg")).default;
  const c = new pg.Client({ connectionString: URL_ }); await c.connect();
  await c.query("drop schema if exists paytest cascade; create schema paytest;"); await c.end();
  ({ app } = await import("../server/index.js"));
  db = await import("../server/db.js"); totp = await import("../server/totp.js"); jobs = await import("../server/jobs.js"); billing = await import("../server/billing.js");
  (await import("../server/mail.js")).useTestMail(mails);
  await db.migrate();
  await new Promise(r => { server = app.listen(0, () => { base = `http://127.0.0.1:${server.address().port}`; r(); }); });
});
after(async () => { server?.close(); if (db) await db.closeDb(); });

function client(){
  let cookie = "";
  const keep = r => { for (const c of r.headers.getSetCookie?.() || []){ const [kv] = c.split(";"); if (kv.startsWith("hy_sid")) cookie = /=$/.test(kv) ? "" : kv; } return r; };
  return { get: p => fetch(base + p, { headers: { Cookie: cookie, "Accept-Language": "uz" }, redirect: "manual" }).then(keep),
    post: (p, b = {}) => fetch(base + p, { method: "POST", headers: { "Content-Type": "application/json", Cookie: cookie }, body: JSON.stringify({ lang: "uz", ...b }) }).then(keep),
    json: async (p, b) => (await (b === undefined ? fetch(base + p, { headers: { Cookie: cookie } }) : fetch(base + p, { method: "POST", headers: { "Content-Type": "application/json", Cookie: cookie }, body: JSON.stringify(b) }))).json() };
}
const PW = "Parol1234";
const reg = async (email, role = "lawyer", extra = {}) => { const c = client(); const r = await c.post("/api/auth/register", { name: "Test " + email, email, password: PW, consent: true, role, ...extra }); assert.equal(r.status, 201); return c; };
const order = async (c, plan = "pro", months = 1) => (await c.json("/api/subscriptions", { plan, months })).id;
const pay = id => db.one("select * from payments where id = $1", [id]);
const sub = id => db.one("select s.* from subscriptions s join payments p on p.subscription_id = s.id where p.id = $1", [id]);
const days = s => Math.round((new Date(s.ends_at) - Date.now()) / 864e5);
const rpc = async (method, params, key = "test-key-123", user = "Paycom") => {
  const r = await fetch(base + "/api/pay/payme", { method: "POST", headers: { "Content-Type": "text/json; charset=UTF-8", ...(key ? { Authorization: "Basic " + Buffer.from(`${user}:${key}`).toString("base64") } : {}) }, body: typeof params === "string" ? params : JSON.stringify({ id: 7, method, params }) });
  assert.equal(r.status, 200, "Payme: har doim 200");
  return r.json();
};
let seq = 0;
const txid = () => (++seq).toString(16).padStart(24, "5");
const create = (id, oid, sum, time = Date.now()) => rpc("CreateTransaction", { id, time, amount: sum * 100, account: { order_id: String(oid) } });

test("Payme: avtorizatsiya, noto‘g‘ri summa, buyurtma, JSON va metod (sandbox 1-ssenariy)", opts, async () => {
  const c = await reg("p1@test.uz"), id = await order(c);
  for (const [k, u] of [[null], ["xato"], ["test-key-123", "Boshqa"]]) assert.equal((await rpc("CheckPerformTransaction", { amount: 14900000, account: { order_id: String(id) } }, k, u)).error.code, -32504);
  assert.equal((await rpc("", "{buzuq")).error.code, -32700);
  assert.equal((await rpc("YoqMetod", {})).error.code, -32601);
  assert.equal((await rpc("constructor", {})).error.code, -32601);
  assert.equal((await rpc("CheckPerformTransaction", [])).error.code, -32600);
  for (const m of ["CheckPerformTransaction", "CreateTransaction"]){
    const x = { id: txid(), time: Date.now() };
    assert.equal((await rpc(m, { ...x, amount: 100, account: { order_id: String(id) } })).error.code, -31001);
    const e = (await rpc(m, { ...x, amount: 14900000, account: { order_id: "999999" } })).error;
    assert.ok(e.code <= -31050 && e.code >= -31099); assert.equal(e.data, "order_id"); assert.ok(e.message.uz && e.message.ru && e.message.en);
    assert.ok((await rpc(m, { ...x, amount: 14900000, account: { order_id: "1 or 1=1" } })).error.code <= -31050);
    assert.ok((await rpc(m, { ...x, amount: 14900000, account: {} })).error.code <= -31050);
  }
  assert.deepEqual((await rpc("CheckPerformTransaction", { amount: 14900000, account: { order_id: String(id) } })).result, { allow: true });
  // Yaratish, takror — bir xil javob; boshqa tranzaksiya — -31008; bekor qilish va takror
  const t = txid(), a = await create(t, id, 149000), b = await create(t, id, 149000);
  assert.deepEqual(a.result, b.result); assert.equal(a.result.state, 1);
  assert.equal((await create(txid(), id, 149000)).error.code, -31008);
  assert.equal((await rpc("CheckTransaction", { id: t })).result.state, 1);
  assert.equal((await rpc("CheckTransaction", { id: txid() })).error.code, -31003);
  assert.equal((await rpc("PerformTransaction", { id: txid() })).error.code, -31003);
  const x1 = await rpc("CancelTransaction", { id: t, reason: 3 }), x2 = await rpc("CancelTransaction", { id: t, reason: 3 });
  assert.equal(x1.result.state, -1); assert.deepEqual(x1.result, x2.result);
  const ct = (await rpc("CheckTransaction", { id: t })).result; assert.equal(ct.reason, 3); assert.equal(ct.perform_time, 0); assert.ok(ct.cancel_time > 0);
  assert.equal((await rpc("PerformTransaction", { id: t })).error.code, -31008);
  assert.equal((await pay(id)).status, "pending");                                        // buyurtma yana to‘lanishi mumkin
});

test("Payme: to‘lash → obuna faol, takror Perform, qaytarish → obuna yopiladi; hisobot va fiskal chek (2-ssenariy)", opts, async () => {
  const c = await reg("p2@test.uz"), id = await order(c), t = txid(), t0 = Date.now();
  const page = await (await c.get(`/tolov/${id}`)).text();
  const link = /https:\/\/test\.paycom\.uz\/([A-Za-z0-9+/=]+)/.exec(page);
  assert.match(Buffer.from(link[1], "base64").toString(), new RegExp(`^m=587f72c72cac0d162c722ae2;ac\\.order_id=${id};a=14900000;l=uz;c=http`));
  assert.match(page, /my\.click\.uz\/services\/pay\/\?service_id=31/);
  await create(t, id, 149000);
  assert.equal((await c.json(`/api/payments/${id}`)).processing, true);
  const [a, b] = await Promise.all([rpc("PerformTransaction", { id: t }), rpc("PerformTransaction", { id: t })]);      // bir vaqtda ikki so‘rov
  assert.deepEqual(a.result, b.result); assert.equal(a.result.state, 2);
  assert.equal((await pay(id)).status, "paid"); assert.equal((await pay(id)).method, "payme");
  const s = await sub(id); assert.equal(s.status, "active"); assert.ok(days(s) >= 28 && days(s) <= 31);
  assert.ok((await rpc("CheckPerformTransaction", { amount: 14900000, account: { order_id: String(id) } })).error.code <= -31050);
  assert.ok((await create(txid(), id, 149000)).error.code <= -31050);
  assert.match(await (await c.get(`/tolov/${id}`)).text(), /To‘lov qabul qilindi/);
  const st = (await rpc("GetStatement", { from: t0 - 1000, to: Date.now() + 1000 })).result.transactions.find(x => x.id === t);
  assert.equal(st.amount, 14900000); assert.equal(st.state, 2); assert.equal(st.account.order_id, String(id));
  assert.deepEqual((await rpc("GetStatement", { from: 1, to: 2 })).result.transactions, []);
  assert.equal((await rpc("SetFiscalData", { id: t, type: "PERFORM", fiscal_data: { receipt_id: 1, qr_code_url: "https://ofd.soliq.uz/epi?t=1" } })).result.success, true);
  assert.match(await (await c.get(`/tolov/${id}`)).text(), /ofd\.soliq\.uz/);
  assert.equal((await rpc("SetFiscalData", { id: txid(), type: "PERFORM", fiscal_data: {} })).error.code, -32001);
  // Qaytarish (Payme kabinetidan)
  const r1 = await rpc("CancelTransaction", { id: t, reason: 5 }), r2 = await rpc("CancelTransaction", { id: t, reason: 5 });
  assert.equal(r1.result.state, -2); assert.deepEqual(r1.result, r2.result);
  assert.equal((await pay(id)).status, "refunded"); assert.equal((await sub(id)).status, "cancelled");
  assert.ok((await rpc("CheckTransaction", { id: t })).result.perform_time > 0);
});

test("Payme: 12 soatdan keyin tranzaksiya yopiladi va yangi to‘lov ochiladi", opts, async () => {
  const c = await reg("p3@test.uz"), id = await order(c), t = txid();
  assert.equal((await create(txid(), id, 149000, Date.now() - 13 * 3600e3)).error.code, -31008);
  await create(t, id, 149000);
  await db.q("update pay_tx set ext_time = $2 where ext_id = $1", [t, Date.now() - 13 * 3600e3]);
  assert.equal((await rpc("PerformTransaction", { id: t })).error.code, -31008);
  const s = (await rpc("CheckTransaction", { id: t })).result; assert.equal(s.state, -1); assert.equal(s.reason, 4);
  assert.equal((await create(txid(), id, 149000)).result.state, 1);
});

const clickReq = async (step, o, secret = "click-secret") => {
  const b = { click_trans_id: "", service_id: "31", click_paydoc_id: "777", merchant_trans_id: "", amount: "149000.00", action: step === "prepare" ? "0" : "1", error: "0", error_note: "Success", sign_time: "2026-11-25 10:00:00", ...o };
  b.sign_string = createHash("md5").update([b.click_trans_id, b.service_id, secret, b.merchant_trans_id, ...(step === "complete" ? [b.merchant_prepare_id] : []), b.amount, b.action, b.sign_time].join("")).digest("hex");
  if (o.sign_string) b.sign_string = o.sign_string;
  const r = await fetch(`${base}/api/pay/click/${step}`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(b) });
  assert.equal(r.status, 200); return r.json();
};
test("Click: imzo, summa, Prepare → Complete, takror, bekor qilish, parallel", opts, async () => {
  const c = await reg("k1@test.uz"), id = String(await order(c)), tr = { click_trans_id: "5001", merchant_trans_id: id };
  assert.equal((await clickReq("prepare", tr, "xato")).error, -1);
  assert.equal((await clickReq("prepare", { ...tr, sign_string: "0" })).error, -1);
  assert.equal((await clickReq("prepare", { ...tr, service_id: "32" })).error, -1);
  assert.equal((await clickReq("prepare", { ...tr, action: "1" })).error, -3);
  assert.equal((await clickReq("prepare", { ...tr, amount: "1.00" })).error, -2);
  assert.equal((await clickReq("prepare", { ...tr, merchant_trans_id: "999999" })).error, -5);
  const p = await clickReq("prepare", tr), p2 = await clickReq("prepare", tr);
  assert.equal(p.error, 0); assert.equal(p.merchant_prepare_id, p2.merchant_prepare_id); assert.equal(p.click_trans_id, 5001);
  assert.equal((await clickReq("prepare", { ...tr, click_trans_id: "5002" })).error, -8);                  // ikkinchi oynadan to‘lash — pul ikki marta yechilmaydi
  assert.equal((await create(txid(), id, 149000)).error.code, -31008);                                     // Payme bilan ham
  assert.equal((await clickReq("complete", { ...tr, merchant_prepare_id: "1234567" })).error, -6);
  const done = { ...tr, merchant_prepare_id: String(p.merchant_prepare_id) };
  const [a, b] = await Promise.all([clickReq("complete", done), clickReq("complete", done)]);
  assert.deepEqual([a.error, b.error].sort(), [-4, 0].sort());
  assert.equal((await clickReq("complete", done)).error, -4);
  assert.equal((await clickReq("prepare", tr)).error, -4);
  assert.equal((await pay(id)).method, "click"); assert.equal((await sub(id)).status, "active");
  assert.equal((await db.one("select count(*)::int n from audit_log where target = $1 and action = 'payment.paid'", [`payment:${id}`])).n, 1);
  // Click xato bilan yakunlasa — buyurtma ochiq qoladi, keyingi urinish ishlaydi
  const d = await reg("k2@test.uz"), id2 = String(await order(d)), q1 = { click_trans_id: "6001", merchant_trans_id: id2 }, pr = await clickReq("prepare", q1);
  assert.equal((await clickReq("complete", { ...q1, merchant_prepare_id: String(pr.merchant_prepare_id), error: "-5017" })).error, -9);
  assert.equal((await clickReq("complete", { ...q1, merchant_prepare_id: String(pr.merchant_prepare_id) })).error, -9);
  assert.equal((await pay(id2)).status, "pending");
  assert.equal((await clickReq("prepare", { ...q1, click_trans_id: "6002" })).error, 0);
});

test("Obuna: davrlar, uzaytirish oxiriga qo‘shiladi, takror buyurtma yo‘q, birovning buyurtmasi ko‘rinmaydi, bekor qilish", opts, async () => {
  const c = await reg("s1@test.uz"), other = await reg("s2@test.uz");
  const ids = await Promise.all([order(c, "pro", 3), order(c, "pro", 3)]);
  assert.equal(ids[0], ids[1]);                                                            // ikki marta bosish — bitta buyurtma
  assert.equal(Number((await pay(ids[0])).amount), 447000);
  assert.equal(await order(c, "pro", 12), ids[0]); assert.equal(Number((await pay(ids[0])).amount), 1788000);
  for (const m of [0, 2, -1, 1.5, "x"]) assert.equal((await c.post("/api/subscriptions", { plan: "pro", months: m })).status, 400);
  assert.equal((await c.post("/api/subscriptions", { plan: "bepul" })).status, 400);
  assert.equal((await other.get(`/tolov/${ids[0]}`)).status, 404); assert.equal((await other.get(`/api/payments/${ids[0]}`)).status, 404);
  assert.equal((await other.post(`/api/payments/${ids[0]}/cancel`)).status, 404); assert.equal((await other.get(`/tolov/${ids[0]}/hisob-faktura`)).status, 404);
  const pdf = await c.get(`/tolov/${ids[0]}/hisob-faktura`); assert.equal(pdf.headers.get("content-type"), "application/pdf"); assert.equal(Buffer.from(await pdf.arrayBuffer()).subarray(0, 4).toString(), "%PDF");
  const t = txid(); await create(t, ids[0], 1788000);
  assert.equal((await c.post("/api/subscriptions", { plan: "pro", months: 1 })).status, 409);       // to‘lanayotgan buyurtma summasi o‘zgarmaydi
  assert.equal((await c.post(`/api/payments/${ids[0]}/cancel`)).status, 409);
  await rpc("PerformTransaction", { id: t });
  const d1 = days(await sub(ids[0])); assert.ok(d1 >= 364 && d1 <= 366, String(d1));
  const again = await order(c, "pro", 1); assert.notEqual(again, ids[0]);
  const t2 = txid(); await create(t2, again, 149000); await rpc("PerformTransaction", { id: t2 });
  const d2 = days(await sub(again)); assert.ok(d2 - d1 >= 28 && d2 - d1 <= 31, `${d1} → ${d2}`);
  await rpc("CancelTransaction", { id: t2, reason: 5 });
  const s = await sub(again); assert.equal(s.status, "active"); assert.ok(Math.abs(days(s) - d1) <= 1);                 // faqat qaytarilgan oy ayiriladi
  // Fuqaro: rol faqat to‘lagandan keyin o‘zgaradi
  const f = await reg("f1@test.uz", "citizen"), fid = await order(f);
  assert.equal((await f.json("/api/me")).user.role, "citizen");
  assert.equal((await f.post(`/api/payments/${fid}/cancel`)).status, 200); assert.equal((await pay(fid)).status, "cancelled");
  const f2 = await order(f), t3 = txid(); await create(t3, f2, 149000); await rpc("PerformTransaction", { id: t3 });
  assert.equal((await f.json("/api/me")).user.role, "lawyer");
});

test("Admin: narx belgilash, bankdan tasdiqlash, to‘lanayotganini tasdiqlay olmaydi, qaytarish, jurnal", opts, async () => {
  const boss = await reg("boss@test.uz", "citizen"), o = await reg("o1@test.uz", "org", { orgName: "«Sinov» MChJ" });
  const id = await order(o, "org"); assert.equal(Number((await pay(id)).amount), 0);
  assert.ok((await create(txid(), id, 0)).error);                                          // narxsiz buyurtma to‘lanmaydi
  assert.equal((await boss.post(`/api/admin/payment/${id}/price`, { amount: "2 000 000" })).status, 200);
  const t = txid(); assert.equal((await create(t, id, 2000000)).result.state, 1);
  assert.equal((await boss.post(`/api/admin/payment/${id}/confirm`)).status, 409);
  await rpc("CancelTransaction", { id: t, reason: 1 });
  assert.equal((await boss.post(`/api/admin/payment/${id}/confirm`)).status, 200);
  assert.equal((await boss.post(`/api/admin/payment/${id}/confirm`)).status, 409);
  assert.equal((await sub(id)).status, "active");
  assert.equal((await boss.post(`/api/admin/payment/${id}/refund`)).status, 200); assert.equal((await sub(id)).status, "cancelled");
  assert.equal((await o.post(`/api/admin/payment/${id}/confirm`)).status, 403);
  const j = await (await boss.get("/admin?b=jurnal")).text(); assert.match(j, /admin\.payment\.confirm/);
  assert.match(await (await boss.get("/admin?b=daromad")).text(), /payme, click, bank/);
  const fetchOk = async (u, i) => { assert.match(u, /payment\/reversal\/31\/777$/); assert.equal(i.method, "DELETE"); assert.match(i.headers.Auth, /^5:[0-9a-f]{40}:\d{10}$/); return { json: async () => ({ error_code: 0 }) }; };
  process.env.CLICK_MERCHANT_USER_ID = "5"; await billing.clickReversal("777", fetchOk);
  await assert.rejects(billing.clickReversal("777", async () => ({ json: async () => ({ error_code: -1 }) })));
});

test("E-pochta va parol: havola bir martalik, sessiyalar yopiladi, mavjud bo‘lmagan hisob sezilmaydi", opts, async () => {
  const c = await reg("e1@test.uz", "citizen"); await new Promise(r => setTimeout(r, 200));
  const v = mails.find(m => m.to === "e1@test.uz" && m.kind === "verify"), tok = new URL(v.link).searchParams.get("t");
  assert.match(await (await c.get(`/tasdiqlash?t=${tok}`)).text(), /Tasdiqlayman/);
  assert.equal((await c.post("/api/auth/confirm", { token: tok })).status, 200); assert.equal((await c.post("/api/auth/confirm", { token: tok })).status, 400);
  assert.match(await (await c.get("/xavfsizlik")).text(), /Tasdiqlangan/);
  const anon = client(), a = await anon.post("/api/auth/forgot", { email: "E1@test.uz" }), b = await anon.post("/api/auth/forgot", { email: "yoq@test.uz" });
  assert.deepEqual([a.status, await a.text()], [b.status, await b.text()]); await new Promise(r => setTimeout(r, 200));
  assert.ok(!mails.some(m => m.to === "yoq@test.uz"));
  const rt = new URL(mails.find(m => m.kind === "reset").link).searchParams.get("t");
  assert.equal((await anon.post("/api/auth/reset", { token: rt, password: "qisqa" })).status, 400);                  // kuchsiz parol — havola kuymaydi
  assert.equal((await anon.post("/api/auth/reset", { token: rt, password: "YangiParol1" })).status, 200); assert.equal((await anon.post("/api/auth/reset", { token: rt, password: "YangiParol2" })).status, 400);
  assert.equal((await c.get("/xavfsizlik")).status, 303);                                                               // eski sessiya yopildi
  assert.equal((await anon.post("/api/auth/login", { email: "e1@test.uz", password: PW })).status, 401); assert.equal((await anon.post("/api/auth/login", { email: "e1@test.uz", password: "YangiParol1" })).status, 200);
  assert.ok(!(await db.q("select id from user_tokens")).rows.some(r => r.id === rt));
});

test("2FA: yoqish, kirishda kod talab qilinadi, kod va zaxira kod bir martalik, o‘chirish", opts, async () => {
  const c = await reg("t1@test.uz", "citizen");
  assert.equal((await c.post("/api/auth/2fa/start", { password: "xato" })).status, 401);
  const { secret, uri } = await c.json("/api/auth/2fa/start", { password: PW });
  assert.match(uri, /^otpauth:\/\/totp\//); assert.match((await db.one("select totp_secret from users where email = 't1@test.uz'")).totp_secret, /^g:/);     // bazada shifrlangan
  assert.equal((await c.post("/api/auth/2fa/enable", { code: "000000" })).status, 400);
  const { codes } = await c.json("/api/auth/2fa/enable", { code: totp.codeAt(secret, totp.stepNow()) });
  assert.equal(codes.length, 8);
  const l = client(), cred = { email: "t1@test.uz", password: PW };
  const r0 = await l.post("/api/auth/login", cred); assert.equal(r0.status, 401); assert.equal((await r0.json()).need, "code"); assert.equal((await l.get("/hisob")).status, 303);
  assert.equal((await l.post("/api/auth/login", { ...cred, code: "123456" })).status, 401);
  assert.equal((await l.post("/api/auth/login", { ...cred, code: totp.codeAt(secret, totp.stepNow()) })).status, 401);        // yoqishda ishlatilgan kod takror o‘tmaydi
  assert.equal((await l.post("/api/auth/login", { ...cred, code: totp.codeAt(secret, totp.stepNow() + 1) })).status, 200);
  const l2 = client(); assert.equal((await l2.post("/api/auth/login", { ...cred, code: codes[0] })).status, 200); assert.equal((await client().post("/api/auth/login", { ...cred, code: codes[0] })).status, 401);
  // Qurilmalar
  const ref = /sessions\/([0-9a-f]{16})\/end/.exec(await (await l.get("/xavfsizlik")).text())[1];
  assert.equal((await l.post(`/api/auth/sessions/${ref}/end`)).status, 200); await l.post("/api/auth/sessions/others/end"); assert.equal((await l2.get("/hisob")).status, 303); assert.equal((await l.get("/hisob")).status, 200);
  assert.equal((await l.post("/api/auth/2fa/disable", { password: PW, code: codes[1] })).status, 200);
  assert.equal((await client().post("/api/auth/login", cred)).status, 200);
});

test("Production: ADMIN_EMAILS bilan ro‘yxatdan o‘tgan odam tasdiqlamaguncha admin emas; admin paneli 2FA talab qiladi", opts, async () => {
  process.env.NODE_ENV = "production"; process.env.ADMIN_EMAILS = "boss@test.uz,yangi-admin@test.uz"; process.env.PUBLIC_HOST = "127.0.0.1";
  try {
    const c = await reg("yangi-admin@test.uz", "citizen"); await new Promise(r => setTimeout(r, 200));
    assert.equal((await c.json("/api/me")).user.role, "citizen");
    await c.post("/api/auth/login", { email: "yangi-admin@test.uz", password: PW }); assert.equal((await c.json("/api/me")).user.role, "citizen");
    const tok = new URL(mails.findLast(m => m.to === "yangi-admin@test.uz").link).searchParams.get("t");
    await c.post("/api/auth/confirm", { token: tok }); assert.equal((await c.json("/api/me")).user.role, "admin");
    const r = await c.get("/admin"); assert.equal(r.status, 303); assert.match(r.headers.get("location"), /^\/xavfsizlik/);
    assert.equal((await c.post("/api/admin/user/1/role", { role: "admin" })).status, 403);
    const { secret } = await c.json("/api/auth/2fa/start", { password: PW }); await c.post("/api/auth/2fa/enable", { code: totp.codeAt(secret, totp.stepNow()) });
    assert.equal((await c.get("/admin")).status, 200);
  } finally { delete process.env.NODE_ENV; delete process.env.PUBLIC_HOST; process.env.ADMIN_EMAILS = "boss@test.uz"; }
});

test("Jamoa: taklif, o‘rin chegarasi, umumiy kartoteka (409), a’zo chiqishi, begonaga yopiq", opts, async () => {
  const own = await reg("own@test.uz"), m = await reg("mem@test.uz"), x = await reg("begona@test.uz");
  assert.equal((await own.post("/api/team/invite", { email: "mem@test.uz" })).status, 403);
  const id = await order(own, "firma"), t = txid(); await create(t, id, 490000); await rpc("PerformTransaction", { id: t });
  const inv = await own.json("/api/team/invite", { email: "mem@test.uz" }); assert.match(inv.link, /^\/jamoa\/taklif\?t=/); assert.equal(inv.sent, true);
  assert.equal((await own.post("/api/team/invite", { email: "uchinchi@test.uz" })).status, 409);                     // 2 o‘rin: egasi + 1 taklif
  const tok = new URLSearchParams(inv.link.split("?")[1]).get("t");
  assert.equal((await x.post("/api/team/accept", { token: tok })).status, 403);                                       // boshqa e-pochta
  assert.equal((await m.post("/api/team/accept", { token: tok })).status, 200); assert.equal((await m.post("/api/team/accept", { token: tok })).status, 400);
  await db.q("delete from subscriptions where user_id = (select id from users where email = 'mem@test.uz')");
  assert.equal((await m.get("/kabinet")).status, 200);                                                                  // egasining Firma tarifi a’zoga ham Pro beradi
  assert.equal((await m.post("/api/subscriptions", { plan: "firma" })).status, 403);
  const data = { v: 1, clients: [{ id: "1", name: "A" }], cases: [], templates: [], org: { name: "", docs: [] } };
  assert.equal((await own.json("/api/team/cabinet", { data, version: 0 })).version, 1);
  const g = await m.json("/api/team/cabinet"); assert.equal(g.data.clients[0].name, "A"); assert.equal(g.members.length, 2);
  assert.equal((await m.json("/api/team/cabinet", { data, version: 1 })).version, 2); assert.equal((await own.post("/api/team/cabinet", { data, version: 1 })).status, 409);
  assert.equal((await x.get("/api/team/cabinet")).status, 402);
  const mid = (await db.one("select id from users where email = 'mem@test.uz'")).id, oid = (await db.one("select id from users where email = 'own@test.uz'")).id;
  assert.equal((await x.post(`/api/team/members/${mid}/remove`)).status, 403); assert.equal((await m.post(`/api/team/members/${oid}/remove`)).status, 403);
  assert.equal((await own.post(`/api/team/members/${mid}/remove`)).status, 200); assert.equal((await m.get("/api/team/cabinet")).status, 402);
});

test("Kabinet: eski nusxa yangisini o‘chirib yubormaydi (409)", opts, async () => {
  const c = await reg("cab@test.uz"), data = { v: 1, clients: [], cases: [] };
  const a = await c.json("/api/cabinet", { data, base: null }); assert.ok(a.updatedAt);
  assert.equal((await c.post("/api/cabinet", { data, base: null })).status, 409);
  assert.equal((await c.post("/api/cabinet", { data, base: a.updatedAt })).status, 200); assert.equal((await c.post("/api/cabinet", { data, base: a.updatedAt })).status, 409);
});

test("Davriy vazifalar va hisobni o‘chirish", opts, async () => {
  const c = await reg("j1@test.uz"), id = await order(c), t = txid(); await create(t, id, 149000); await rpc("PerformTransaction", { id: t });
  await db.q("update subscriptions set ends_at = now() - interval '1 minute' where id = (select subscription_id from payments where id = $1)", [id]);
  const c2 = await reg("j2@test.uz"), id2 = await order(c2); await db.q("update payments set created_at = now() - interval '15 days' where id = $1", [id2]);
  const r = await jobs.runJobs(); assert.ok(r.subs >= 1 && r.orders >= 1);
  assert.equal((await sub(id)).status, "expired"); assert.equal((await pay(id2)).status, "cancelled"); assert.equal((await sub(id2)).status, "cancelled");
  const ex = await (await c.get("/malumotlarim")).json(); assert.equal(ex.payments.length, 1); assert.ok(!JSON.stringify(ex).includes("scrypt"));
  assert.equal((await c.post("/api/account/delete", { password: "xato" })).status, 401); assert.equal((await c.post("/api/account/delete", { password: PW })).status, 200);
  assert.equal((await c.get("/hisob")).status, 303); const p = await pay(id); assert.equal(p.user_id, null); assert.equal(p.status, "paid");      // moliya yozuvi shaxssiz qoladi
});

test("TOTP: RFC 6238 nazorat qiymatlari", () => import("../server/totp.js").then(t => {
  const s = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";                                             // «12345678901234567890»
  for (const [sec, code] of [[59, "287082"], [1111111109, "081804"], [1234567890, "005924"], [2000000000, "279037"]]) assert.equal(t.codeAt(s, Math.floor(sec / 30)), code);
  assert.match(t.newSecret(), /^[A-Z2-7]{32}$/);
}));
