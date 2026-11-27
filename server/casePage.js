// «Ish» sahifasi: fuqaro tanlagan yuristga yuborgan reja va ariza (/hisob/ish/:id).
// Faqat ikki ishtirokchi ko‘radi (fuqaro va shu yurist) — tekshiruv server/market.js caseFor() da.
// Reja va ariza saqlangan ma’lumotlardan serverda qayta hisoblanadi: muddat (MK 9-modda), normalar (lex.uz), shablon.
import { page } from "./business.js";
import { kbFor } from "./kb.js";
import { buildPlan } from "./plan.js";
import { toCyrillic } from "../public/translit.js";
import { fmtDate, fmtMoney } from "../public/i18n.js";

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
const T = {
  title: ["Ish: {t}", "Дело: {t}"],
  sentTo: ["Yurist", "Юрист"], sentFrom: ["Fuqaro", "Гражданин"], sentAt: ["Yuborilgan", "Отправлено"],
  status: ["Holat", "Статус"],
  c_requested: ["So‘rov yuborilgan", "Запрос отправлен"], c_offered: ["Narx taklif qilingan", "Предложена цена"], c_agreed: ["Kelishuv tuzilgan", "Договорённость заключена"],
  c_completed: ["Bajarilgan", "Выполнено"], c_declined: ["Rad etilgan", "Отклонено"], c_cancelled: ["Bekor qilingan", "Отменено"],
  leadCitizen: ["Siz bu yuristga reja va arizangizni yubordingiz. Yurist ularni ko‘rib, narx taklif qiladi. Ma’lumotni istalgan vaqtda qaytarib olishingiz mumkin.", "Вы отправили этому юристу план и заявление. Юрист изучит их и предложит цену. Данные можно отозвать в любой момент."],
  leadLawyer: ["Fuqaro sizga o‘z ishini yubordi: muddat, qadamlar, normalar, dalillar va tayyor ariza. Ma’lumot faqat shu ish uchun; fuqaro uni qaytarib olishi mumkin.", "Гражданин отправил вам своё дело: срок, шаги, нормы, доказательства и готовое заявление. Данные — только для этого дела; гражданин может их отозвать."],
  withdrawn: ["Fuqaro ish ma’lumotlarini qaytarib oldi yoki so‘rov yopildi — ma’lumot o‘chirilgan.", "Гражданин отозвал данные дела или запрос закрыт — данные удалены."],
  message: ["Xabar", "Сообщение"],
  deadline: ["Muddat", "Срок"], days: ["{n} kun qoldi", "осталось дней: {n}"], late: ["{n} kun o‘tib ketgan", "просрочено на {n} дн."],
  lastDay: ["Oxirgi kun", "Последний день"], noLimit: ["Muddat cheklanmagan", "Срок не ограничен"], trigger: ["Hisob boshlanadigan sana", "Дата начала отсчёта"],
  steps: ["Qadamlar", "Шаги"], laws: ["Qonun normalari", "Нормы закона"], evidence: ["Dalillar", "Доказательства"],
  evHave: ["bor", "есть"], evNeed: ["kerak", "нужно"],
  fields: ["Ariza ma’lumotlari", "Данные заявления"], doc: ["Ariza", "Заявление"], recipient: ["Kimga", "Кому"],
  dl: ["Yuklab olish:", "Скачать:"], open: ["Ochish", "Открыть"],
  withdraw: ["Ma’lumotni yuristdan qaytarib olish", "Отозвать данные у юриста"],
  withdrawNote: ["Qaytarib olinsa, yurist bu ishning reja va ariza ma’lumotlarini boshqa ko‘ra olmaydi. So‘rovingiz o‘zi qoladi.", "После отзыва юрист больше не увидит план и данные заявления. Сам запрос останется."],
  back: ["← Hisobim", "← Мой аккаунт"], contacts: ["Aloqa", "Контакты"],
  privacy: ["Bu sahifani faqat siz va tanlangan yurist ko‘radi. Ma’lumot rad etilgan yoki bekor qilingan so‘rovlarda avtomatik o‘chiriladi, yopilgan ishlarda 90 kundan keyin o‘chiriladi.", "Эту страницу видите только вы и выбранный юрист. Данные автоматически удаляются при отклонённых или отменённых запросах, а по закрытым делам — через 90 дней."],
  sources: ["Manba", "Источник"]
};
const L = lang => (k, v = {}) => { const s = (T[k] || [k, k])[lang === "ru" ? 1 : 0].replace(/\{(\w+)\}/g, (_, x) => v[x] ?? ""); return lang === "cyr" ? toCyrillic(s) : s; };

