// «Kompaniya» ish joyi sahifalari (/kompaniya?b=…). Serverda chiziladi, formalar public/account.js orqali JSON API ga.
// Bo‘limlar: umumiy (panel) · shartnomalar · muddatlar · xatlar · kutubxona · hujjatlar (shablonlar) · qonunlar · rekvizitlar.
import { page } from "./business.js";
import { toCyrillic } from "../public/translit.js";
import { fmtSum, fmtDate } from "../public/i18n.js";
import { PRACTICE } from "./kb.js";
import { parseISO, dayDiff } from "./dates.js";
import { CATS, CURRENCIES, REPEATS, SIZES, COMPANY_AREAS, companyTemplates, prefill, letterhead, todayISO } from "./company.js";

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
const T = {
  title: ["Kompaniya", "Компания"],
  lead: ["Shartnomalar, muddatlar, xatlar va hujjatlar — bir joyda. Muddat yaqinlashsa, tizim oldindan eslatadi.", "Договоры, сроки, письма и документы — в одном месте. Когда срок близко, система напомнит заранее."],
  s_umumiy: ["Umumiy", "Обзор"], s_shartnomalar: ["Shartnomalar", "Договоры"], s_muddatlar: ["Muddatlar", "Сроки"], s_xatlar: ["Xatlar jurnali", "Журнал писем"],
  s_kutubxona: ["Ichki hujjatlar", "Внутренние документы"], s_hujjatlar: ["Hujjat tayyorlash", "Подготовить документ"], s_qonunlar: ["Qonunlar", "Законы"], s_rekvizitlar: ["Rekvizitlar", "Реквизиты"],
  secNav: ["Kompaniya bo‘limlari", "Разделы компании"],
  plTrial: ["Sinov · {d} gacha", "Пробный · до {d}"], plActive: ["Faol · {d} gacha", "Активна · до {d}"], plNone: ["Obuna yo‘q — faqat ko‘rish", "Нет подписки — только просмотр"],
  roNote: ["Obuna faol emas. Ma’lumotlaringiz saqlangan: ko‘rish va Excel’ga yuklab olish ochiq. Yangi yozuv qo‘shish va hujjat tayyorlash uchun obunani yoqing.", "Подписка не активна. Ваши данные сохранены: просмотр и выгрузка в Excel доступны. Чтобы добавлять записи и готовить документы, включите подписку."],
  trialNote: ["Bepul sinov {d} gacha. Sinov tugagach ham ma’lumotlaringiz o‘chmaydi.", "Бесплатный период до {d}. После него ваши данные не удалятся."],
  toPlans: ["Tariflar", "Тарифы"], team: ["Jamoa", "Команда"],
  welcome: ["Xush kelibsiz! Kompaniyangiz ish joyi tayyor.", "Добро пожаловать! Рабочее место компании готово."],
  welcomeLead: ["Boshlash uchun 5 ta qadam: har biri 1–2 daqiqa oladi.", "Чтобы начать — 5 шагов, каждый на 1–2 минуты."],
  onb: ["Boshlash", "Начало работы"], onbDone: ["{a} / {b} bajarildi", "Выполнено {a} из {b}"],
  o_req: ["Rekvizitlarni to‘ldiring — hujjatlar blankangizda chiqadi", "Заполните реквизиты — документы будут на вашем бланке"],
  o_contract: ["Birinchi shartnomani qo‘shing", "Добавьте первый договор"], o_deadline: ["Muhim muddatni kiriting: litsenziya, ishonchnoma, hisobot", "Внесите важный срок: лицензия, доверенность, отчёт"],
  o_letter: ["Birinchi hujjatni tayyorlang (buyruq yoki pretenziya)", "Подготовьте первый документ (приказ или претензию)"], o_team: ["Hamkasbni jamoaga taklif qiling", "Пригласите коллегу в команду"],
  k_overdue: ["Muddati o‘tgan", "Просрочено"], k_soon: ["Eslatma vaqti keldi", "Пора напомнить"], k_contracts: ["Faol shartnomalar", "Активные договоры"],
  k_letters: ["Shu oy xatlar", "Письма за месяц"], inOut: ["kiruvchi {a} · chiquvchi {b}", "входящих {a} · исходящих {b}"],
  upcoming: ["Yaqin muddatlar", "Ближайшие сроки"], noUpcoming: ["Yaqin 30 kunda muddat yo‘q. Yangi muddat yoki shartnoma qo‘shing — tizim oldindan eslatadi.", "В ближайшие 30 дней сроков нет. Добавьте срок или договор — система напомнит заранее."],
  quick: ["Tezkor amallar", "Быстрые действия"], addContract: ["+ Shartnoma", "+ Договор"], addDeadline: ["+ Muddat", "+ Срок"], addLetter: ["+ Xat", "+ Письмо"], makeDoc: ["Hujjat tayyorlash", "Подготовить документ"],
  daysLeft: ["{n} kun qoldi", "осталось {n} дн."], today: ["bugun", "сегодня"], late: ["{n} kun o‘tdi", "просрочено {n} дн."], doneTag: ["bajarildi", "выполнено"],
  // Ro‘yxat
  search: ["Qidirish", "Поиск"], searchPh: ["Nomi, kontragent, raqam yoki STIR", "Название, контрагент, номер или ИНН"], status: ["Holat", "Статус"],
  h_active: ["Faol", "Активные"], h_done: ["Bajarilgan / yopilgan", "Выполненные / закрытые"], h_all: ["Hammasi", "Все"],
  m_all: ["Har qanday muddat", "Любой срок"], m_soon: ["Eslatma vaqti kelgan", "Пора напомнить"], m_overdue: ["Muddati o‘tgan", "Просроченные"],
  filter: ["Ko‘rsatish", "Показать"], csv: ["Excel (CSV)", "Excel (CSV)"], ics: ["Kalendarga (.ics)", "В календарь (.ics)"],
  add: ["Qo‘shish", "Добавить"], edit: ["Tahrirlash", "Изменить"], save: ["Saqlash", "Сохранить"], cancelEdit: ["Bekor qilish", "Отмена"],
  done: ["Bajarildi", "Выполнено"], reopen: ["Qayta ochish", "Открыть снова"], del: ["O‘chirish", "Удалить"],
  empty: ["Hozircha yozuv yo‘q.", "Пока записей нет."], found: ["Topildi: {n}", "Найдено: {n}"], newOf: ["Yangi yozuv", "Новая запись"], editOf: ["Yozuvni tahrirlash", "Изменить запись"],
  // Maydonlar
  f_title_contract: ["Shartnoma predmeti", "Предмет договора"], f_title_deadline: ["Nima qilish kerak", "Что нужно сделать"], f_title_letter: ["Mazmuni (qisqa)", "Содержание (кратко)"], f_title_doc: ["Hujjat nomi", "Название документа"],
  f_party: ["Kontragent", "Контрагент"], f_party_letter: ["Kimdan / kimga", "От кого / кому"], f_inn: ["Kontragent STIR yoki JSHSHIR", "ИНН или ПИНФЛ контрагента"],
  f_number: ["Raqami", "Номер"], f_numberAuto: ["Bo‘sh qoldirsangiz — avtomatik", "Если пусто — автоматически"], f_amount: ["Summa", "Сумма"], f_currency: ["Valyuta", "Валюта"],
  f_start_contract: ["Tuzilgan sana", "Дата заключения"], f_due_contract: ["Amal qilish muddati (tugash sanasi)", "Срок действия (дата окончания)"],
  f_due_deadline: ["Muddat", "Срок"], f_repeat: ["Takrorlanadi", "Повторяется"], f_start_letter: ["Ro‘yxatga olingan sana", "Дата регистрации"], f_due_letter: ["Javob muddati (agar bo‘lsa)", "Срок ответа (если есть)"],
  f_start_doc: ["Hujjat sanasi", "Дата документа"], f_due_doc: ["Qayta ko‘rish yoki amal qilish muddati", "Срок пересмотра или действия"],
  f_remind: ["Necha kun oldin eslatish", "За сколько дней напомнить"], f_assignee: ["Mas’ul", "Ответственный"], nobody: ["— belgilanmagan —", "— не назначен —"],
  f_note: ["Izoh", "Примечание"], f_url: ["Havola (https://, ixtiyoriy)", "Ссылка (https://, необязательно)"], f_category: ["Turi", "Тип"], f_direction: ["Yo‘nalish", "Направление"],
  d_in: ["Kiruvchi", "Входящее"], d_out: ["Chiquvchi", "Исходящее"],
  r_none: ["Takrorlanmaydi", "Не повторяется"], r_month: ["Har oy", "Каждый месяц"], r_quarter: ["Har chorak", "Каждый квартал"], r_year: ["Har yil", "Каждый год"],
  remindHint: ["Eslatma shu yerda va (e-pochta sozlangan bo‘lsa) har kuni ertalab xat bilan keladi.", "Напоминание появится здесь и (если настроена почта) придёт письмом каждое утро."],
  repeatHint: ["«Bajarildi» bosilganda keyingi muddat avtomatik yaratiladi.", "При отметке «Выполнено» следующий срок создаётся автоматически."],
  dueOwn: ["Sanalarni o‘zingiz kiritasiz: tizim qonundagi muddatlarni o‘ylab topmaydi, faqat eslatadi.", "Даты вводите вы сами: система не придумывает сроки из закона, а только напоминает."],
  c_party: ["Kontragent", "Контрагент"], c_sum: ["Summa", "Сумма"], c_due: ["Muddat", "Срок"], c_number: ["№", "№"], c_date: ["Sana", "Дата"], c_who: ["Mas’ul", "Ответственный"], c_act: ["Amallar", "Действия"], c_type: ["Turi", "Тип"],
  // Kategoriyalar
  cat_litsenziya: ["Litsenziya / ruxsatnoma", "Лицензия / разрешение"], cat_ishonchnoma: ["Ishonchnoma", "Доверенность"], cat_hisobot: ["Hisobot", "Отчёт"], cat_shartnoma: ["Shartnoma", "Договор"],
  cat_mehnat: ["Mehnat (xodimlar)", "Трудовые (сотрудники)"], cat_soliq: ["Soliq", "Налоги"], cat_sud: ["Sud / nizo", "Суд / спор"], cat_boshqa: ["Boshqa", "Другое"],
  cat_murojaat: ["Murojaat", "Обращение"], cat_pretenziya: ["Pretenziya", "Претензия"], cat_sorov: ["So‘rov", "Запрос"], cat_javob: ["Javob", "Ответ"], cat_xabarnoma: ["Xabarnoma", "Уведомление"],
  cat_ustav: ["Ustav", "Устав"], cat_qoida: ["Ichki qoida", "Внутреннее правило"], cat_buyruq: ["Buyruq", "Приказ"], cat_yoriqnoma: ["Lavozim yo‘riqnomasi", "Должностная инструкция"], cat_qonun: ["Qonun yoki normativ hujjat", "Закон или нормативный акт"],
  // Hujjatlar
  tplLead: ["Tasdiqlangan shablonlar: kompaniya rekvizitlari avtomatik qo‘yiladi, maydonlarni to‘ldirasiz — Word yoki PDF tayyor. Shablon huquqiy maslahat o‘rnini bosmaydi: muhim hujjatni imzolashdan oldin yuristga ko‘rsating.", "Проверенные шаблоны: реквизиты компании подставляются автоматически, вы заполняете поля — Word или PDF готов. Шаблон не заменяет юридическую консультацию: важный документ перед подписанием покажите юристу."],
  open: ["Ochish", "Открыть"], back: ["← Barcha shablonlar", "← Все шаблоны"], preview: ["Ko‘rinishi", "Предпросмотр"], docLang: ["Hujjat tili", "Язык документа"],
  logOut: ["Chiquvchi xatlar jurnaliga yozish (raqam avtomatik beriladi)", "Записать в журнал исходящих (номер присвоится автоматически)"],
  dlDocx: ["Word (DOCX)", "Word (DOCX)"], dlPdf: ["PDF", "PDF"], reqFirst: ["Rekvizitlar to‘ldirilmagan — blanka bo‘sh chiqadi.", "Реквизиты не заполнены — бланк будет пустым."],
  needLawyer: ["Murakkab holatmi? Yurist toping →", "Сложный случай? Найдите юриста →"], letterTag: ["xat", "письмо"],
  // Qonunlar
  lawsLead: ["Faoliyatingizga oid amaldagi hujjatlar: rasmiy matn lex.uz’da. Ro‘yxat bazada {d} da tekshirilgan.", "Действующие акты по вашей деятельности: официальный текст на lex.uz. Список проверен {d}."],
  addLib: ["Ichki hujjatlarga qo‘shish", "Добавить во внутренние"], inLib: ["✓ Qo‘shilgan", "✓ Добавлено"],
  // Rekvizitlar
  reqLead: ["Bu ma’lumotlar hujjatlar blankasida va shablonlarda avtomatik ishlatiladi.", "Эти данные автоматически используются в бланке и шаблонах."],
  ownerOnly: ["Rekvizitlarni faqat kompaniya hisobining egasi o‘zgartiradi.", "Реквизиты меняет только владелец аккаунта компании."], saved: ["Saqlandi.", "Сохранено."],
  q_name: ["Kompaniya nomi", "Название компании"], q_inn: ["STIR (9 raqam)", "ИНН (9 цифр)"], q_oked: ["OKED (ixtiyoriy)", "ОКЭД (необязательно)"], q_size: ["Xodimlar soni", "Количество сотрудников"],
  q_city: ["Shahar / tuman (hujjatdagi joy)", "Город / район (место в документе)"], q_address: ["Yuridik manzil", "Юридический адрес"], q_director: ["Rahbar F.I.Sh.", "ФИО руководителя"],
  q_directorPos: ["Rahbar lavozimi", "Должность руководителя"], q_bank: ["Bank", "Банк"], q_account: ["Hisob raqami (20 raqam)", "Расчётный счёт (20 цифр)"], q_mfo: ["MFO (5 raqam)", "МФО (5 цифр)"],
  q_phone: ["Telefon", "Телефон"], q_email: ["E-pochta", "Эл. почта"], lhPrev: ["Blanka ko‘rinishi", "Вид бланка"], notSet: ["— tanlanmagan —", "— не выбрано —"],
  privacy: ["Ma’lumotlar faqat kompaniyangiz jamoasiga ko‘rinadi. Har bir o‘zgarish jurnalga yoziladi (matnsiz). Eksport istalgan vaqtda.", "Данные видит только команда вашей компании. Каждое изменение записывается в журнал (без текста). Выгрузка — в любое время."]
};
const L = lang => (k, v = {}) => { const s = (T[k] || [k, k])[lang === "ru" ? 1 : 0].replace(/\{(\w+)\}/g, (_, x) => v[x] ?? ""); return lang === "cyr" ? toCyrillic(s) : s; };
const SECTIONS = ["umumiy", "shartnomalar", "muddatlar", "xatlar", "kutubxona", "hujjatlar", "qonunlar", "rekvizitlar"];
const KIND_OF = { shartnomalar: "contract", muddatlar: "deadline", xatlar: "letter", kutubxona: "doc" };
export const sectionOf = b => SECTIONS.includes(b) ? b : "umumiy";

