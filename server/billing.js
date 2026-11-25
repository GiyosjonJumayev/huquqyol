// To‘lovlar yadrosi: buyurtma (payments) → provayder tranzaksiyasi (pay_tx) → obuna uzaytirish yoki komissiya yopish.
// Qoidalar:
//  • pul holati faqat shu yerda o‘zgaradi (settle / reverse), har doim tranzaksiya ichida va buyurtma qatori qulflangan holda;
//  • settle idempotent: bitta buyurtma ikki marta hisobga olinmaydi (Payme ham, Click ham so‘rovni takrorlaydi);
//  • bitta buyurtmada bir vaqtda faqat bitta ochiq tranzaksiya bo‘ladi; karta ma’lumoti serverimizga umuman kelmaydi.
import { q, one, tx } from "./db.js";
import { clean, ValidationError } from "./validate.js";

const err = (key, status = 400, vars) => Object.assign(new ValidationError(key, vars), { status });
const price = (name, def) => { const n = Number(process.env[name]); return Number.isFinite(n) && n > 0 ? Math.round(n) : def; };
export const PRICES = { pro: price("PRICE_PRO", 149000), firma: price("PRICE_FIRMA", 490000), org: 0 };
export const SEATS = { pro: 1, firma: price("FIRMA_SEATS", 5), org: price("ORG_SEATS", 20) };
export const PERIODS = [1, 3, 12];
const pctOf = m => { const n = Number(process.env[`PLAN_DISCOUNT_${m}`]); return Number.isFinite(n) && n > 0 && n < 90 ? n : 0; };
/** Davr narxi, so‘m: oylik × oylar − chegirma (PLAN_DISCOUNT_3 / PLAN_DISCOUNT_12, standart 0). */
export const planAmount = (plan, months) => Math.round(PRICES[plan] * months * (100 - pctOf(months)) / 100);
export const discountOf = pctOf;

// Provayderlar: kalitlari to‘liq berilgandagina yoqiladi
const env = k => (process.env[k] || "").trim();
export const payme = () => env("PAYME_MERCHANT_ID") && env("PAYME_KEY") ? { merchant: env("PAYME_MERCHANT_ID"), key: env("PAYME_KEY"), test: env("PAYME_TEST") === "1" } : null;
export const click = () => env("CLICK_SERVICE_ID") && env("CLICK_MERCHANT_ID") && env("CLICK_SECRET_KEY")
  ? { service: env("CLICK_SERVICE_ID"), merchant: env("CLICK_MERCHANT_ID"), secret: env("CLICK_SECRET_KEY"), user: env("CLICK_MERCHANT_USER_ID") } : null;
export const company = () => ({ name: env("COMPANY_NAME"), inn: env("COMPANY_INN"), address: env("COMPANY_ADDRESS"), bank: env("COMPANY_BANK"), account: env("COMPANY_ACCOUNT"), mfo: env("COMPANY_MFO"), phone: env("COMPANY_PHONE"), email: env("COMPANY_EMAIL") });
export const bankTransfer = () => { const c = company(); return !!(c.name && c.inn && c.account && c.mfo); };
export const providers = () => [payme() && "payme", click() && "click", bankTransfer() && "bank"].filter(Boolean);

// ---------- Tashqi to‘lov sahifasi havolalari ----------
const baseUrl = req => env("PUBLIC_HOST") ? `https://${env("PUBLIC_HOST")}` : `${req.protocol}://${req.get("host")}`;
export function payLinks(p, req, lang = "uz"){
  const back = `${baseUrl(req)}/tolov/${p.id}`, out = {}, pm = payme(), ck = click();
  if (pm){
    const s = `m=${pm.merchant};ac.order_id=${p.id};a=${Number(p.amount) * 100};l=${lang === "ru" ? "ru" : "uz"};c=${back}`;
    out.payme = `${pm.test ? "https://test.paycom.uz" : "https://checkout.paycom.uz"}/${Buffer.from(s).toString("base64")}`;
  }
  if (ck) out.click = "https://my.click.uz/services/pay/?" + new URLSearchParams({ service_id: ck.service, merchant_id: ck.merchant, amount: Number(p.amount).toFixed(2), transaction_param: String(p.id), return_url: back });
  return out;
}

