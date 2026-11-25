// Payme Merchant API (JSON-RPC 2.0) va CLICK SHOP API (Prepare / Complete) — provayder serverlari chaqiradigan yo‘llar.
// Hujjatlar: developer.help.paycom.uz (Merchant API), docs.click.uz (SHOP API). Javob kodlari shu hujjatlardagidek.
import { createHash, timingSafeEqual } from "node:crypto";
import { one, q, tx } from "./db.js";
import { payme, click, lockPayment, openTx, settle, reverse, audit, TX_TTL } from "./billing.js";

const same = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && timingSafeEqual(x, y); };

// ================= Payme =================
const M = (uz, ru, en) => ({ uz, ru, en });
const E = {
  method: { code: -32300, message: M("Faqat POST", "Только POST", "POST only") },
  parse: { code: -32700, message: M("JSON xato", "Ошибка JSON", "Parse error") },
  invalid: { code: -32600, message: M("So‘rov noto‘g‘ri", "Неверный запрос", "Invalid request") },
  unknown: { code: -32601, message: M("Metod topilmadi", "Метод не найден", "Method not found") },
  auth: { code: -32504, message: M("Ruxsat yetarli emas", "Недостаточно привилегий", "Insufficient privileges") },
  system: { code: -32400, message: M("Tizim xatosi", "Системная ошибка", "System error") },
  amount: { code: -31001, message: M("Summa noto‘g‘ri", "Неверная сумма", "Incorrect amount") },
  noTx: { code: -31003, message: M("Tranzaksiya topilmadi", "Транзакция не найдена", "Transaction not found") },
  noCancel: { code: -31007, message: M("Bekor qilib bo‘lmaydi", "Отменить нельзя", "Unable to cancel") },
  noPerform: { code: -31008, message: M("Amalni bajarib bo‘lmaydi", "Невозможно выполнить операцию", "Unable to perform") },
  order: { code: -31050, message: M("Buyurtma topilmadi", "Заказ не найден", "Order not found"), data: "order_id" },
  closed: { code: -31051, message: M("Buyurtma to‘langan yoki bekor qilingan", "Заказ оплачен или отменён", "Order is paid or cancelled"), data: "order_id" }
};
class Rpc extends Error { constructor(e, data){ super("rpc"); this.rpc = data === undefined ? e : { ...e, data }; } }
const fail = (e, data) => { throw new Rpc(e, data); };

function authOk(req, cfg){
  const m = /^Basic\s+([A-Za-z0-9+/=]+)$/.exec(req.get("authorization") || "");
  if (!m) return false;
  const s = Buffer.from(m[1], "base64").toString("utf8"), i = s.indexOf(":");
  return i > 0 && s.slice(0, i) === "Paycom" && same(s.slice(i + 1), cfg.key);
}
const ID = v => typeof v === "string" && /^[A-Za-z0-9]{1,64}$/.test(v) ? v : fail(E.invalid);
const TS = v => Number.isSafeInteger(v) && v > 0 ? v : fail(E.invalid);
const orderId = account => { const v = account?.order_id; return (typeof v === "string" || typeof v === "number") && /^\d{1,15}$/.test(String(v)) ? String(v) : null; };
const n = v => Number(v || 0);

function checkOrder(p, amount){
  if (!p) fail(E.order);
  if (p.status !== "pending" || !(Number(p.amount) > 0)) fail(E.closed);
  if (!Number.isSafeInteger(amount) || amount !== Number(p.amount) * 100) fail(E.amount);
}
// Fiskal chek: IKPU kodlari berilgan bo‘lsa, Payme chekni soliq tizimiga shu ma’lumot bilan yuboradi
function detail(p){
  const code = (process.env.FISCAL_IKPU || "").trim(), pack = (process.env.FISCAL_PACKAGE_CODE || "").trim();
  if (!code || !pack) return undefined;
  return { receipt_type: 0, items: [{ title: p.kind === "subscription" ? `HuquqYo‘l obunasi, ${p.months} oy` : "HuquqYo‘l platforma xizmati", price: Number(p.amount) * 100, count: 1, code, package_code: pack, vat_percent: Number(process.env.FISCAL_VAT || 0) }] };
}
const getTx = (run, id) => run("select * from pay_tx where provider = 'payme' and ext_id = $1", [id]).then(r => r.rows[0] || null);
// Tartib doimo bir xil: avval buyurtma, keyin tranzaksiya qulflanadi (o‘zaro qulflanib qolmaslik uchun)
async function lockTx(run, id){
  const t0 = await getTx(run, id);
  if (!t0) fail(E.noTx);
  const p = await lockPayment(run, t0.payment_id);
  return { t: (await run("select * from pay_tx where id = $1 for update", [t0.id])).rows[0], p };
}
const expired = t => Date.now() - n(t.ext_time) > TX_TTL.payme;