const field = (id, label, input, hint = "", cls = "") => `<div class="field${cls ? " " + cls : ""}"><label for="${id}">${esc(label)}</label>${input}${hint ? `<span class="hint" id="${id}_h">${esc(hint)}</span>` : ""}</div>`;
const inp = (id, name, val, attrs = "") => `<input id="${id}" name="${name}" value="${esc(val ?? "")}" ${attrs}>`;
const sel = (id, name, opts, cur) => `<select id="${id}" name="${name}">${opts.map(([v, l]) => `<option value="${esc(v)}"${String(v) === String(cur ?? "") ? " selected" : ""}>${esc(l)}</option>`).join("")}</select>`;
const date = (s, lang) => s ? (x => lang === "cyr" ? toCyrillic(x) : x)(fmtDate(parseISO(s), lang === "ru" ? "ru" : "uz")) : "—";
const money = (n, cur, lang) => n == null ? "—" : `${fmtSum(Math.round(Number(n)))} ${cur === "UZS" ? (lang === "ru" ? "сум" : lang === "cyr" ? "сўм" : "so‘m") : cur}`;
const err = `<p class="err" data-err role="alert" hidden></p>`;

/** Muddat belgisi: o‘tgan (qizil), eslatma oynasida (sariq), keyin (oddiy). */
function dueBadge(r, t, today){
  if (!r.due_date) return "—";
  const n = dayDiff(parseISO(today), parseISO(r.due_date));
  if (r.status !== "active") return `<span class="small muted">${esc(t("doneTag"))}</span>`;
  const cls = n < 0 ? "late" : n <= r.remind_days ? "soon" : "ok";
  const txt = n < 0 ? t("late", { n: -n }) : n === 0 ? t("today") : t("daysLeft", { n });
  return `<span class="due ${cls}">${esc(txt)}</span>`;
}