// ---------- Buyurtma ----------
export const TX_TTL = { payme: 12 * 3600e3, click: 30 * 60e3 };          // ochiq tranzaksiya umri (Payme hujjati: 12 soat)
export async function lockPayment(run, id){
  if (!/^\d{1,15}$/.test(String(id))) return null;
  return (await run("select * from payments where id = $1 for update", [id])).rows[0] || null;
}
/** Muddati o‘tgan ochiq tranzaksiyalarni yopadi; hali ochig‘i bo‘lsa — o‘shani qaytaradi (buyurtma qulflangan bo‘lishi kerak). */
export async function openTx(run, paymentId, now = Date.now()){
  const rows = (await run("select * from pay_tx where payment_id = $1 and state = 1 order by id for update", [paymentId])).rows;
  let open = null;
  for (const t of rows){
    if (now - Number(t.ext_time) > TX_TTL[t.provider]) await run("update pay_tx set state = -1, reason = 4, cancel_time = $2 where id = $1", [t.id, now]);
    else open = t;
  }
  return open;
}

/** To‘lov qabul qilindi. Idempotent: to‘langan buyurtmada false. */
export async function settle(run, p, method){
  if (p.status !== "pending") return false;
  await run("update payments set status = 'paid', paid_at = now(), method = $2 where id = $1", [p.id, method]);
  if (p.subscription_id && p.kind === "subscription"){
    const s = (await run("select * from subscriptions where id = $1 for update", [p.subscription_id])).rows[0];
    let orgId = s.org_id;
    // Firma / tashkilot — jamoa: tashkilot yozuvi bo‘lmasa yaratiladi, to‘lovchi — egasi
    if (s.plan !== "pro"){
      const u = (await run("select id, name, org_id from users where id = $1 for update", [s.user_id])).rows[0];
      orgId = u.org_id;
      if (!orgId){
        const prof = (await run("select firm from lawyer_profiles where user_id = $1", [u.id])).rows[0];
        orgId = (await run("insert into organizations(name, kind, created_by) values ($1, $2, $3) returning id", [prof?.firm || u.name, s.plan === "firma" ? "firma" : "boshqa", u.id])).rows[0].id;
        await run("update users set org_id = $1, org_role = 'owner' where id = $2", [orgId, u.id]);
      }
    }
    await run(`update subscriptions set status = 'active', org_id = $2, price = $3,
        started_at = case when status = 'active' and ends_at > now() then started_at else now() end,
        ends_at = greatest(now(), case when status = 'active' then coalesce(ends_at, now()) else now() end) + make_interval(months => $4),
        reminded_at = null where id = $1`, [s.id, orgId, Math.round(Number(p.amount) / p.months), p.months]);
    await run("update subscriptions set status = 'expired', ends_at = least(ends_at, now()) where user_id = $1 and status = 'trial' and plan = $2", [s.user_id, s.plan]);
    // Fuqaro faqat to‘lagandan keyin yurist / tashkilot hisobiga o‘tadi
    await run("update users set role = $2 where id = $1 and role = 'citizen'", [s.user_id, s.plan === "org" ? "org" : "lawyer"]);
  }
  await audit(run, { userId: p.user_id, action: "payment.paid", target: `payment:${p.id}`, data: { amount: Number(p.amount), method } });
  return true;
}
/** To‘lov qaytarildi (provayder yoki admin): obunaning shu to‘lov bergan davri ayiriladi. */
export async function reverse(run, p, method){
  if (p.status !== "paid") return false;
  await run("update payments set status = 'refunded', refunded_at = now() where id = $1", [p.id]);
  if (p.subscription_id && p.kind === "subscription")
    await run(`update subscriptions set ends_at = ends_at - make_interval(months => $2),
      status = case when ends_at - make_interval(months => $2) <= now() then 'cancelled' else status end where id = $1`, [p.subscription_id, p.months]);
  await audit(run, { userId: p.user_id, action: "payment.refunded", target: `payment:${p.id}`, data: { amount: Number(p.amount), method } });
  return true;
}