export function casePage({ lang, cssHref, fs, user, accHref, c }){
  const t = L(lang), base = lang === "ru" ? "ru" : "uz", kb = kbFor(base), cy = x => lang === "cyr" ? toCyrillic(String(x ?? "")) : String(x ?? "");
  const sc = c.scenario && kb.SCENARIO_BY_ID[c.scenario];
  const title = sc ? cy(sc.title) : "—";
  const who = c.side === "citizen" ? `${t("sentTo")}: ${c.lawyer_name}` : `${t("sentFrom")}: ${c.citizen_name}`;
  const contacts = c.side === "citizen" ? [c.lawyer_phone, c.lawyer_email] : ["agreed", "completed"].includes(c.status) ? [c.citizen_phone, c.citizen_email] : [];
  const head = `<p><a href="/hisob">${esc(t("back"))}</a></p>
    <h1>${esc(t("title", { t: title }))}</h1>
    <p class="casemeta"><span class="tag">${esc(t("c_" + c.status))}</span> <b>${esc(who)}</b> · ${esc(t("sentAt"))}: ${esc(cy(fmtDate(new Date(c.case_at || c.created_at), base)))}</p>
    ${contacts.filter(Boolean).length ? `<p class="small">${esc(t("contacts"))}: ${contacts.filter(Boolean).map(esc).join(" · ")}</p>` : ""}
    <p class="lead">${esc(t(c.side === "citizen" ? "leadCitizen" : "leadLawyer"))}</p>
    ${c.message && c.message !== "—" ? `<section class="card"><h2 class="sec2">${esc(t("message"))}</h2><p class="pre">${esc(c.message)}</p></section>` : ""}`;

  if (!c.case_data || !sc){
    return page({ lang, cssHref, fs, user, accHref, path: `/hisob/ish/${c.id}`, title: t("title", { t: title }), desc: "",
      body: `<div class="casepage">${head}<p class="note warn" role="note">${esc(t("withdrawn"))}</p></div>` });
  }
  const d = c.case_data;
  const p = buildPlan({ scenario: d.scenario, triggerDate: d.triggerDate || undefined, form: d.form || {}, lang: base });
  const dl = p.deadline == null
    ? `<div class="big word">${esc(t("noLimit"))}</div>`
    : `<div class="big">${esc(t(p.daysLeft < 0 ? "late" : "days", { n: Math.abs(p.daysLeft) }))}</div><p>${esc(t("lastDay"))}: <b>${esc(cy(p.deadlineText))}</b></p>`;
  const deadline = `<section class="card casedl" aria-labelledby="cDl"><h2 class="sec2" id="cDl">${esc(t("deadline"))} · ${esc(cy(p.deadlineLabel))}</h2>${dl}
    <p class="small muted">${esc(cy(p.info?.trigger || t("trigger")))}: ${esc(p.trigger ? cy(fmtDate(new Date(p.trigger + "T00:00:00"), base)) : "—")}${p.risk ? ` · ${esc(cy(p.risk.label))}` : ""}</p></section>`;
  const steps = `<section aria-labelledby="cSt"><h2 class="sec" id="cSt">${esc(t("steps"))}</h2><ol class="casesteps">${p.steps.map(st =>
    `<li><b>${esc(cy(st.t))}</b> <span class="small muted">· ${esc(cy(st.org))} · ${esc(cy(st.when))}</span><p>${esc(cy(st.body))}</p></li>`).join("")}</ol></section>`;
  const laws = `<section aria-labelledby="cLw"><h2 class="sec" id="cLw">${esc(t("laws"))}</h2><ul class="caselaws">${p.norms.slice(0, 8).map(n =>
    `<li><span class="art">${esc(cy(n.article || ""))}</span> <b>${esc(cy(n.title))}</b><br><span class="small muted">${esc(cy(n.lawName))}</span>${n.lawUrl ? ` · <a href="${esc(n.lawUrl)}" target="_blank" rel="noopener noreferrer">lex.uz ↗</a>` : ""}</li>`).join("")}</ul></section>`;
  const have = new Set(d.evidence || []);
  const ev = `<section aria-labelledby="cEv"><h2 class="sec" id="cEv">${esc(t("evidence"))}</h2><ul class="caseev">${p.evidence.map((e, i) =>
    `<li class="${have.has(i) ? "have" : "need"}"><span class="tag">${esc(t(have.has(i) ? "evHave" : "evNeed"))}</span> ${esc(cy(e))}</li>`).join("")}</ul></section>`;
  const fieldsSpec = kb.fieldsOf(sc).filter(f => d.form?.[f.k] != null && d.form[f.k] !== "");
  const optLabel = (f, v) => f.options?.find(o => o.v === v)?.text || v;
  const fields = `<section aria-labelledby="cFi"><h2 class="sec" id="cFi">${esc(t("fields"))}</h2><dl class="casefields">${fieldsSpec.map(f =>
    `<div><dt>${esc(cy(f.label))}</dt><dd class="pre">${esc(f.type === "money" ? fmtMoney(Number(d.form[f.k]), lang) : cy(f.type === "select" ? optLabel(f, d.form[f.k]) : d.form[f.k]))}</dd></div>`).join("")}</dl></section>`;
  const rec = sc.docs.find(x => x.id === d.recipient) || sc.docs[0];
  const doc = `<section class="card casedoc" aria-labelledby="cDoc"><h2 class="sec2" id="cDoc">${esc(t("doc"))}</h2>
    <p>${esc(t("recipient"))}: <b>${esc(cy(rec.label))}</b></p>
    <p class="rowbtn"><span>${esc(t("dl"))}</span><a class="btn primary" href="/hisob/ish/${c.id}/docx" download>Word (DOCX)</a><a class="btn ghost" href="/hisob/ish/${c.id}/pdf" download>PDF</a></p></section>`;
  const withdraw = c.side === "citizen" ? `<section class="card casewd"><p class="small">${esc(t("withdrawNote"))}</p>
    <button class="btn ghost danger-o" type="button" data-post="/api/consultations/${c.id}/withdraw" data-confirm="${esc(t("withdrawNote"))}">${esc(t("withdraw"))}</button><p class="err" data-err hidden></p></section>` : "";
  return page({ lang, cssHref, fs, user, accHref, path: `/hisob/ish/${c.id}`, title: t("title", { t: title }), desc: "", body: `
    <div class="casepage">${head}
      <div class="casegrid">${deadline}${doc}</div>
      ${steps}${laws}${ev}${fields}
      ${withdraw}
      <p class="small muted">${esc(t("privacy"))}</p>
    </div>` });
}