// ---------- Qobiq ----------
export function companyPage({ lang, cssHref, fs, user, accHref, ctx, b, data, query }){
  const t = L(lang), sec = sectionOf(b), today = todayISO();
  const plan = ctx.plan, ends = plan?.ends_at ? date(new Date(plan.ends_at).toISOString().slice(0, 10), lang) : "";
  const chip = !plan ? `<span class="chip warn">${esc(t("plNone"))}</span>` : `<span class="chip ok">${esc(t(plan.status === "trial" ? "plTrial" : "plActive", { d: ends }))}</span>`;
  const counts = data.nav || {};
  const nav = `<nav class="cmpnav" aria-label="${esc(t("secNav"))}"><ul>${SECTIONS.map(s => `<li><a href="/kompaniya?b=${s}"${s === sec ? ` aria-current="page"` : ""}>
      <span>${esc(t("s_" + s))}</span>${counts[s] ? `<span class="cnt${counts[s].alert ? " alert" : ""}">${counts[s].alert ? `${counts[s].alert}<span class="sr"> — ${esc(t("k_soon"))}</span>` : counts[s].n}</span>` : ""}</a></li>`).join("")}</ul></nav>`;
  const banner = !ctx.write ? `<p class="note warn" role="note">${esc(t("roNote"))} <a class="btn primary sm" href="/tariflar">${esc(t("toPlans"))}</a></p>`
    : plan?.status === "trial" && sec === "umumiy" ? `<p class="note" role="note">${esc(t("trialNote", { d: ends }))} <a href="/tariflar">${esc(t("toPlans"))}</a></p>` : "";
  const body = { umumiy: () => overview(t, lang, ctx, data, today, query), hujjatlar: () => templatesSec(t, lang, ctx, query), qonunlar: () => lawsSec(t, lang, ctx, data),
    rekvizitlar: () => requisitesSec(t, lang, ctx, query) }[sec] || (() => registry(t, lang, ctx, KIND_OF[sec], sec, data, today, query));
  return page({ lang, cssHref, fs, user, accHref, path: `/kompaniya?b=${sec}`, title: `${t("s_" + sec)} — ${ctx.org.name}`, desc: t("lead"), body: `
    <div class="cmphead"><div><p class="eyebrow">${esc(t("title"))}</p><h1>${esc(ctx.org.name)}</h1><p class="cmpmeta">${chip}</p></div>
      <p class="rowbtn"><a class="btn ghost" href="/jamoa">${esc(t("team"))} · ${ctx.members.length}</a><a class="btn ghost" href="/tariflar">${esc(t("toPlans"))}</a></p></div>
    ${banner}
    <div class="cmpwrap">${nav}<div class="cmpmain">${body()}</div></div>
    <p class="small muted cmppriv">${esc(t("privacy"))}</p>` });
}