// ---------- Jurnal (kim, qachon, nima qildi) ----------
export const audit = (run, { userId = null, action, target = null, data = null, ip = null }) =>
  run("insert into audit_log(user_id, action, target, data, ip) values ($1, $2, $3, $4, $5)", [userId, action, target, data ? JSON.stringify(data) : null, ip]);

// ---------- Obunaga buyurtma ----------
export async function subscribe(req, res){
  const plan = ["pro", "firma", "org"].includes(req.body?.plan) ? req.body.plan : null;
  const months = req.body?.months == null ? 1 : Number(req.body.months);
  if (!plan || !PERIODS.includes(months)) throw err("option", 400, { label: "Tarif" });
  if (plan !== "pro" && req.user.org_role === "member") throw err("orgMember", 403);                 // jamoa a’zosi uchun tarifni egasi to‘laydi
  const r = await tx(async run => {
    await run("select id from users where id = $1 for update", [req.user.id]);            // bir vaqtda ikki bosish — bitta buyurtma
    let s = (await run(`select * from subscriptions where user_id = $1 and plan = $2 and (status = 'pending' or (status = 'active' and (ends_at is null or ends_at > now())))
      order by (status = 'active') desc, id desc limit 1`, [req.user.id, plan])).rows[0];
    if (!s) s = (await run("insert into subscriptions(user_id, org_id, plan, status, price) values ($1,$2,$3,'pending',$4) returning *", [req.user.id, req.user.org_id || null, plan, PRICES[plan]])).rows[0];
    const old = (await run("select * from payments where subscription_id = $1 and kind = 'subscription' and status = 'pending' order by id desc limit 1 for update", [s.id])).rows[0];
    const amount = planAmount(plan, months);
    if (old){
      if (plan !== "org" && (old.months !== months || Number(old.amount) !== amount)){
        if (await openTx(run, old.id)) throw err("payBusy", 409);
        await run("update payments set months = $2, amount = $3, note = $4 where id = $1", [old.id, months, amount, `Obuna: ${plan}, ${months} oy`]);
      }
      return { id: old.id, created: false };
    }
    const p = (await run(`insert into payments(user_id, subscription_id, kind, amount, months, status, note) values ($1,$2,'subscription',$3,$4,'pending',$5) returning id`,
      [req.user.id, s.id, amount, months, plan === "org" ? "Narx kelishuv bo‘yicha belgilanadi" : `Obuna: ${plan}, ${months} oy`])).rows[0];
    return { id: p.id, created: true };
  });
  res.status(r.created ? 201 : 200).json({ ok: true, id: Number(r.id), next: `/tolov/${r.id}` });
}
export async function mySubscriptions(userId){
  return (await q("select * from subscriptions where user_id = $1 order by created_at desc", [userId])).rows;
}
export async function myPayments(userId){
  return (await q(`select p.*, s.plan from payments p left join subscriptions s on s.id = p.subscription_id where p.user_id = $1 order by p.id desc limit 100`, [userId])).rows;
}
export const getPayment = (id, userId) => /^\d{1,15}$/.test(String(id))
  ? one(`select p.*, s.plan, s.ends_at as sub_ends from payments p left join subscriptions s on s.id = p.subscription_id where p.id = $1 and p.user_id = $2`, [id, userId]) : null;
export async function paymentStatus(req, res){
  const p = await getPayment(req.params.id, req.user.id);
  if (!p) throw err("notFound", 404);
  const t = await one("select state from pay_tx where payment_id = $1 order by id desc limit 1", [p.id]);
  res.set("Cache-Control", "no-store").json({ status: p.status, processing: p.status === "pending" && t?.state === 1 });
}
/** Foydalanuvchi to‘lanmagan buyurtmani bekor qiladi. */
export async function cancelOrder(req, res){
  await tx(async run => {
    const p = await lockPayment(run, req.params.id);
    if (!p || Number(p.user_id) !== req.user.id || p.kind !== "subscription") throw err("notFound", 404);
    if (p.status !== "pending") throw err("badState", 409);
    if (await openTx(run, p.id)) throw err("payBusy", 409);
    await run("update payments set status = 'cancelled' where id = $1", [p.id]);
    await run("update subscriptions set status = 'cancelled' where id = $1 and status = 'pending'", [p.subscription_id]);
  });
  res.json({ ok: true, next: "/hisob/tolovlar" });
}