const METHODS = {
  async CheckPerformTransaction({ amount, account }){
    const id = orderId(account), p = id && await one("select * from payments where id = $1", [id]);
    checkOrder(p, amount);
    const d = detail(p);
    return { allow: true, ...(d ? { detail: d } : {}) };
  },
  async CreateTransaction({ id, time, amount, account }){
    ID(id); TS(time);
    return commit(async run => {
      const old = await getTx(run, id);
      if (old){
        const { t } = await lockTx(run, id);
        if (t.state !== 1) fail(E.noPerform);
        if (expired(t)){ await run("update pay_tx set state = -1, reason = 4, cancel_time = $2 where id = $1", [t.id, Date.now()]); return new Rpc(E.noPerform); }
        return { create_time: n(t.create_time), transaction: String(t.id), state: 1 };
      }
      const oid = orderId(account), p = oid && await lockPayment(run, oid);
      checkOrder(p, amount);
      if (Date.now() - time > TX_TTL.payme) fail(E.noPerform);
      if (await openTx(run, p.id)) fail(E.noPerform);                                   // bu buyurtma hozir boshqa tranzaksiya bilan to‘lanmoqda
      const now = Date.now();
      const r = (await run(`insert into pay_tx(provider, ext_id, payment_id, amount, state, ext_time, create_time) values ('payme', $1, $2, $3, 1, $4, $5) on conflict (provider, ext_id) do nothing returning id`,
        [id, p.id, p.amount, time, now])).rows[0];
      if (!r) fail(E.system);                                                           // bir vaqtda ikki so‘rov: Payme qayta yuboradi
      return { create_time: now, transaction: String(r.id), state: 1 };
    });
  },
  async PerformTransaction({ id }){
    ID(id);
    return commit(async run => {
      const { t, p } = await lockTx(run, id);
      if (t.state === 2) return { transaction: String(t.id), perform_time: n(t.perform_time), state: 2 };
      if (t.state !== 1) fail(E.noPerform);
      if (expired(t)){ await run("update pay_tx set state = -1, reason = 4, cancel_time = $2 where id = $1", [t.id, Date.now()]); return new Rpc(E.noPerform); }
      if (!await settle(run, p, "payme")) fail(E.noPerform);
      const now = Date.now();
      await run("update pay_tx set state = 2, perform_time = $2 where id = $1", [t.id, now]);
      return { transaction: String(t.id), perform_time: now, state: 2 };
    });
  },
  async CancelTransaction({ id, reason }){
    ID(id);
    return commit(async run => {
      const { t, p } = await lockTx(run, id);
      if (t.state < 0) return { transaction: String(t.id), cancel_time: n(t.cancel_time), state: t.state };
      const now = Date.now(), state = t.state === 2 ? -2 : -1;
      if (t.state === 2) await reverse(run, p, "payme");
      await run("update pay_tx set state = $2, reason = $3, cancel_time = $4 where id = $1", [t.id, state, Number.isInteger(reason) ? reason : null, now]);
      return { transaction: String(t.id), cancel_time: now, state };
    });
  },
  async CheckTransaction({ id }){
    const t = await getTx(q, ID(id));
    if (!t) fail(E.noTx);
    return { create_time: n(t.create_time), perform_time: n(t.perform_time), cancel_time: n(t.cancel_time), transaction: String(t.id), state: t.state, reason: t.reason };
  },
  async GetStatement({ from, to }){
    const rows = (await q("select * from pay_tx where provider = 'payme' and ext_time between $1 and $2 order by ext_time, id", [TS(from), TS(to)])).rows;
    return { transactions: rows.map(t => ({ id: t.ext_id, time: n(t.ext_time), amount: Number(t.amount) * 100, account: { order_id: String(t.payment_id) },
      create_time: n(t.create_time), perform_time: n(t.perform_time), cancel_time: n(t.cancel_time), transaction: String(t.id), state: t.state, reason: t.reason })) };
  },
  async SetFiscalData({ id, type, fiscal_data }){
    if (!["PERFORM", "CANCEL"].includes(type) || !fiscal_data || typeof fiscal_data !== "object") fail({ code: -32602, message: "type / fiscal_data" });
    const url = String(fiscal_data.qr_code_url || ""), data = {};
    for (const k of ["receipt_id", "status_code", "message", "terminal_id", "fiscal_sign", "date"]) if (fiscal_data[k] != null) data[k] = String(fiscal_data[k]).slice(0, 200);
    if (/^https:\/\/[a-z0-9.-]+\//i.test(url) && url.length < 500) data.url = url;
    const r = await q("update pay_tx set fiscal = coalesce(fiscal, '{}'::jsonb) || jsonb_build_object($2::text, $3::jsonb) where provider = 'payme' and ext_id = $1", [ID(id), type.toLowerCase(), JSON.stringify(data)]);
    if (!r.rowCount) fail({ code: -32001, message: "receipt not found" });
    return { success: true };
  }
};
// Rpc qaytarilsa (tashlanmasa) — tranzaksiya saqlanadi, lekin javob xato bo‘ladi (muddati o‘tgan tranzaksiyani yopish uchun)
async function commit(fn){
  const r = await tx(fn);
  if (r instanceof Rpc) throw r;
  return r;
}

/** POST /api/pay/payme — har doim HTTP 200 (hujjat talabi), xato JSON-RPC error ichida. */
export async function paymeWebhook(req, res){
  const send = (body, id = null) => res.status(200).set("Cache-Control", "no-store").json({ jsonrpc: "2.0", id, ...body });
  const cfg = payme();
  if (!cfg) return res.status(404).json({ error: "off" });
  if (req.method !== "POST") return send({ error: E.method });
  if (!authOk(req, cfg)) return send({ error: E.auth });
  let b;
  try { b = JSON.parse(req.body || ""); } catch { return send({ error: E.parse }); }
  const id = Number.isSafeInteger(b?.id) || (typeof b?.id === "string" && b.id.length < 64) ? b.id : null;
  if (!b || typeof b !== "object" || typeof b.method !== "string" || !b.params || typeof b.params !== "object" || Array.isArray(b.params)) return send({ error: E.invalid }, id);
  if (!Object.hasOwn(METHODS, b.method)) return send({ error: { ...E.unknown, data: String(b.method).slice(0, 60) } }, id);
  try { return send({ result: await METHODS[b.method](b.params) }, id); }
  catch (e){
    if (e instanceof Rpc) return send({ error: e.rpc }, id);
    console.error("[payme]", e.message);
    return send({ error: E.system }, id);
  }
}

// ================= CLICK =================
const C = { ok: [0, "Success"], sign: [-1, "SIGN CHECK FAILED!"], amount: [-2, "Incorrect parameter amount"], action: [-3, "Action not found"], paid: [-4, "Already paid"],
  order: [-5, "User does not exist"], noTx: [-6, "Transaction does not exist"], update: [-7, "Failed to update user"], request: [-8, "Error in request from click"], cancelled: [-9, "Transaction cancelled"] };
const md5 = s => createHash("md5").update(s).digest("hex");
export const clickSign = (b, secret, complete) => md5([b.click_trans_id, b.service_id, secret, b.merchant_trans_id, ...(complete ? [b.merchant_prepare_id] : []), b.amount, b.action, b.sign_time].join(""));

/** POST /api/pay/click/prepare va /complete (application/x-www-form-urlencoded) */
export const clickWebhook = complete => async (req, res) => {
  const cfg = click();
  if (!cfg) return res.status(404).json({ error: "off" });
  const b = {}, src = req.body && typeof req.body === "object" ? req.body : {};
  for (const k of ["click_trans_id", "service_id", "click_paydoc_id", "merchant_trans_id", "merchant_prepare_id", "amount", "action", "error", "error_note", "sign_time", "sign_string"])
    b[k] = typeof src[k] === "string" ? src[k].slice(0, 200) : "";
  const send = (c, extra = {}) => res.status(200).set("Cache-Control", "no-store").json({ click_trans_id: /^\d{1,18}$/.test(b.click_trans_id) ? Number(b.click_trans_id) : null, merchant_trans_id: b.merchant_trans_id, ...extra, error: c[0], error_note: c[1] });
  if (b.service_id !== cfg.service || !/^[0-9a-f]{32}$/i.test(b.sign_string) || !same(clickSign(b, cfg.secret, complete), b.sign_string.toLowerCase())) return send(C.sign);
  if (b.action !== (complete ? "1" : "0")) return send(C.action);
  if (!/^\d{1,18}$/.test(b.click_trans_id) || !/^\d{1,15}$/.test(b.merchant_trans_id)) return send(/^\d{1,18}$/.test(b.click_trans_id) ? C.order : C.request);
  try {
    const r = await tx(async run => {
      const p = await lockPayment(run, b.merchant_trans_id);
      if (!p) return [C.order];
      const sumOk = Math.abs(Number(b.amount) - Number(p.amount)) < 0.01 && Number(p.amount) > 0;
      const now = Date.now();
      const t = (await run("select * from pay_tx where provider = 'click' and ext_id = $1 for update", [b.click_trans_id])).rows[0];
      if (!complete){
        if (t) return Number(t.payment_id) !== Number(p.id) ? [C.request] : t.state === 2 ? [C.paid] : t.state < 0 ? [C.cancelled] : [C.ok, { merchant_prepare_id: Number(t.id) }];
        if (p.status === "paid") return [C.paid];
        if (p.status !== "pending") return [C.cancelled];
        if (!sumOk) return [C.amount];
        if (Number(b.error) < 0) return [C.cancelled];
        if (await openTx(run, p.id, now)) return [C.request];                            // boshqa to‘lov jarayonda: ikki marta yechilmasligi uchun
        const id = (await run("insert into pay_tx(provider, ext_id, paydoc_id, payment_id, amount, state, ext_time, create_time) values ('click', $1, $2, $3, $4, 1, $5, $5) returning id",
          [b.click_trans_id, /^\d{1,18}$/.test(b.click_paydoc_id) ? b.click_paydoc_id : null, p.id, p.amount, now])).rows[0].id;
        return [C.ok, { merchant_prepare_id: Number(id) }];
      }
      if (!t || String(t.id) !== b.merchant_prepare_id || Number(t.payment_id) !== Number(p.id)) return [C.noTx];
      if (t.state === 2) return [C.paid, { merchant_confirm_id: Number(t.id) }];
      if (t.state < 0) return [C.cancelled];
      if (Number(b.error) < 0){ await run("update pay_tx set state = -1, reason = $2, cancel_time = $3 where id = $1", [t.id, Number(b.error) | 0, now]); return [C.cancelled]; }
      if (!sumOk) return [C.amount];
      if (!await settle(run, p, "click")){ await run("update pay_tx set state = -1, reason = 10, cancel_time = $2 where id = $1", [t.id, now]); return [C.paid]; }
      await run("update pay_tx set state = 2, perform_time = $2, paydoc_id = coalesce(paydoc_id, $3) where id = $1", [t.id, now, /^\d{1,18}$/.test(b.click_paydoc_id) ? b.click_paydoc_id : null]);
      return [C.ok, { merchant_confirm_id: Number(t.id) }];
    });
    return send(r[0], r[1]);
  } catch (e){ console.error("[click]", e.message); return send(C.update); }
};