// ---------- Umumiy ----------
function overview(t, lang, ctx, d, today, query){
  const s = d.dash, by = s.by;
  const steps = [["o_req", !!(ctx.org.req?.address || ctx.org.req?.director), "/kompaniya?b=rekvizitlar"], ["o_contract", !!s.firsts.contract, "/kompaniya?b=shartnomalar&yangi=1"],
    ["o_deadline", !!s.firsts.deadline, "/kompaniya?b=muddatlar&yangi=1"], ["o_letter", !!s.firsts.letter, "/kompaniya?b=hujjatlar"], ["o_team", ctx.members.length > 1, "/jamoa"]];
  const doneN = steps.filter(x => x[1]).length;
  const onb = doneN < steps.length ? `<section class="card onb" aria-labelledby="onbH">
      ${"yangi" in query ? `<p class="eyebrow">${esc(t("welcome"))}</p>` : ""}<h2 class="sec2" id="onbH">${esc(t("onb"))}</h2><p class="small muted">${esc(t("welcomeLead"))}</p>
      <div class="meter" role="progressbar" aria-valuemin="0" aria-valuemax="${steps.length}" aria-valuenow="${doneN}" aria-label="${esc(t("onbDone", { a: doneN, b: steps.length }))}"><span class="w${Math.round(doneN / steps.length * 100 / 20) * 20}"></span></div>
      <p class="small">${esc(t("onbDone", { a: doneN, b: steps.length }))}</p>
      <ol class="onblist">${steps.map(([k, ok, href]) => `<li class="${ok ? "ok" : ""}">${ok ? `<span aria-hidden="true">✓</span> <s>${esc(t(k))}</s><span class="sr"> — ✓</span>` : `<a href="${href}">${esc(t(k))}</a>`}</li>`).join("")}</ol></section>` : "";
  const sums = s.sums.map(x => money(x.total, x.currency, lang)).join(" · ");
  const tile = (cls, label, n, sub = "", href = "") => `<a class="ctile ${cls}" href="${href}"><span class="n">${esc(n)}</span><span class="l">${esc(label)}</span>${sub ? `<span class="s">${esc(sub)}</span>` : ""}</a>`;
  const tiles = `<div class="ctiles">
    ${tile(s.overdue ? "late" : "", t("k_overdue"), s.overdue, "", "/kompaniya?b=muddatlar&muddat=overdue")}
    ${tile(s.soon ? "soon" : "", t("k_soon"), s.soon, "", "/kompaniya?b=muddatlar&muddat=soon")}
    ${tile("", t("k_contracts"), by.contract.active, sums, "/kompaniya?b=shartnomalar")}
    ${tile("", t("k_letters"), Number(s.letters.inn) + Number(s.letters.out), t("inOut", { a: s.letters.inn, b: s.letters.out }), "/kompaniya?b=xatlar")}</div>`;
  const SEC = { contract: "shartnomalar", deadline: "muddatlar", letter: "xatlar", doc: "kutubxona" };
  const up = s.upcoming.length ? `<ul class="uplist">${s.upcoming.map(r => `<li><span class="when">${esc(date(r.due_date, lang))}</span>
      <a href="/kompaniya?b=${SEC[r.kind]}&id=${r.id}">${esc(r.title)}</a>${r.party ? ` <span class="small muted">· ${esc(r.party)}</span>` : ""} ${dueBadge(r, t, today)}</li>`).join("")}</ul>`
    : `<p class="empty">${esc(t("noUpcoming"))}</p>`;
  const quick = ctx.write ? `<section aria-labelledby="qH"><h2 class="sec" id="qH">${esc(t("quick"))}</h2><p class="rowbtn">
      <a class="btn primary" href="/kompaniya?b=shartnomalar&yangi=1">${esc(t("addContract"))}</a><a class="btn ghost" href="/kompaniya?b=muddatlar&yangi=1">${esc(t("addDeadline"))}</a>
      <a class="btn ghost" href="/kompaniya?b=xatlar&yangi=1">${esc(t("addLetter"))}</a><a class="btn ghost" href="/kompaniya?b=hujjatlar">${esc(t("makeDoc"))}</a></p></section>` : "";
  return `${onb}${tiles}<section aria-labelledby="upH"><h2 class="sec" id="upH">${esc(t("upcoming"))}</h2>${up}
    <p class="small"><a href="/kompaniya/kalendar" download>${esc(t("ics"))}</a></p></section>${quick}`;
}