// ---------- Admin: qo‘lda tasdiqlash, narx, bekor qilish, qaytarish ----------
const int = v => { const n = Math.round(Number(String(v ?? "").replace(/[^\d]/g, ""))); return Number.isSafeInteger(n) && n >= 0 && n <= 1e10 ? n : null; };
export async function adminPayment(act, id, req){
  let after = null;
  await tx(async run => {
    const p = await lockPayment(run, id);
    if (!p) throw err("notFound", 404);
    if (act === "confirm"){
      if (p.status !== "pending") throw err("badState", 409);
      if (await openTx(run, p.id)) throw err("payBusy", 409);                          // hozir Payme/Click orqali to‘lanmoqda
      const amount = p.kind === "subscription" && req.body?.amount != null && req.body.amount !== "" ? int(req.body.amount) : Number(p.amount);
      if (!amount) throw err("num", 400, { label: "Summa" });
      await run("update payments set amount = $2 where id = $1", [p.id, amount]);
      await settle(run, { ...p, amount }, clean(req.body?.method, 40) || "bank");
    } else if (act === "price"){                                                       // kelishuv asosidagi narx → endi onlayn to‘lash mumkin
      const amount = int(req.body?.amount), months = Number(req.body?.months || 1);
      if (p.status !== "pending" || p.kind !== "subscription") throw err("badState", 409);
      if (!amount || !PERIODS.includes(months)) throw err("num", 400, { label: "Summa" });
      if (await openTx(run, p.id)) throw err("payBusy", 409);
      await run("update payments set amount = $2, months = $3 where id = $1", [p.id, amount, months]);
    } else if (act === "cancel"){
      if (p.status !== "pending") throw err("badState", 409);
      if (await openTx(run, p.id)) throw err("payBusy", 409);
      await run("update payments set status = 'cancelled' where id = $1", [p.id]);
      if (p.subscription_id) await run("update subscriptions set status = 'cancelled' where id = $1 and status = 'pending'", [p.subscription_id]);
    } else if (act === "refund"){
      if (p.status !== "paid") throw err("badState", 409);
      if (p.method === "payme") throw err("refundPayme", 409);                         // Payme qaytarishi faqat Payme Business kabinetidan (CancelTransaction keladi)
      if (p.method === "click"){
        const t = (await run("select * from pay_tx where payment_id = $1 and provider = 'click' and state = 2", [p.id])).rows[0];
        if (!t) throw err("badState", 409);
        await clickReversal(t.paydoc_id);                                              // xato bo‘lsa — hech narsa o‘zgarmaydi
        await run("update pay_tx set state = -2, reason = 5, cancel_time = $2 where id = $1", [t.id, Date.now()]);
      }
      await reverse(run, p, "admin");
    } else throw err("option", 404);
    await audit(run, { userId: req.user.id, action: `admin.payment.${act}`, target: `payment:${p.id}`, ip: req.ip });
  });
  return after;
}
export async function clickReversal(paydocId, fetchFn = fetch){
  const c = click();
  if (!c?.user || !paydocId) throw err("refundClick", 409);
  const ts = Math.floor(Date.now() / 1000), { createHash } = await import("node:crypto");
  const digest = createHash("sha1").update(ts + c.secret).digest("hex");
  let d = null;
  try {
    const r = await fetchFn(`https://api.click.uz/v2/merchant/payment/reversal/${encodeURIComponent(c.service)}/${encodeURIComponent(paydocId)}`,
      { method: "DELETE", headers: { Accept: "application/json", "Content-Type": "application/json", Auth: `${c.user}:${digest}:${ts}` }, signal: AbortSignal.timeout(15000) });
    d = await r.json();
  } catch {}
  if (d?.error_code !== 0) throw err("refundClick", 502);
}
