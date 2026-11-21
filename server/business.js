// Biznes qismi: tariflar, yuristlar katalogi va profil sahifalari, Yurist Pro kabineti qobig‘i.
// Sahifalar serverda chiziladi (JavaScript’siz ishlaydi, qat’iy CSP: inline skript va style yo‘q).
// Katalogdagi hozirgi profillar — NAMUNA (kb/lawyers.json): haqiqiy yurist emas, aniq belgilangan.
import { readFileSync, appendFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { HTML_LANG, fmtSum, makeT } from "../public/i18n.js";
import { siteNav, siteFooter, a11yDialogHTML } from "../public/shared.js";
import { toCyrillic } from "../public/translit.js";
import { kbFor, COURTS } from "./kb.js";
import { clean, ValidationError } from "./validate.js";

const here = dirname(fileURLToPath(import.meta.url));
const DATA = JSON.parse(readFileSync(join(here, "kb", "lawyers.json"), "utf8"));
export const LAWYERS = DATA.list;
export const APPS_FILE = process.env.LAWYER_APPS_FILE || join(here, "..", "data", "lawyer-applications.jsonl");

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
const idx = lang => lang === "ru" ? 1 : 0;
const cy = (s, lang) => lang === "cyr" ? toCyrillic(s) : s;
// [uz, ru] juftligi yoki oddiy matn → joriy til
export const pick = (v, lang) => cy(Array.isArray(v) ? v[idx(lang)] : v, lang);
// Ism va nomlar: [uz, ru] bo‘lsa — tilga mos, oddiy matn bo‘lsa — kirill va rus sahifada kirill yozuvida
const nm = (v, lang) => Array.isArray(v) ? pick(v, lang) : lang === "uz" ? v : toCyrillic(v);

// ---------- Matnlar ----------
const T = {
  navHome: ["Bosh sahifa", "Главная"], navLogin: ["Kirish", "Войти"], navAccount: ["Hisobim", "Мой аккаунт"], navAdmin: ["Admin", "Админ"], navLawyers: ["Yuristlar", "Юристы"], navPlans: ["Tariflar", "Тарифы"], navCabinet: ["Yurist kabineti", "Кабинет юриста"],
  skip: ["Asosiy qismga o‘tish", "Перейти к основному"],
  demo: ["namuna profil", "образец профиля"],
  fakeContact: ["namuna — ishlamaydi", "образец — не работает"],
  demoNoReq: ["Namuna profilga so‘rov yuborib bo‘lmaydi: bu haqiqiy yurist emas.", "Образцу профиля нельзя отправить запрос: это не настоящий юрист."],
  demoNote: ["Bu namuna profil: haqiqiy yurist emas, aloqa ma’lumotlari ishlamaydi. Katalog ishga tushganda faqat litsenziyasi tekshirilgan yuristlar ko‘rsatiladi.", "Это пример профиля: не настоящий юрист, контакты не работают. После запуска каталога будут показаны только юристы с проверенной лицензией."],
  demoList: ["Katalog sinov rejimida: quyidagi profillar namuna, haqiqiy yuristlar emas.", "Каталог в тестовом режиме: профили ниже — примеры, а не настоящие юристы."],
  advokat: ["Advokat", "Адвокат"], yurist: ["Yurist", "Юрист"], firma: ["Yuridik firma", "Юридическая фирма"], mediator: ["Mediator", "Медиатор"],
  years: ["{n} yil tajriba", "Опыт {n} лет"],
  online: ["Onlayn", "Онлайн"], office: ["Ofisda", "В офисе"],
  free: ["Bepul", "Бесплатно"], from: ["{p} dan", "от {p}"], sum: ["so‘m", "сум"], min: ["{n} daqiqa", "{n} мин"],
  pro: ["Pro", "Pro"],
  lwTitle: ["Yurist yoki advokat topish", "Найти юриста или адвоката"],
  lwLead: ["Holatingiz bo‘yicha soha, hudud va xizmat shaklini tanlang. Profilda narxlar va aloqa ma’lumotlari ko‘rsatiladi: yuristga to‘g‘ridan-to‘g‘ri murojaat qilasiz, platforma vositachi emas.", "Выберите сферу, регион и формат. В профиле указаны цены и контакты: вы обращаетесь к юристу напрямую, платформа не посредник."],
  lwCase: ["Holatingiz: {t}. Shu soha bo‘yicha yuristlar ko‘rsatilmoqda.", "Ваша ситуация: {t}. Показаны юристы по этой сфере."],
  fArea: ["Soha", "Сфера"], fRegion: ["Hudud", "Регион"], fFormat: ["Shakl", "Формат"], fKind: ["Kim kerak", "Кто нужен"], fAny: ["Hammasi", "Все"],
  fFind: ["Qidirish", "Найти"], fReset: ["Tozalash", "Сбросить"],
  found: ["{n} ta mutaxassis", "Специалистов: {n}"], none: ["Bu filtrlar bo‘yicha hech kim topilmadi. Filtrlardan birini olib tashlang yoki onlayn maslahatni tanlang.", "По этим фильтрам никого не найдено. Уберите один из фильтров или выберите онлайн-консультацию."],
  profile: ["Profilni ko‘rish", "Открыть профиль"],
  langs: ["Tillar", "Языки"],
  about: ["Men haqimda", "Обо мне"], areas: ["Faoliyat sohalari", "Сферы практики"], services: ["Xizmatlar va narxlar", "Услуги и цены"],
  svc: ["Xizmat", "Услуга"], dur: ["Davomiyligi", "Длительность"], fmt: ["Shakli", "Формат"], price: ["Narxi", "Цена"],
  where: ["Manzil va ish vaqti", "Адрес и часы работы"], contacts: ["Aloqa", "Контакты"], phone: ["Telefon", "Телефон"], email: ["E-pochta", "Эл. почта"],
  howTitle: ["Qanday murojaat qilinadi", "Как обратиться"],
  how1: ["Telefon yoki e-pochta orqali bog‘laning va konsultatsiya vaqtini kelishib oling.", "Свяжитесь по телефону или почте и договоритесь о времени консультации."],
  how2: ["HuquqYo‘lda tayyorlagan rejangiz va arizangizni (PDF yoki DOCX) o‘zingiz bilan olib boring yoki yuboring — yurist vaziyatni tezroq tushunadi.", "Возьмите с собой или отправьте план и заявление из HuquqYo‘l (PDF или DOCX) — юрист быстрее разберётся."],
  how3: ["Narx va xizmat hajmini oldindan yozma kelishib oling. Advokat bilan shartnoma tuziladi.", "Заранее письменно согласуйте цену и объём услуг. С адвокатом заключается договор."],
  privacy: ["HuquqYo‘l sizning arizangiz yoki ma’lumotlaringizni yuristga yubormaydi: kimga va nimani yuborishni o‘zingiz hal qilasiz.", "HuquqYo‘l не передаёт юристу ваше заявление или данные: что и кому отправить, решаете вы."],
  back: ["← Katalogga qaytish", "← Назад к каталогу"],
  verified: ["Litsenziya tekshirilgan", "Лицензия проверена"], notVerified: ["Litsenziya tekshirilmagan", "Лицензия не проверена"],
  reqTitle: ["Konsultatsiyaga yozilish", "Записаться на консультацию"], reqLogin: ["So‘rov yuborish va kelishuv tuzish uchun hisobingizga kiring.", "Чтобы отправить запрос и заключить договорённость, войдите в аккаунт."],
  reqMsg: ["Vaziyatingizni qisqacha yozing", "Кратко опишите ситуацию"], reqSend: ["So‘rov yuborish", "Отправить запрос"],
  reqNote: ["Yurist narx taklif qiladi; rozi bo‘lsangiz, kelishuv tuziladi. Holatini «Hisobim» sahifasida kuzatasiz.", "Юрист предложит цену; если согласитесь — договорённость заключена. Статус — на странице «Мой аккаунт»."],
  website: ["Veb-sayt", "Сайт"], education: ["Ta’lim va malaka", "Образование и квалификация"], achievements: ["Yutuqlar va tajriba", "Достижения и опыт"], licenseNo: ["Litsenziya", "Лицензия"],
  joinTitle: ["Yuristmisiz? Katalogga qo‘shiling", "Вы юрист? Попадите в каталог"],
  joinText: ["Ro‘yxatdan o‘ting, profilingizni rasm, tajriba va narxlar bilan to‘ldiring. Litsenziya tekshirilgach va Yurist Pro faollashtirilgach, profilingiz katalogda chiqadi.", "Зарегистрируйтесь и заполните профиль: фото, опыт, цены. После проверки лицензии и активации «Юрист Pro» профиль появится в каталоге."],
  joinBtn: ["Profilni to‘ldirish", "Заполнить профиль"],
  // Tariflar
  plTitle: ["Tariflar", "Тарифы"],
  plLead: ["Fuqarolar uchun HuquqYo‘l bepul. Yuristlar, advokatlik byurolari va tashkilotlar uchun — ish jarayonini tartibga soladigan Pro imkoniyatlari.", "Для граждан HuquqYo‘l бесплатен. Для юристов, адвокатских бюро и организаций — Pro-возможности для ведения работы."],
  plNote: ["Narxlar taxminiy. To‘lov tizimi va shartnoma shartlari keyingi bosqichda ulanadi; hozir barcha Pro imkoniyatlarini bepul sinab ko‘rish mumkin.", "Цены ориентировочные. Оплата и условия договора подключаются на следующем этапе; сейчас все Pro-возможности можно попробовать бесплатно."],
  perMonth: ["oyiga", "в месяц"], byDeal: ["Kelishuv asosida", "По договорённости"],
  soon: ["tez orada", "скоро"],
  plTry: ["Kabinetni bepul sinab ko‘rish", "Попробовать кабинет бесплатно"], plSubscribe: ["Obuna bo‘lish", "Оформить подписку"], plStart: ["Boshlash", "Начать"], plContact: ["Kabinetda sinab ko‘rish", "Попробовать в кабинете"],
  pFree: ["Fuqaro", "Гражданин"], pFreeFor: ["Huquqi buzilgan har bir fuqaro uchun", "Для каждого гражданина"],
  pPro: ["Yurist Pro", "Юрист Pro"], pProFor: ["Yakka yurist va advokatlar uchun", "Для частных юристов и адвокатов"],
  pFirm: ["Firma", "Фирма"], pFirmFor: ["Advokatlik byurosi va yuridik firmalar uchun", "Для адвокатских бюро и юридических фирм"],
  pOrg: ["Tashkilot", "Организация"], pOrgFor: ["Korxona, muassasa va tashkilot yuristlari uchun", "Для юристов предприятий, учреждений и организаций"],
  plAll: ["{p} imkoniyatlari, shuningdek:", "Всё из «{p}», а также:"],
  cmpTitle: ["Imkoniyatlarni solishtirish", "Сравнение возможностей"], cmpFeature: ["Imkoniyat", "Возможность"],
  // Kabinet
  cabTitle: ["Yurist kabineti", "Кабинет юриста"],
  cabNoJs: ["Kabinet ishlashi uchun brauzerda JavaScript yoqilgan bo‘lishi kerak.", "Для работы кабинета нужен включённый JavaScript."],
  cabLead: ["Yurist va advokatlar uchun ish joyi. Kirish yoki ro‘yxatdan o‘tish kerak; 14 kun bepul sinov.", "Рабочее место юриста и адвоката. Нужно войти или зарегистрироваться; 14 дней бесплатно."],
  cabNeedPro: ["Kabinet Yurist Pro obunachilari uchun. Obuna bo‘ling — barcha vositalar ochiladi.", "Кабинет — для подписчиков «Юрист Pro». Оформите подписку, и все инструменты откроются."],
  cabRegister: ["Yurist sifatida ro‘yxatdan o‘tish", "Зарегистрироваться как юрист"], cabNoDb: ["Hisoblar hali ulanmagan.", "Аккаунты пока не подключены."]
};
const FEAT = {
  free: [["Vaziyat tahlili va huquqiy reja", "Анализ ситуации и правовой план"], ["{docs} ta hujjat shabloni: talabnoma, shikoyat, da’vo arizasi", "{docs} шаблонов: претензии, жалобы, иски"],
    ["PDF va DOCX, uch tilda", "PDF и DOCX на трёх языках"], ["Muddatlar kalendari va eslatma", "Календарь сроков и напоминание"], ["Yurist va advokatlar katalogi", "Каталог юристов и адвокатов"]],
  pro: [["Mijozlar va ishlar kartotekasi", "Картотека клиентов и дел"], ["Barcha muddatlar bitta kalendarda (.ics eksport)", "Все сроки в одном календаре (экспорт .ics)"],
    ["O‘z blankasi: barcha hujjatlar sizning rekvizitlaringiz bilan", "Свой бланк: все документы с вашими реквизитами"], ["Shablon tahriri: o‘z shablonlaringiz, PDF va DOCX", "Редактор шаблонов: свои шаблоны, PDF и DOCX"],
    ["Katalogda profil — yangi mijozlar", "Профиль в каталоге — новые клиенты"], ["Pro belgisi va katalogda yuqori o‘rin", "Значок Pro и приоритет в каталоге"], ["Ma’lumotlar qurilmangizda, zaxira nusxa (JSON)", "Данные на вашем устройстве, резервная копия (JSON)"]],
  firma: [["Firma profili va jamoa a’zolari katalogda", "Профиль фирмы и сотрудников в каталоге"], ["Umumiy firma blankasi", "Общий бланк фирмы"], ["Umumiy kartoteka va vazifalar taqsimoti", "Общая картотека и распределение задач"]],
  org: [["Tashkilot hujjatlari kutubxonasi: nizomlar, ichki qoidalar, buyruqlar", "Библиотека документов организации: уставы, правила, приказы"],
    ["Faoliyatga oid qonunlar ro‘yxati (lex.uz havolalari)", "Список законов по деятельности (ссылки на lex.uz)"], ["Ichki shablonlar: shartnoma, buyruq, xat — tashkilot blankasida", "Внутренние шаблоны: договор, приказ, письмо — на бланке организации"],
    ["Bir nechta yurist uchun umumiy kutubxona", "Общая библиотека для нескольких юристов"]]
};
const SOON = new Set(["firma:2", "org:3"]);              // hali ishlab chiqilmagan — «tez orada» deb belgilanadi
export const PLANS = [
  { id:"free", name:"pFree", for:"pFreeFor", price:0, cta:["plStart", "/"] },
  { id:"pro", name:"pPro", for:"pProFor", price:149000, cta:["plTry", "/kabinet?tarif=pro"], best:true },
  { id:"firma", name:"pFirm", for:"pFirmFor", price:490000, cta:["plTry", "/kabinet?tarif=firma"], base:"pro" },
  { id:"org", name:"pOrg", for:"pOrgFor", price:null, cta:["plContact", "/kabinet?tarif=org"], base:"pro" }
];

export function tr(lang){
  return (k, vars = {}) => { const v = T[k]; if (!v) return k; return cy(v[idx(lang)].replace(/\{(\w+)\}/g, (_, x) => vars[x] ?? ""), lang); };
}
const money = (n, lang) => `${fmtSum(n)} ${tr(lang)("sum")}`;

// ---------- Sohalar, hududlar, filtr ----------
export function areaList(lang){
  const kb = kbFor(lang === "ru" ? "ru" : "uz");
  return [...kb.DOMAINS.map(d => ({ id:d.id, title:cy(d.title, lang) })), ...Object.entries(DATA.areas).map(([id, t]) => ({ id, title:pick(t, lang) }))];
}
const regionName = (name, lang) => { const r = COURTS.regions.find(x => x.name === name); return lang === "ru" ? (r?.cyr || name) : cy(name, lang); };
const districtName = (name, region, lang) => {
  if (lang !== "ru") return cy(name, lang);
  return COURTS.regions.find(x => x.name === region)?.districts.find(d => d.name === name)?.cyr || name;
};
export function filterLawyers(q = {}, all = LAWYERS){
  const area = q.soha, region = q.hudud, format = q.shakl, kind = q.kim;
  return all.filter(l => (!area || l.areas.includes(area)) && (!region || l.region === region)
      && (!format || l.formats.includes(format)) && (!kind || l.kind === kind))
    .sort((a, b) => (b.plan !== "free") - (a.plan !== "free") || (area ? a.areas.indexOf(area) - b.areas.indexOf(area) : 0) || b.experience - a.experience);
}
function minPrice(l){
  const ps = l.services.map(s => s.price);
  return Math.min(...ps);
}

// ---------- Umumiy sahifa qobig‘i ----------
export function page({ lang, title, desc, path, cssHref, fs, body, scripts = "", user = null, accHref = "" }){
  const t = tr(lang), mt = makeT(lang);
  const sep = path.includes("?") ? "&" : "?";
  return `<!doctype html><html${fs ? ` data-fs="${fs}"` : ""} lang="${HTML_LANG[lang]}" data-lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} — HuquqYo‘l</title><meta name="description" content="${esc(desc)}"><link rel="icon" href="/icons/icon.svg" type="image/svg+xml"><link rel="stylesheet" href="${cssHref}"></head>
<body class="biz"><a class="skip" href="#main">${esc(t("skip"))}</a><div class="wrap">
<header class="nav">${siteNav({ lang, t: mt, mode: "page", path, user, langHref: l => `${path}${sep}lang=${l}`, a11y: true })}</header>
<main id="main">${body}</main>
${siteFooter(mt, { path, botUrl: process.env.TELEGRAM_BOT_URL })}</div>
${a11yDialogHTML(mt)}${accHref ? `<script type="module" src="${accHref}"></script>` : ""}${scripts}</body></html>`;
}

// ---------- Tariflar ----------
export function plansPage({ lang, cssHref, fs, user, accHref }){
  const t = tr(lang), docs = kbFor("uz").SCENARIOS.reduce((n, s) => n + s.docs.length, 0);
  const feat = (id, i, f) => `<li${SOON.has(`${id}:${i}`) ? ` class="soon"` : ""}>${esc(pick(f, lang).replace("{docs}", docs))}${SOON.has(`${id}:${i}`) ? ` <span class="tag">${esc(t("soon"))}</span>` : ""}</li>`;
  const cards = PLANS.map(p => {
    const list = (p.id === "firma" ? FEAT.firma : p.id === "org" ? FEAT.org : FEAT[p.id]).map((f, i) => feat(p.id === "org" ? "org" : p.id, i, f)).join("");
    const price = p.price === 0 ? t("free") : p.price ? `${money(p.price, lang)} <span class="per">/ ${esc(t("perMonth"))}</span>` : esc(t("byDeal"));
    return `<article class="plan${p.best ? " best" : ""}" aria-labelledby="pl_${p.id}">
      <h2 id="pl_${p.id}">${esc(t(p.name))}</h2><p class="for">${esc(t(p.for))}</p><p class="price">${price}</p>
      ${p.base ? `<p class="small muted">${esc(t("plAll", { p: t("pPro") }))}</p>` : ""}
      <ul class="feat">${list}</ul>
      ${p.id === "free" ? `<a class="btn ghost" href="/">${esc(t("plStart"))}</a>`
        : user ? `<button class="btn ${p.best ? "primary" : "ghost"}" type="button" data-post="/api/subscriptions" data-body='${esc(JSON.stringify({ plan: p.id }))}'>${esc(t("plSubscribe"))}</button><p class="err small" data-err hidden></p>`
        : `<a class="btn ${p.best ? "primary" : "ghost"}" href="/royxat?tarif=${p.id}">${esc(t("plSubscribe"))}</a>`}
      ${p.id !== "free" ? `<a class="small" href="${p.cta[1]}">${esc(t("plTry"))}</a>` : ""}</article>`;
  }).join("");
  // Solishtirish jadvali
  const rows = [...FEAT.free.map((f, i) => [f, ["free", "pro", "firma", "org"], `free:${i}`]), ...FEAT.pro.map((f, i) => [f, ["pro", "firma", "org"], `pro:${i}`]),
    ...FEAT.firma.map((f, i) => [f, ["firma"], `firma:${i}`]), ...FEAT.org.map((f, i) => [f, ["org"], `org:${i}`])];
  const table = `<div class="tscroll" tabindex="0"><table class="cmp"><thead><tr><th scope="col">${esc(t("cmpFeature"))}</th>${PLANS.map(p => `<th scope="col">${esc(t(p.name))}</th>`).join("")}</tr></thead><tbody>
    ${rows.map(([f, has, key]) => `<tr><th scope="row">${esc(pick(f, lang).replace("{docs}", docs))}${SOON.has(key) ? ` <span class="tag">${esc(t("soon"))}</span>` : ""}</th>${PLANS.map(p => `<td>${has.includes(p.id) ? `<span class="yes" aria-label="+">✓</span>` : `<span class="no" aria-label="—">—</span>`}</td>`).join("")}</tr>`).join("")}
  </tbody></table></div>`;
  return page({ lang, cssHref, fs, user, accHref, path:"/tariflar", title:t("plTitle"), desc:t("plLead"), body:`
    <h1>${esc(t("plTitle"))}</h1><p class="lead">${esc(t("plLead"))}</p>
    <div class="plans">${cards}</div>
    <p class="note">${esc(t("plNote"))}</p>
    <h2 class="sec">${esc(t("cmpTitle"))}</h2>${table}` });
}

// ---------- Katalog ----------
// Namuna (demo:true) profillar: aniq «DEMO» belgisi — katalog kartasida ham, profil sahifasida ham. Haqiqiy profillarda yo‘q.
const demoBadge = (l, lang) => l.demo === true ? ` <span class="tag demo">DEMO — ${esc(tr(lang)("demo"))}</span>` : "";
const initials = n => n.replace(/[«»"()]/g, "").split(/\s+/).filter(w => /^\p{L}/u.test(w)).slice(0, 2).map(w => w[0]).join("").toUpperCase();
// Avatar: yurist yuklagan rasm yoki bosh harflar
const avatar = (l, big = false) => l.photo
  ? `<img class="ava${big ? " big" : ""} photo" src="${esc(l.photo)}" alt="" width="${big ? 120 : 64}" height="${big ? 120 : 64}" loading="lazy" decoding="async">`
  : `<div class="ava${big ? " big" : ""}" aria-hidden="true">${esc(initials(nm(l.name, "uz")))}</div>`;
function lawyerCard(l, lang, qs){
  const t = tr(lang), areas = areaList(lang);
  const mp = minPrice(l);
  return `<article class="lawyer" aria-labelledby="lw_${l.id}">
    ${avatar(l)}
    <div class="lwbody">
      <h2 id="lw_${l.id}"><a href="/yuristlar/${l.id}${qs}">${esc(nm(l.name, lang))}</a>${demoBadge(l, lang)}${l.plan !== "free" ? ` <span class="tag pro">${esc(t("pro"))}</span>` : ""}</h2>
      <p class="meta">${esc(t(l.kind))} · ${esc(t("years", { n: l.experience }))} · ${esc(regionName(l.region, lang))}, ${esc(districtName(l.district, l.region, lang))}</p>
      <p class="head">${esc(pick(l.headline, lang))}</p>
      <ul class="chips">${l.areas.map(a => `<li>${esc(areas.find(x => x.id === a)?.title || a)}</li>`).join("")}</ul>
      <p class="meta">${l.formats.map(f => esc(t(f))).join(" · ")} · ${esc(l.langs.map(x => x.toUpperCase()).join(" / "))}</p>
    </div>
    <div class="lwside"><p class="price">${mp === 0 ? esc(t("free")) : esc(t("from", { p: money(mp, lang) }))}</p><a class="btn ghost" href="/yuristlar/${l.id}${qs}">${esc(t("profile"))}</a></div>
  </article>`;
}
export function lawyersPage({ lang, cssHref, fs, query = {}, user, accHref, extra = [] }){
  const t = tr(lang), areas = areaList(lang);
  const q = { soha: areas.some(a => a.id === query.soha) ? query.soha : "", hudud: COURTS.regions.some(r => r.name === query.hudud) ? query.hudud : "",
    shakl: ["online", "office"].includes(query.shakl) ? query.shakl : "", kim: ["advokat", "yurist", "firma"].includes(query.kim) ? query.kim : "" };
  const sc = query.holat && kbFor(lang === "ru" ? "ru" : "uz").SCENARIO_BY_ID[query.holat];
  if (sc && !query.soha) q.soha = sc.domain;
  const list = filterLawyers(q, [...extra, ...LAWYERS]);
  const sel = (name, label, opts) => `<label class="ff"><span>${esc(label)}</span><select name="${name}"><option value="">${esc(t("fAny"))}</option>${opts.map(([v, n]) => `<option value="${esc(v)}"${q[name] === v ? " selected" : ""}>${esc(n)}</option>`).join("")}</select></label>`;
  const qs = Object.entries(q).filter(([, v]) => v).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
  const path = "/yuristlar" + (qs ? `?${qs}` : "");
  const back = qs ? `?${qs.replace(/&/g, "&amp;")}` : "";
  return page({ lang, cssHref, fs, user, accHref, path, title:t("lwTitle"), desc:t("lwLead"), body:`
    <h1>${esc(t("lwTitle"))}</h1><p class="lead">${esc(t("lwLead"))}</p>
    ${sc ? `<p class="note ok">${esc(t("lwCase", { t: cy(sc.title, lang) }))}</p>` : ""}
    <p class="note warn" role="note">${esc(t("demoList"))}</p>
    <form class="filters" method="get" action="/yuristlar">
      ${sel("soha", t("fArea"), areas.map(a => [a.id, a.title]))}
      ${sel("hudud", t("fRegion"), COURTS.regions.map(r => [r.name, regionName(r.name, lang)]))}
      ${sel("shakl", t("fFormat"), [["online", t("online")], ["office", t("office")]])}
      ${sel("kim", t("fKind"), [["advokat", t("advokat")], ["yurist", t("yurist")], ["firma", t("firma")]])}
      <div class="fact"><button class="btn primary" type="submit">${esc(t("fFind"))}</button>${qs ? `<a class="btn ghost" href="/yuristlar">${esc(t("fReset"))}</a>` : ""}</div>
    </form>
    <p class="count" aria-live="polite">${esc(t("found", { n: list.length }))}</p>
    ${list.length ? `<div class="lawyers">${list.map(l => lawyerCard(l, lang, back)).join("")}</div>` : `<p class="card">${esc(t("none"))}</p>`}
    <aside class="card join"><h2>${esc(t("joinTitle"))}</h2><p>${esc(t("joinText"))}</p><a class="btn ghost" href="/hisob/profil">${esc(t("joinBtn"))}</a></aside>` });
}

export function lawyerPage({ lang, cssHref, fs, id, query = {}, user, accHref, extra = [] }){
  const l = [...extra, ...LAWYERS].find(x => x.id === id);
  if (!l) return null;
  const t = tr(lang), areas = areaList(lang);
  const qs = new URLSearchParams(Object.entries(query).filter(([k, v]) => ["soha", "hudud", "shakl", "kim"].includes(k) && typeof v === "string" && v.length < 80)).toString();
  const svc = l.services.map(s => `<tr><th scope="row">${esc(pick(s.name, lang))}</th><td>${s.min ? esc(t("min", { n: s.min })) : "—"}</td><td>${esc(t(s.format))}</td><td class="numc">${s.price === 0 ? esc(t("free")) : esc(s.from ? t("from", { p: money(s.price, lang) }) : money(s.price, lang))}</td></tr>`).join("");
  // Namuna profilda aloqa ma’lumotlari havola emas va «namuna — ishlamaydi» deb belgilanadi
  const fake = `<span class="fakec">${esc(t("fakeContact"))}</span>`;
  const row = (label, value, link) => `<li><span>${esc(label)}:</span> ${l.demo ? `<span class="mono">${esc(value)}</span> ${fake}` : link}</li>`;
  const c = l.contacts;
  const tel = c.phone ? row(t("phone"), c.phone, `<a href="tel:${esc(c.phone.replace(/\s/g, ""))}">${esc(c.phone)}</a>`) : "";
  const tg = c.telegram ? row("Telegram", `@${c.telegram}`, `<a href="https://t.me/${esc(c.telegram)}" target="_blank" rel="noopener noreferrer">@${esc(c.telegram)}</a>`) : "";
  const web = c.website ? row(t("website"), c.website.replace(/^https:\/\//, ""), `<a href="${esc(c.website)}" target="_blank" rel="noopener noreferrer nofollow">${esc(c.website.replace(/^https:\/\//, ""))}</a>`) : "";
  const mail = c.email ? row(t("email"), c.email, `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>`) : "";
  return page({ lang, cssHref, fs, user, accHref, path:`/yuristlar/${l.id}`, title:nm(l.name, lang), desc:pick(l.headline, lang), body:`
    <p><a href="/yuristlar${qs ? `?${esc(qs)}` : ""}">${esc(t("back"))}</a></p>
    ${l.demo ? `<p class="note warn" role="note">${esc(t("demoNote"))}</p>` : ""}
    <section class="card prof">
      ${avatar(l, true)}
      <div><h1>${esc(nm(l.name, lang))}${demoBadge(l, lang)}${l.plan !== "free" ? ` <span class="tag pro">${esc(t("pro"))}</span>` : ""}</h1>
        ${l.firm ? `<p class="meta">${esc(nm(l.firm, lang))}</p>` : ""}
        <p class="meta">${esc(t(l.kind))} · ${esc(t("years", { n: l.experience }))} · ${esc(l.langs.map(x => x.toUpperCase()).join(" / "))} · ${esc(l.license.verified ? t("verified") : t("notVerified"))}</p>
        <p class="head">${esc(pick(l.headline, lang))}</p></div>
    </section>
    <div class="profgrid">
      <div>
        <h2 class="sec">${esc(t("about"))}</h2><p class="pre">${esc(pick(l.about, lang))}</p>
        ${l.education ? `<h2 class="sec">${esc(t("education"))}</h2><p class="pre">${esc(l.education)}</p>` : ""}
        ${l.achievements ? `<h2 class="sec">${esc(t("achievements"))}</h2><p class="pre">${esc(l.achievements)}</p>` : ""}
        ${l.license?.number ? `<p class="small muted">${esc(t("licenseNo"))}: ${esc(l.license.number)}${l.license.issuer ? ` · ${esc(l.license.issuer)}` : ""}</p>` : ""}
        <h2 class="sec">${esc(t("areas"))}</h2><ul class="chips">${l.areas.map(a => `<li><a href="/yuristlar?soha=${a}">${esc(areas.find(x => x.id === a)?.title || a)}</a></li>`).join("")}</ul>
        <h2 class="sec">${esc(t("services"))}</h2>
        <div class="tscroll" tabindex="0"><table class="svc"><thead><tr><th scope="col">${esc(t("svc"))}</th><th scope="col">${esc(t("dur"))}</th><th scope="col">${esc(t("fmt"))}</th><th scope="col" class="numc">${esc(t("price"))}</th></tr></thead><tbody>${svc}</tbody></table></div>
        <h2 class="sec">${esc(t("howTitle"))}</h2><ol class="lwhow"><li>${esc(t("how1"))}</li><li>${esc(t("how2"))}</li><li>${esc(t("how3"))}</li></ol>
        <p class="small muted">${esc(t("privacy"))}</p>
      </div>
      <aside class="card side">
        <h2>${esc(t("contacts"))}</h2><ul class="contact">${tel}${tg}${mail}${web}</ul>
        <h2>${esc(t("where"))}</h2><p>${esc(regionName(l.region, lang))}, ${esc(pick(l.address, lang))}</p><p class="muted">${esc(pick(l.hours, lang))}</p>
        <p class="meta">${l.formats.map(f => esc(t(f))).join(" · ")}</p>
        ${l.demo ? `<p class="note warn" role="note">${esc(t("demoNoReq"))}</p>` : requestBox(l, lang, user, query)}
      </aside>
    </div>` });
}

function requestBox(l, lang, user, query){
  const t = tr(lang), sc = typeof query.holat === "string" && kbFor(lang === "ru" ? "ru" : "uz").SCENARIO_BY_ID[query.holat];
  if (!user) return `<h2>${esc(t("reqTitle"))}</h2><p>${esc(t("reqLogin"))}</p><a class="btn primary" href="/kirish?next=${encodeURIComponent(`/yuristlar/${l.id}`)}">${esc(t("navLogin"))}</a>`;
  if (l.userId === user.id) return "";
  return `<h2 id="reqH">${esc(t("reqTitle"))}</h2><form class="kform" data-api="/api/consultations" data-next="/hisob" aria-labelledby="reqH">
    <input type="hidden" name="lawyer" value="${l.dbId}">${sc ? `<input type="hidden" name="scenario" value="${esc(sc.id)}"><p class="small">${esc(cy(sc.title, lang))}</p>` : ""}
    <div class="field"><label for="rq_fmt">${esc(t("fmt"))}</label><select id="rq_fmt" name="format">${l.formats.map(f => `<option value="${f}">${esc(t(f))}</option>`).join("")}</select></div>
    <div class="field"><label for="rq_msg">${esc(t("reqMsg"))}</label><textarea id="rq_msg" name="message" required minlength="10" maxlength="1500" rows="5"></textarea></div>
    <button class="btn primary" type="submit">${esc(t("reqSend"))}</button><p class="err" data-err hidden></p>
    <p class="small muted">${esc(t("reqNote"))}</p></form>`;
}

// Kabinet faqat Yurist Pro (sinov yoki faol) obunachilari uchun; qolganlarga — imkoniyatlar va obuna yo‘li
export function cabinetPage({ lang, cssHref, fs, jsHref, user, accHref, pro, db }){
  const t = tr(lang);
  const open = user && (pro?.tools || user.role === "admin");
  if (!open){
    const list = FEAT.pro.map(f => `<li>${esc(pick(f, lang))}</li>`).join("");
    const cta = !db ? `<p class="note warn">${esc(t("cabNoDb"))}</p>`
      : !user ? `<p class="rowbtn"><a class="btn primary" href="/royxat?rol=lawyer&next=/kabinet">${esc(t("cabRegister"))}</a><a class="btn ghost" href="/kirish?next=/kabinet">${esc(t("navLogin"))}</a></p>`
      : `<p class="rowbtn"><button class="btn primary" type="button" data-post="/api/subscriptions" data-body='${esc(JSON.stringify({ plan: "pro" }))}'>${esc(t("plSubscribe"))}</button><a class="btn ghost" href="/tariflar">${esc(t("navPlans"))}</a></p><p class="err" data-err hidden></p>`;
    return page({ lang, cssHref, fs, user, accHref, path:"/kabinet", title:t("cabTitle"), desc:t("plLead"), body:`
      <section class="cabgate"><h1>${esc(t("cabTitle"))}</h1><p class="lead">${esc(user ? t("cabNeedPro") : t("cabLead"))}</p>
      <ul class="feat featlist">${list}</ul>${cta}</section>` });
  }
  return page({ lang, cssHref, fs, user, accHref, path:"/kabinet", title:t("cabTitle"), desc:t("plLead"),
    body:`<div id="kab" class="kab" data-lang="${lang}" data-sync="1"><h1>${esc(t("cabTitle"))}</h1><noscript><p class="card">${esc(t("cabNoJs"))}</p></noscript></div>`,
    scripts:`<script type="module" src="${jsHref}"></script>` });
}

// ---------- Yuristning katalogga qo‘shilish arizasi (moderatsiya uchun faylga yoziladi) ----------
const KINDS = ["advokat", "yurist", "firma", "mediator"];
export function vLawyerApply(b){
  if (b?.consent !== true) throw new ValidationError("consent");
  const s = (k, max, req) => { const v = clean(b?.[k], max); if (req && v.length < 2) throw new ValidationError("required", { label: k }); return v; };
  const phone = s("phone", 40, true);
  if (!/^[+\d\s()-]{7,40}$/.test(phone)) throw new ValidationError("phone");
  const email = s("email", 120);
  if (email && !/^[^\s@]{1,64}@[^\s@]{1,100}\.[a-z]{2,}$/i.test(email)) throw new ValidationError("email");
  const kind = KINDS.includes(b?.kind) ? b.kind : "yurist";
  const ids = new Set(areaList("uz").map(a => a.id));
  const areas = Array.isArray(b?.areas) ? [...new Set(b.areas.filter(a => ids.has(a)))].slice(0, 8) : [];
  const region = COURTS.regions.some(r => r.name === b?.region) ? b.region : "";
  const price = Number(String(b?.price ?? "").replace(/\D/g, "")) || 0;
  return { kind, name: s("name", 120, true), firm: s("firm", 160), license: s("license", 60), region, district: s("district", 80),
    phone, email, areas, formats: ["online", "office"].filter(f => (b?.formats || []).includes(f)), langs: ["uz", "ru", "en"].filter(f => (b?.langs || []).includes(f)),
    experience: Math.min(70, Math.max(0, Math.round(Number(b?.experience) || 0))), price: Math.min(1e9, price), headline: s("headline", 200), about: s("about", 1500) };
}
export function saveApplication(app, file = APPS_FILE){
  mkdirSync(dirname(file), { recursive: true });
  appendFileSync(file, JSON.stringify({ at: new Date().toISOString(), status: "pending", ...app }) + "\n", "utf8");
}

// ---------- Blanka va o‘z shabloni (Yurist Pro) ----------
export function vLetterhead(v){
  if (!Array.isArray(v)) return [];
  return v.slice(0, 4).map(x => clean(x, 120)).filter(Boolean);
}
export function vCustom(b){
  const title = clean(b?.title, 120), text = String(b?.text ?? "").replace(/\r\n?/g, "\n").replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, "").slice(0, 20000).trim();
  if (text.length < 2) throw new ValidationError("docText");
  return { title, text, letterhead: vLetterhead(b?.letterhead) };
}

// ---------- Maxfiylik ----------
// Faqat kodda haqiqatan bajariladigan narsalar yoziladi (stats.js, photo.js, auth.js, bot/). Huquqiy ko‘rib chiqish kerak.
const PV = {
  title: ["Maxfiylik", "Конфиденциальность"],
  lead: ["HuquqYo‘l qaysi ma’lumotlarni ishlatadi, qayerda saqlaydi va ularni qanday o‘chirish mumkin.", "Какие данные использует HuquqYo‘l, где хранит и как их удалить."],
  h1: ["Hisobsiz foydalanish", "Без аккаунта"],
  p1: ["Ariza uchun kiritgan ma’lumotlaringiz (ism, manzil, holat tafsilotlari) faqat shu brauzerda saqlanadi. Ularni istalgan vaqtda pastdagi «Ma’lumotlarimni o‘chirish» havolasi bilan o‘chirishingiz mumkin.", "Данные для заявления (ФИО, адрес, детали ситуации) хранятся только в этом браузере. Их можно в любой момент удалить по ссылке «Удалить мои данные» внизу страницы."],
  h2: ["Tahlil va hujjat", "Анализ и документ"],
  p2: ["Holat matni tahlil uchun serverga yuboriladi va saqlanmaydi. Ariza ma’lumotlari faqat DOCX yoki PDF fayl yasash uchun ishlatiladi.", "Текст ситуации отправляется на сервер для анализа и не сохраняется. Данные заявления используются только для создания файла DOCX или PDF."],
  pAi: ["Hozir AI rejimi yoqilgan: tahlil uchun matn Anthropic (Claude, AQSH) ga uzatiladi.", "Сейчас включён режим AI: для анализа текст передаётся в Anthropic (Claude, США)."],
  pNoAi: ["Hozir AI rejimi o‘chirilgan: tahlil faqat shu serverda, qoidalar bilan bajariladi.", "Сейчас режим AI выключен: анализ выполняется только на этом сервере, по правилам."],
  h3: ["Hujjat rasmi va PDF", "Фото документа и PDF"],
  p3: ["Rasm o‘qish uchun serverga yuboriladi: faqat so‘rov davomida xotirada turadi, saqlanmaydi va logga yozilmaydi. PDF faylning o‘zi serverga yuborilmaydi — brauzer undan matn yoki sahifa rasmlarini oladi.", "Фото отправляется на сервер для распознавания: находится в памяти только во время запроса, не сохраняется и не пишется в журнал. Сам PDF-файл на сервер не отправляется — браузер извлекает из него текст или изображения страниц."],
  h4: ["Anonim statistika", "Анонимная статистика"],
  p4: ["Faqat sonlar saqlanadi: qaysi soha va holat ochilgani, nechta hujjat yasalgani. Matn, ariza ma’lumotlari, IP manzil va cookie saqlanmaydi.", "Сохраняются только числа: какие области и ситуации открывались, сколько документов создано. Текст, данные заявлений, IP-адрес и cookie не сохраняются."],
  h5: ["Cookie", "Cookie"],
  p5: ["hy_lang — til, hy_fs — shrift o‘lchami, hy_theme — mavzu, hy_photo — rasm paneli yopilgani. Hisobga kirsangiz — kirish uchun sessiya cookie (HttpOnly).", "hy_lang — язык, hy_fs — размер шрифта, hy_theme — тема, hy_photo — закрыта ли панель фото. Если вы вошли в аккаунт — cookie сессии (HttpOnly, только для входа)."],
  h6: ["Hisob", "Аккаунт"],
  p6: ["Ro‘yxatdan o‘tsangiz, e-pochta, ism, telefon (ixtiyoriy) va rol bazada saqlanadi; parol faqat xesh ko‘rinishida. Yuristga so‘rov yuborsangiz, xabaringizni o‘sha yurist ko‘radi.", "При регистрации в базе хранятся эл. почта, имя, телефон (необязательно) и роль; пароль — только в виде хеша. Если вы отправите запрос юристу, ваше сообщение увидит этот юрист."],
  h7: ["Telegram bot", "Telegram-бот"],
  p7: ["Bot suhbat holatini faqat xotirada, 1 soatgacha saqlaydi; /delete buyrug‘i uni darhol o‘chiradi. Xabarlar matni logga yozilmaydi.", "Бот хранит состояние диалога только в памяти, до 1 часа; команда /delete сразу его удаляет. Текст сообщений не пишется в журнал."],
  botSoon: ["Bot havolasi tez orada shu yerda bo‘ladi.", "Ссылка на бота скоро появится здесь."],
  botOpen: ["Botni ochish", "Открыть бота"]
};
export function privacyPage({ lang, cssHref, fs, user, accHref, ai = false, botUrl = "" }){
  // Texnik nomlar (cookie nomlari, buyruqlar, fayl turlari) kirillga o‘girilmaydi
  const keep = /(hy_\w+|HttpOnly|[Cc]ookie|\/delete|Anthropic|Claude|DOCX|PDF|AI|Telegram)/;
  const p = k => { const s = PV[k][idx(lang)]; return lang === "cyr" ? s.split(keep).map((x, i) => i % 2 ? x : toCyrillic(x)).join("") : s; };
  const mt = makeT(lang);
  const bot = /^https:\/\/t\.me\/\w{5,32}$/.test(botUrl || "") ? botUrl : "";
  const sec = (h, ...ps) => `<section class="pvsec"><h2 class="sec">${esc(p(h))}</h2>${ps.map(x => `<p>${esc(p(x))}</p>`).join("")}</section>`;
  return page({ lang, cssHref, fs, user, accHref, path: "/maxfiylik", title: p("title"), desc: p("lead"), body: `
    <h1>${esc(p("title"))}</h1><p class="lead">${esc(p("lead"))}</p>
    ${sec("h1", "p1")}${sec("h2", "p2", ai ? "pAi" : "pNoAi")}${sec("h3", "p3")}${sec("h4", "p4")}${sec("h5", "p5")}${sec("h6", "p6")}
    <section class="pvsec" id="bot"><h2 class="sec">${esc(p("h7"))}</h2><p>${esc(p("p7"))}</p>
      <p>${bot ? `<a class="btn ghost" href="${esc(bot)}" target="_blank" rel="noopener noreferrer">${esc(p("botOpen"))}<span class="sr"> ${esc(mt("newTab"))}</span></a>` : esc(p("botSoon"))}</p></section>` });
}
