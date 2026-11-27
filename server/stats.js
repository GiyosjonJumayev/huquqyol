// Anonim statistika: qaysi sohada va holatda nechta murojaat bo‘lganini sanaydi.
// SAQLANMAYDI: foydalanuvchi matni, ariza ma’lumotlari, IP manzil, cookie, brauzer ma’lumoti.
// Faqat sanoqlar: holat bo‘yicha ochilishlar, yasalgan hujjatlar, doiradan tashqari so‘rovlar, kunlar kesimida.
// Kunlik yozuvda (v2): faol foydalanuvchilar soni (kun ichida noyob, iz faqat xotirada), sohalar va holatlar,
// hududlar (faqat viloyat nomi — ariza formasidagi tumandan), hujjat rasmidan/PDF’dan o‘qish, yuristga yuborilgan ishlar.
// Davr hisoboti (report): 7 / 30 / 90 / 365 kun, oldingi shunday davr bilan solishtirib.
//
// Takroriy sanashning oldini olish (bir kishi bir kunda bir holatni bir marta): IP va holat
// tasodifiy kalit bilan HMAC qilinadi, iz faqat xotirada turadi va har kuni kalit bilan birga o‘chiriladi.
// Diskka hech qachon yozilmaydi — undan IP ni tiklab bo‘lmaydi.
import { createHmac, randomBytes } from "node:crypto";
import { readFileSync, writeFileSync, renameSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const KEEP_DAYS = 400;
const MAX_SEEN = 200_000;
// Toshkent vaqti (UTC+5, yozgi vaqt yo‘q) bo‘yicha kun
export const dayOf = (ms = Date.now()) => new Date(ms + 5 * 3600e3).toISOString().slice(0, 10);

const empty = now => ({ v: 1, since: dayOf(now), opens: {}, docs: {}, analyze: { total: 0, outOfScope: 0 }, days: {} });
const inc = (o, k, n = 1) => { o[k] = (o[k] || 0) + n; };
const SAFE_ID = /^[a-z0-9_]{1,40}$/;
export const PERIODS = [7, 30, 90, 365];

// Fayl faqat server start() orqali ulanadi (attachFile): ilovani import qilgan testlar va skriptlar diskka yozmaydi
export const DEFAULT_FILE = process.env.STATS_FILE || join(ROOT, "data", "stats.json");

export function createStats({ file = null, enabled = process.env.STATS !== "0", now = () => Date.now(), flushMs = 30_000 } = {}){
  let data = empty(now());
  const load = f => {
    try {
      const d = JSON.parse(readFileSync(f, "utf8"));
      if (d && d.v === 1) data = { ...empty(now()), ...d, analyze: { ...empty(now()).analyze, ...d.analyze } };
    } catch {}
  };
  if (enabled && file) load(file);
  let dirty = false, day = dayOf(now()), salt = randomBytes(32), seen = new Set();
  const rotate = () => { const d = dayOf(now()); if (d !== day){ day = d; salt = randomBytes(32); seen = new Set(); } };
  // true — birinchi marta (sanaladi), false — bugun shu kishidan allaqachon sanalgan
  const first = (...parts) => {
    rotate();
    const h = createHmac("sha256", salt).update(parts.join("|")).digest("base64url").slice(0, 22);
    if (seen.has(h)) return false;
    if (seen.size >= MAX_SEEN) seen.clear();
    seen.add(h); return true;
  };
  const today = () => {
    const d = (data.days[day] ||= { opens: {}, docs: 0, outOfScope: 0 });
    d.sc ||= {}; d.docsD ||= {}; d.reg ||= {}; d.lawD ||= {};
    return d;
  };
  const prune = () => {
    const cut = dayOf(now() - KEEP_DAYS * 864e5);
    for (const k of Object.keys(data.days)) if (k < cut) delete data.days[k];
  };

  // Faol foydalanuvchi: kun ichida birinchi amali (tahlil, reja, hujjat, rasm, yuristga yuborish) bilan bir marta sanaladi
  const active = ip => { if (ip && first("user", ip)) today().users = (today().users || 0) + 1; };
  const okDomain = d => SAFE_ID.test(d || "");
  function record(kind, { scenario, domain, region, ip = "" } = {}){
    if (!enabled) return false;
    rotate();
    if (kind === "open"){
      if (!SAFE_ID.test(scenario || "") || !okDomain(domain)) return false;
      if (!first("open", ip, scenario)) return false;
      inc(data.opens, scenario); inc(today().opens, domain); inc(today().sc, scenario);
    } else if (kind === "doc"){
      if (!SAFE_ID.test(scenario || "")) return false;
      if (!first("doc", ip, scenario)) return false;
      const d = today();
      inc(data.docs, scenario); d.docs++;
      if (okDomain(domain)) inc(d.docsD, domain);
      if (SAFE_ID.test(region || "")) inc(d.reg, region);
    } else if (kind === "analyze"){
      if (!first("analyze", ip, scenario || "")) return false;
      data.analyze.total++; today().an = (today().an || 0) + 1;
      if (scenario === "boshqa"){ data.analyze.outOfScope++; today().outOfScope++; }
    } else if (kind === "photo"){
      if (!first("photo", ip, scenario || "")) return false;
      today().photo = (today().photo || 0) + 1;
    } else if (kind === "lawyer"){
      if (!SAFE_ID.test(scenario || "") || !okDomain(domain)) return false;
      if (!first("lawyer", ip, scenario)) return false;
      today().law = (today().law || 0) + 1; inc(today().lawD, domain);
    } else return false;
    active(ip);
    dirty = true;
    return true;
  }

  function flush(){
    if (!enabled || !dirty || !file) return;
    prune();
    try {
      mkdirSync(dirname(file), { recursive: true });
      const tmp = file + ".tmp";
      writeFileSync(tmp, JSON.stringify(data));
      renameSync(tmp, file);            // atomar: yarim yozilgan fayl qolmaydi
      dirty = false;
    } catch (e){ console.warn("[stats] saqlab bo‘lmadi:", e.code || e.message); }
  }
  let timer = null;
  const arm = () => { if (enabled && file && flushMs && !timer){ timer = setInterval(flush, flushMs); timer.unref(); } };
  arm();
  // Serverni ishga tushirishda: mavjud sanoqlarni yuklab, faylga yozishni yoqish
  function attachFile(f){ if (!enabled || !f) return; file = f; load(f); arm(); }

  // Ommaviy ko‘rinish: holatlar → sohalar, kunlar ketma-ketligi
  function summary({ scenarioDomain = {}, days = 30 } = {}){
    const byDomain = {};
    for (const [s, n] of Object.entries(data.opens)){ const d = scenarioDomain[s]; if (d) inc(byDomain, d, n); }
    const docsByDomain = {};
    for (const [s, n] of Object.entries(data.docs)){ const d = scenarioDomain[s]; if (d) inc(docsByDomain, d, n); }
    const series = [];
    for (let i = days - 1; i >= 0; i--){
      const k = dayOf(now() - i * 864e5), d = data.days[k];
      series.push({ day: k, opens: d ? Object.values(d.opens).reduce((a, b) => a + b, 0) : 0, docs: d?.docs || 0 });
    }
    const total = Object.values(data.opens).reduce((a, b) => a + b, 0);
    return {
      enabled, since: data.since, total,
      documents: Object.values(data.docs).reduce((a, b) => a + b, 0),
      analyzed: data.analyze.total, outOfScope: data.analyze.outOfScope,
      byDomain, docsByDomain, byScenario: { ...data.opens }, series
    };
  }
  // Davr hisoboti: joriy davr (bugun bilan) va undan oldingi shunday davr. Barcha raqamlar — haqiqiy sanoqlar.
  function report({ scenarioDomain = {}, period = 30 } = {}){
    period = PERIODS.includes(Number(period)) ? Number(period) : 30;
    const window = (from, len) => {
      const w = { users: 0, opens: 0, docs: 0, analyzed: 0, outOfScope: 0, photo: 0, lawyer: 0, byDomain: {}, docsByDomain: {}, byScenario: {}, byRegion: {}, lawByDomain: {}, activeDays: 0 };
      for (let i = 0; i < len; i++){
        const d = data.days[dayOf(now() - (from + i) * 864e5)];
        if (!d) continue;
        const o = Object.values(d.opens || {}).reduce((a, b) => a + b, 0);
        w.users += d.users || 0; w.opens += o; w.docs += d.docs || 0; w.analyzed += d.an || 0; w.outOfScope += d.outOfScope || 0;
        w.photo += d.photo || 0; w.lawyer += d.law || 0;
        if (o || d.docs || d.an || d.users) w.activeDays++;
        for (const [k, n] of Object.entries(d.opens || {})) inc(w.byDomain, k, n);
        for (const [k, n] of Object.entries(d.docsD || {})) inc(w.docsByDomain, k, n);
        for (const [k, n] of Object.entries(d.sc || {})) if (scenarioDomain[k] || !Object.keys(scenarioDomain).length) inc(w.byScenario, k, n);
        for (const [k, n] of Object.entries(d.reg || {})) inc(w.byRegion, k, n);
        for (const [k, n] of Object.entries(d.lawD || {})) inc(w.lawByDomain, k, n);
      }
      return w;
    };
    const cur = window(0, period), prev = window(period, period);
    // Diagramma: 7 va 30 kun — kunlar, 90 kun — haftalar (7 kunlik bo‘laklar), 365 kun — oylar
    const series = [];
    if (period <= 30){
      for (let i = period - 1; i >= 0; i--){
        const k = dayOf(now() - i * 864e5), d = data.days[k];
        series.push({ from: k, to: k, users: d?.users || 0, opens: d ? Object.values(d.opens || {}).reduce((a, b) => a + b, 0) : 0, docs: d?.docs || 0 });
      }
    } else if (period === 90){
      for (let w = 12; w >= 0; w--){
        const b = { from: dayOf(now() - (w * 7 + 6) * 864e5), to: dayOf(now() - w * 7 * 864e5), users: 0, opens: 0, docs: 0 };
        for (let i = 0; i < 7; i++){ const d = data.days[dayOf(now() - (w * 7 + i) * 864e5)]; if (d){ b.users += d.users || 0; b.opens += Object.values(d.opens || {}).reduce((x, y) => x + y, 0); b.docs += d.docs || 0; } }
        series.push(b);
      }
    } else {
      const months = new Map();
      for (let i = period - 1; i >= 0; i--){
        const k = dayOf(now() - i * 864e5), m = k.slice(0, 7), d = data.days[k];
        const b = months.get(m) || { from: k, to: k, month: m, users: 0, opens: 0, docs: 0 };
        b.to = k;
        if (d){ b.users += d.users || 0; b.opens += Object.values(d.opens || {}).reduce((x, y) => x + y, 0); b.docs += d.docs || 0; }
        months.set(m, b);
      }
      series.push(...months.values());
    }
    return { enabled, period, since: data.since, from: dayOf(now() - (period - 1) * 864e5), to: dayOf(now()), current: cur, previous: prev, series };
  }
  return { record, flush, summary, report, attachFile, close(){ if (timer) clearInterval(timer); flush(); }, _data: () => data };
}

export const stats = createStats();