// ---------- Reestr (shartnomalar / muddatlar / xatlar / kutubxona) ----------
function registry(t, lang, ctx, kind, sec, d, today, query){
  const rows = d.rows, editing = d.record, who = new Map(ctx.members.map(m => [m.id, m.name]));
  const holat = ["active", "done", "all"].includes(query.holat) ? query.holat : "active", muddat = ["soon", "overdue"].includes(query.muddat) ? query.muddat : "";
  const filters = `<form class="cfilter" method="get" action="/kompaniya" role="search"><input type="hidden" name="b" value="${sec}">
      ${field("f_q", t("search"), inp("f_q", "q", query.q, `type="search" maxlength="100" placeholder="${esc(t("searchPh"))}"`))}
      ${field("f_h", t("status"), sel("f_h", "holat", [["active", t("h_active")], ["done", t("h_done")], ["all", t("h_all")]], holat))}
      ${kind !== "doc" ? field("f_m", t("c_due"), sel("f_m", "muddat", [["", t("m_all")], ["soon", t("m_soon")], ["overdue", t("m_overdue")]], muddat)) : ""}
      <button class="btn ghost" type="submit">${esc(t("filter"))}</button></form>`;
  const exp = `<p class="small rowbtn cexp"><a href="/kompaniya/eksport/${kind}" download>${esc(t("csv"))}</a>${kind === "deadline" || kind === "contract" ? `<a href="/kompaniya/kalendar" download>${esc(t("ics"))}</a>` : ""}</p>`;
  const act = r => !ctx.write ? "" : `<a class="linkbtn" href="/kompaniya?b=${sec}&id=${r.id}#forma">${esc(t("edit"))}</a>
      ${r.status === "active" ? `<button class="linkbtn" type="button" data-post="/api/company/records/${r.id}/done">${esc(t("done"))}</button>` : `<button class="linkbtn" type="button" data-post="/api/company/records/${r.id}/reopen">${esc(t("reopen"))}</button>`}
      <button class="linkbtn danger" type="button" data-post="/api/company/records/${r.id}/delete" data-confirm>${esc(t("del"))}</button>`;
  const cat = r => r.category ? t("cat_" + r.category) : "";
  const COLS = {
    contract: [[t("c_number"), r => esc(r.number || "—")], [t("f_title_contract"), r => `<b>${esc(r.title)}</b>`], [t("c_party"), r => `${esc(r.party || "—")}${r.party_inn ? `<br><span class="small muted">${esc(r.party_inn)}</span>` : ""}`],
      [t("c_sum"), r => esc(money(r.amount, r.currency, lang)), "numc"], [t("c_due"), r => `${esc(date(r.due_date, lang))}<br>${dueBadge(r, t, today)}`]],
    deadline: [[t("c_due"), r => `${esc(date(r.due_date, lang))}<br>${dueBadge(r, t, today)}`], [t("f_title_deadline"), r => `<b>${esc(r.title)}</b>${r.repeat !== "none" ? ` <span class="tag">↻ ${esc(t("r_" + r.repeat))}</span>` : ""}`], [t("c_type"), r => esc(cat(r))]],
    letter: [[t("c_number"), r => `<b>${esc(r.number || "—")}</b><br><span class="tag ${r.direction}">${esc(t(r.direction === "in" ? "d_in" : "d_out"))}</span>`], [t("c_date"), r => esc(date(r.start_date, lang))],
      [t("f_party_letter"), r => esc(r.party || "—")], [t("f_title_letter"), r => `${esc(r.title)}<br><span class="small muted">${esc(cat(r))}</span>`], [t("f_due_letter"), r => r.due_date ? `${esc(date(r.due_date, lang))}<br>${dueBadge(r, t, today)}` : "—"]],
    doc: [[t("c_type"), r => esc(cat(r))], [t("f_title_doc"), r => `<b>${r.url ? `<a href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">${esc(r.title)} ↗</a>` : esc(r.title)}</b>`], [t("c_number"), r => esc(r.number || "—")],
      [t("c_date"), r => esc(date(r.start_date, lang))], [t("f_due_doc"), r => r.due_date ? `${esc(date(r.due_date, lang))}<br>${dueBadge(r, t, today)}` : "—"]]
  }[kind];
  const table = rows.length ? `<p class="small muted" role="status">${esc(t("found", { n: rows.length }))}</p><div class="tscroll" tabindex="0"><table class="ctable"><thead><tr>${COLS.map(c => `<th scope="col">${esc(c[0])}</th>`).join("")}<th scope="col">${esc(t("c_who"))}</th>${ctx.write ? `<th scope="col"><span class="sr">${esc(t("c_act"))}</span></th>` : ""}</tr></thead>
      <tbody>${rows.map(r => `<tr class="${r.status !== "active" ? "closed" : ""}">${COLS.map(c => `<td${c[2] ? ` class="${c[2]}"` : ""}>${c[1](r)}</td>`).join("")}<td>${esc(who.get(r.assignee_id) || "—")}</td>${ctx.write ? `<td class="acts">${act(r)}</td>` : ""}</tr>`).join("")}</tbody></table></div>`
    : `<p class="empty">${esc(t("empty"))}</p>`;
  const form = ctx.write ? recordForm(t, lang, ctx, kind, sec, editing, query) : "";
  return `<h2 class="sec">${esc(t("s_" + sec))}</h2>${form}${filters}${table}${exp}`;
}

function recordForm(t, lang, ctx, kind, sec, r, query){
  const v = r || {}, id = x => `r_${x}`, open = !!r || "yangi" in query;
  const members = sel(id("as"), "assignee_id", [["", t("nobody")], ...ctx.members.map(m => [m.id, m.name])], v.assignee_id ?? "");
  const dt = (name, label, val, req = false) => field(id(name), label, inp(id(name), name, val, `type="date"${req ? " required" : ""}`), "", req ? "need" : "");
  const remind = (def) => field(id("rd"), t("f_remind"), inp(id("rd"), "remind_days", v.remind_days ?? def, `type="number" min="0" max="365" inputmode="numeric" aria-describedby="${id("rd")}_h"`), t("remindHint"));
  const title = field(id("t"), t("f_title_" + kind), inp(id("t"), "title", v.title, `required minlength="2" maxlength="300"`), "", "need");
  const note = field(id("n"), t("f_note"), `<textarea id="${id("n")}" name="note" maxlength="4000" rows="3">${esc(v.note || "")}</textarea>`);
  const cats = kind !== "contract" ? field(id("c"), t("f_category"), sel(id("c"), "category", CATS[kind].map(c => [c, t("cat_" + c)]), v.category || "boshqa")) : "";
  let body;
  if (kind === "contract") body = `${title}<div class="grid2">${field(id("p"), t("f_party"), inp(id("p"), "party", v.party, `required minlength="2" maxlength="300" autocomplete="organization"`), "", "need")}
      ${field(id("i"), t("f_inn"), inp(id("i"), "party_inn", v.party_inn, `inputmode="numeric" maxlength="14" pattern="\\d{9}|\\d{14}"`))}
      ${field(id("no"), t("f_number"), inp(id("no"), "number", v.number, `maxlength="60"`))}
      <div class="grid2 tight">${field(id("a"), t("f_amount"), inp(id("a"), "amount", v.amount != null ? String(Number(v.amount)) : "", `inputmode="decimal" maxlength="22"`))}
      ${field(id("cu"), t("f_currency"), sel(id("cu"), "currency", CURRENCIES.map(c => [c, c === "UZS" ? (lang === "ru" ? "сум" : "so‘m") : c]), v.currency || "UZS"))}</div>
      ${dt("start_date", t("f_start_contract"), v.start_date)}${dt("due_date", t("f_due_contract"), v.due_date)}
      ${remind(30)}${field(id("as"), t("f_assignee"), members)}</div>${field(id("u"), t("f_url"), inp(id("u"), "url", v.url, `type="url" maxlength="500" placeholder="https://"`))}${note}`;
  else if (kind === "deadline") body = `${title}<div class="grid2">${dt("due_date", t("f_due_deadline"), v.due_date, true)}${cats}
      ${field(id("rp"), t("f_repeat"), sel(id("rp"), "repeat", REPEATS.map(x => [x, t("r_" + x)]), v.repeat || "none"), t("repeatHint"))}${remind(14)}
      ${field(id("as"), t("f_assignee"), members)}</div>${note}<p class="small muted">${esc(t("dueOwn"))}</p>`;
  else if (kind === "letter") body = `<fieldset class="seg"><legend>${esc(t("f_direction"))}</legend>${["in", "out"].map(x => `<label class="segopt"><input type="radio" name="direction" value="${x}"${(v.direction || "in") === x ? " checked" : ""}${r ? " disabled" : ""}> ${esc(t(x === "in" ? "d_in" : "d_out"))}</label>`).join("")}</fieldset>
      ${r ? `<input type="hidden" name="direction" value="${esc(v.direction)}">` : ""}
      <div class="grid2">${field(id("p"), t("f_party_letter"), inp(id("p"), "party", v.party, `required minlength="2" maxlength="300"`), "", "need")}${cats}</div>${title}
      <div class="grid2">${field(id("no"), t("f_number"), inp(id("no"), "number", v.number, `maxlength="60" placeholder="${esc(t("f_numberAuto"))}"`))}${dt("start_date", t("f_start_letter"), v.start_date || todayISO())}
      ${dt("due_date", t("f_due_letter"), v.due_date)}${remind(3)}${field(id("as"), t("f_assignee"), members)}</div>${note}`;
  else body = `${title}<div class="grid2">${cats}${field(id("no"), t("f_number"), inp(id("no"), "number", v.number, `maxlength="60"`))}
      ${dt("start_date", t("f_start_doc"), v.start_date)}${dt("due_date", t("f_due_doc"), v.due_date)}${remind(30)}</div>
      ${field(id("u"), t("f_url"), inp(id("u"), "url", v.url, `type="url" maxlength="500" placeholder="https://"`))}${note}`;
  return `<details class="card addbox" id="forma"${open ? " open" : ""}><summary><b>${esc(r ? t("editOf") : `+ ${t("add")}`)}</b></summary>
    <form class="kform" data-api="${r ? `/api/company/records/${r.id}` : "/api/company/records"}" novalidate>${r ? "" : `<input type="hidden" name="kind" value="${kind}">`}${body}
      <p class="rowbtn"><button class="btn primary" type="submit">${esc(t(r ? "save" : "add"))}</button>${r ? `<a class="btn ghost" href="/kompaniya?b=${sec}">${esc(t("cancelEdit"))}</a>` : ""}</p>${err}</form></details>`;
}

// ---------- Hujjat tayyorlash ----------
function templatesSec(t, lang, ctx, query){
  const list = companyTemplates(lang === "ru" ? "ru" : "uz"), cy = s => lang === "cyr" ? toCyrillic(s) : s;
  const cur = list.find(x => x.id === query.shablon);
  if (!cur) return `<h2 class="sec">${esc(t("s_hujjatlar"))}</h2><p class="lead">${esc(t("tplLead"))}</p>
    <ul class="tplgrid">${list.map(x => `<li><a class="tplcard" href="/kompaniya?b=hujjatlar&shablon=${x.id}"><b>${esc(cy(x.name))}</b>${x.to.length ? ` <span class="tag">${esc(t("letterTag"))}</span>` : ""}
      <span class="small muted">${esc(cy(x.text.replace(/\{\{\w+\}\}/g, "…").replace(/\s+/g, " ").slice(0, 110)))}…</span></a></li>`).join("")}</ul>
    <p class="small"><a href="/yuristlar">${esc(t("needLawyer"))}</a></p>`;
  const pre = prefill(ctx.org), lh = letterhead(ctx.org);
  const fields = cur.fields.map(f => field(`tp_${f.k}`, cy(f.label), f.area ? `<textarea id="tp_${f.k}" name="v_${f.k}" maxlength="4000" rows="3" data-tpl-k="${f.k}">${esc(pre[f.k] || "")}</textarea>`
    : inp(`tp_${f.k}`, `v_${f.k}`, pre[f.k] || "", `maxlength="400" data-tpl-k="${f.k}"`))).join("");
  const data = JSON.stringify({ title: cy(cur.title), to: cur.to.map(cy), text: cy(cur.text), lh }).replace(/</g, "\\u003c");
  return `<p><a href="/kompaniya?b=hujjatlar">${esc(t("back"))}</a></p><h2 class="sec">${esc(cy(cur.name))}</h2>
    ${lh.length < 2 ? `<p class="note warn">${esc(t("reqFirst"))} <a href="/kompaniya?b=rekvizitlar">${esc(t("s_rekvizitlar"))}</a></p>` : ""}
    <div class="tplwrap"><form class="card kform" data-download="/api/company/doc/" ${ctx.write ? "" : "inert"}>
      <input type="hidden" name="tpl" value="${cur.id}">${fields}
      ${field("tp_lang", t("docLang"), sel("tp_lang", "docLang", [["uz", "O‘zbekcha (lotin)"], ["cyr", "Ўзбекча (кирилл)"], ["ru", "Русский"]], lang))}
      ${cur.to.length ? `<label class="check"><input type="checkbox" name="logOut" checked> ${esc(t("logOut"))}</label>` : ""}
      <p class="rowbtn"><button class="btn primary" type="submit" data-fmt="docx">${esc(t("dlDocx"))}</button><button class="btn ghost" type="submit" data-fmt="pdf">${esc(t("dlPdf"))}</button></p>
      <p class="ok" data-ok-msg role="status" hidden></p>${err}</form>
      <section class="card docprev" aria-labelledby="pvH"><h3 class="sec2" id="pvH">${esc(t("preview"))}</h3><div class="paper" id="tplPreview" tabindex="0" role="region" aria-labelledby="pvH"></div></section></div>
    <script type="application/json" id="tpl-data">${data}</script>
    <p class="small muted">${esc(t("tplLead"))}</p>`;
}

// ---------- Qonunlar ----------
function lawsSec(t, lang, ctx, d){
  const i = lang === "ru" ? 1 : 0, cy = s => lang === "cyr" ? toCyrillic(s) : s;
  const acts = PRACTICE.acts.filter(a => a.areas.some(x => COMPANY_AREAS.includes(x)));
  const have = new Set(d.libUrls || []);
  const groups = PRACTICE.types.map(ty => [ty, acts.filter(a => a.type === ty.id)]).filter(([, l]) => l.length);
  return `<h2 class="sec">${esc(t("s_qonunlar"))}</h2><p class="lead">${esc(t("lawsLead", { d: date(PRACTICE.checked, lang) }))}</p>
    ${groups.map(([ty, l]) => `<section aria-labelledby="lw_${ty.id}"><h3 class="sec2" id="lw_${ty.id}">${esc(cy(ty.t[i]))} <span class="small muted">(${l.length})</span></h3>
      <ul class="lawlist">${l.map(a => `<li><div><a href="${esc(a.url)}" target="_blank" rel="noopener noreferrer"><b>${esc(cy(a.t[i]))}</b> ↗</a>${a.num || a.date ? `<br><span class="small muted">${[a.num && `№ ${esc(a.num)}`, a.date && esc(date(a.date, lang))].filter(Boolean).join(" · ")}</span>` : ""}</div>
        ${ctx.write ? (have.has(a.url) ? `<span class="small muted">${esc(t("inLib"))}</span>` : `<button class="linkbtn" type="button" data-post="/api/company/records" data-next="/kompaniya?b=qonunlar" data-body="${esc(JSON.stringify({ kind: "doc", category: "qonun", title: a.t[i], number: a.num || "", start_date: a.date || "", url: a.url }))}">${esc(t("addLib"))}</button>`) : ""}</li>`).join("")}</ul></section>`).join("")}`;
}

// ---------- Rekvizitlar ----------
function requisitesSec(t, lang, ctx, query){
  const o = ctx.org, r = o.req || {}, ro = !ctx.owner || !ctx.write;
  const f = (k, val, attrs = "") => field(`q_${k}`, t("q_" + k), inp(`q_${k}`, k, val, `${attrs}${ro ? " readonly" : ""}`));
  const lh = letterhead(o);
  return `<h2 class="sec">${esc(t("s_rekvizitlar"))}</h2><p class="lead">${esc(t("reqLead"))}</p>
    ${"saqlandi" in query ? `<p class="note ok" role="status">✓ ${esc(t("saved"))}</p>` : ""}${!ctx.owner ? `<p class="note">${esc(t("ownerOnly"))}</p>` : ""}
    <div class="tplwrap"><form class="card kform" data-api="/api/company/requisites" novalidate>
      ${field("q_name", t("q_name"), inp("q_name", "name", o.name, `required minlength="2" maxlength="200" autocomplete="organization"${ro ? " readonly" : ""}`), "", "need")}
      <div class="grid2">${f("inn", o.inn, `inputmode="numeric" maxlength="9" pattern="\\d{9}"`)}${f("oked", r.oked, `maxlength="20"`)}
      ${field("q_size", t("q_size"), sel("q_size", "size", [["", t("notSet")], ...SIZES.map(s => [s, s])], o.size || ""))}${f("city", r.city, `maxlength="100" autocomplete="address-level2"`)}</div>
      ${f("address", r.address, `maxlength="300" autocomplete="street-address"`)}
      <div class="grid2">${f("director", r.director, `maxlength="120"`)}${f("directorPos", r.directorPos, `maxlength="80"`)}
      ${f("bank", r.bank, `maxlength="200"`)}${f("account", r.account, `inputmode="numeric" maxlength="20" pattern="\\d{20}"`)}${f("mfo", r.mfo, `inputmode="numeric" maxlength="5" pattern="\\d{5}"`)}
      ${f("phone", r.phone, `type="tel" maxlength="40" autocomplete="tel"`)}${f("email", r.email, `type="email" maxlength="254" autocomplete="email"`)}</div>
      ${ro ? "" : `<p><button class="btn primary" type="submit">${esc(t("save"))}</button></p>`}${err}</form>
      <section class="card docprev" aria-labelledby="lhH"><h3 class="sec2" id="lhH">${esc(t("lhPrev"))}</h3><div class="paper" tabindex="0" role="region" aria-labelledby="lhH"><div class="lhead">${lh.map((l, i) => i ? `<p>${esc(l)}</p>` : `<p><b>${esc(l)}</b></p>`).join("")}</div></div></section></div>`;
}
