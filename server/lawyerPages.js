// Yurist sahifalari: «Hisobim» dagi yurist paneli, profilni tahrirlash (/hisob/profil), statistika va tahlil (/hisob/statistika).
import { page, areaList } from "./business.js";
import { esc, money, date, field } from "./accountPages.js";
import { fmtSum } from "../public/i18n.js";
import { toCyrillic } from "../public/translit.js";
import { COURTS, kbFor } from "./kb.js";
import { PRICES } from "./market.js";

const T = {
  panelTitle: ["Yurist paneli", "Панель юриста"],
  pro_paid: ["Yurist Pro faol", "Юрист Pro активен"], pro_trial: ["Sinov muddati", "Пробный период"], pro_none: ["Yurist Pro faol emas", "Юрист Pro не активен"],
  until: ["{d} gacha", "до {d}"],
  cat_visible: ["Katalogda ko‘rinadi", "Виден в каталоге"], cat_pending: ["Moderatsiyada: litsenziya tekshirilmoqda", "На модерации: проверяется лицензия"],
  cat_rejected: ["Rad etildi", "Отклонено"], cat_nopro: ["Katalogda ko‘rinishi uchun Yurist Pro to‘lovi kerak", "Для показа в каталоге нужна оплата «Юрист Pro»"],
  cat_none: ["Profil to‘ldirilmagan", "Профиль не заполнен"],
  complete: ["Profil to‘liqligi: {p}%", "Заполненность профиля: {p}%"], missing: ["Qo‘shing: {list}", "Добавьте: {list}"],
  m_photo: ["rasm", "фото"], m_headline: ["qisqa tavsif", "краткое описание"], m_about: ["o‘zingiz haqida", "о себе"], m_education: ["ta’lim", "образование"],
  m_services: ["xizmatlar va narxlar", "услуги и цены"], m_areas: ["sohalar", "сферы"], m_region: ["hudud", "регион"], m_license: ["litsenziya", "лицензия"], m_contact: ["Telegram yoki e-pochta", "Telegram или почта"],
  editProfile: ["Profilni tahrirlash", "Редактировать профиль"], viewProfile: ["Katalogda ko‘rish", "Посмотреть в каталоге"],
  kViews: ["Profil ko‘rishlari (30 kun)", "Просмотры профиля (30 дней)"], kReq: ["So‘rovlar", "Запросы"], kAgreed: ["Kelishuvlar", "Договорённости"], kValue: ["Kelishuvlar summasi", "Сумма договорённостей"],
  toolsTitle: ["Yurist Pro vositalari", "Инструменты «Юрист Pro»"],
  t_clients: ["Mijozlar va ishlar kartotekasi", "Картотека клиентов и дел"], d_clients: ["Har bir mijoz, ish, sud va ish raqami bitta joyda.", "Каждый клиент, дело, суд и номер дела — в одном месте."],
  t_cal: ["Barcha muddatlar bitta kalendarda", "Все сроки в одном календаре"], d_cal: ["O‘tib ketayotgan muddatlar ajratiladi, telefon kalendariga .ics eksport.", "Истекающие сроки выделены, экспорт .ics в календарь телефона."],
  t_blank: ["O‘z blankasi, shablon tahriri", "Свой бланк и редактор шаблонов"], d_blank: ["Barcha arizalar rekvizitlaringiz bilan; o‘z shablonlaringiz PDF va DOCX da.", "Все документы с вашими реквизитами; свои шаблоны в PDF и DOCX."],
  t_stats: ["Statistika va tahlil", "Статистика и аналитика"], d_stats: ["Ko‘rishlar, so‘rovlar, konversiya, daromad va sohalar bo‘yicha tahlil.", "Просмотры, запросы, конверсия, доход и разбивка по сферам."],
  t_catalog: ["Katalogda profil — yangi mijozlar", "Профиль в каталоге — новые клиенты"], d_catalog: ["Rasm, tajriba, narxlar; fuqarolar sizga to‘g‘ridan-to‘g‘ri murojaat qiladi.", "Фото, опыт, цены; граждане обращаются к вам напрямую."],
  t_org: ["Hujjatlar kutubxonasi", "Библиотека документов"], d_org: ["Nizomlar, qoidalar, buyruqlar va qonunlar havolalari bir joyda.", "Уставы, правила, приказы и ссылки на законы в одном месте."],
  open: ["Ochish", "Открыть"], locked: ["Pro kerak", "Нужен Pro"],
  ctaTitle: ["Yurist Pro ni faollashtiring", "Активируйте «Юрист Pro»"],
  ctaText: ["Katalogda ko‘rinish va yangi mijozlar, kartoteka, kalendar, blanka, shablonlar va statistika — oyiga {p}.", "Показ в каталоге и новые клиенты, картотека, календарь, бланк, шаблоны и статистика — {p} в месяц."],
  ctaTrial: ["Sinov muddatida barcha vositalar ochiq, lekin katalogda ko‘rinish faqat to‘lovdan keyin.", "В пробный период все инструменты открыты, но показ в каталоге — только после оплаты."],
  ctaPending: ["To‘lov kutilmoqda: hisob-faktura yaratilgan, to‘lov tasdiqlangach Pro faollashadi.", "Ожидается оплата: счёт создан, Pro активируется после подтверждения."],
  ctaBtn: ["Yurist Pro ga obuna bo‘lish", "Оформить «Юрист Pro»"],
  // Profil formasi
  pfTitle: ["Profilni tahrirlash", "Редактирование профиля"],
  pfLead: ["Fuqarolar katalogda aynan shu ma’lumotlarni ko‘radi. Ism, turi yoki litsenziya o‘zgarsa, profil qayta moderatsiyaga tushadi.", "Граждане видят в каталоге именно эти данные. При изменении имени, типа или лицензии профиль снова проходит модерацию."],
  sPhoto: ["Rasm", "Фото"], photoHint: ["Yuzingiz aniq ko‘ringan, yorug‘ rasm. Avtomatik 480×480 ga kichraytiriladi (JPEG, PNG yoki WEBP).", "Светлое фото, на котором хорошо видно лицо. Автоматически уменьшается до 480×480 (JPEG, PNG или WEBP)."],
  photoPick: ["Rasm yuklash", "Загрузить фото"], photoDel: ["Rasmni o‘chirish", "Удалить фото"], photoFirst: ["Rasm yuklash uchun avval profilni saqlang.", "Чтобы загрузить фото, сначала сохраните профиль."],
  sMain: ["Asosiy ma’lumotlar", "Основные данные"], kind: ["Kim", "Кто"], name: ["F.I.Sh. yoki firma nomi", "ФИО или название фирмы"], firm: ["Byuro yoki firma (ixtiyoriy)", "Бюро или фирма (необязательно)"],
  experience: ["Tajriba (yil)", "Опыт (лет)"], license: ["Litsenziya yoki guvohnoma raqami", "Номер лицензии или удостоверения"], licenseIssuer: ["Kim bergan va qachon", "Кем и когда выдана"],
  headline: ["Qisqa tavsif (katalog kartasida)", "Кратко (в карточке каталога)"], headlineHint: ["Masalan: Mehnat nizolari, ish haqi va ishga tiklash", "Например: Трудовые споры, зарплата и восстановление на работе"],
  sAbout: ["Tajriba va malaka", "Опыт и квалификация"], about: ["O‘zingiz haqida", "О себе"], education: ["Ta’lim, malaka oshirish", "Образование, повышение квалификации"], achievements: ["Yutuqlar, muhim ishlar, a’zoliklar", "Достижения, важные дела, членства"],
  sAreas: ["Faoliyat sohalari", "Сферы практики"], sFormat: ["Xizmat shakli va tillar", "Формат и языки"],
  online: ["Onlayn", "Онлайн"], office: ["Ofisda", "В офисе"], l_uz: ["O‘zbek", "Узбекский"], l_ru: ["Rus", "Русский"], l_en: ["Ingliz", "Английский"],
  sServices: ["Xizmatlar va narxlar", "Услуги и цены"], svcName: ["Xizmat", "Услуга"], svcMin: ["Daqiqa", "Минуты"], svcFmt: ["Shakl", "Формат"], svcPrice: ["Narx, so‘m (0 — bepul)", "Цена, сум (0 — бесплатно)"], svcFrom: ["«dan» (narx boshlanadi)", "«от» (цена от)"],
  svcHint: ["Bo‘sh qator saqlanmaydi. Katalogda eng arzon xizmat narxi ko‘rinadi.", "Пустые строки не сохраняются. В каталоге показывается самая низкая цена."],
  sContact: ["Aloqa va manzil", "Контакты и адрес"], region: ["Hudud", "Регион"], district: ["Tuman yoki shahar", "Район или город"], address: ["Ofis manzili", "Адрес офиса"],
  hours: ["Ish vaqti", "Часы работы"], hoursHint: ["Masalan: Du–Ju 09:00–18:00", "Например: Пн–Пт 09:00–18:00"], phone: ["Telefon", "Телефон"], email: ["E-pochta", "Эл. почта"], telegram: ["Telegram (username)", "Telegram (username)"], website: ["Veb-sayt (https://…)", "Сайт (https://…)"],
  save: ["Saqlash", "Сохранить"], saved: ["Saqlandi.", "Сохранено."], back: ["← Yurist paneli", "← Панель юриста"],
  k_advokat: ["Advokat", "Адвокат"], k_yurist: ["Yurist", "Юрист"], k_firma: ["Yuridik firma", "Юридическая фирма"], k_mediator: ["Mediator", "Медиатор"],
  // Statistika
  stTitle: ["Statistika va tahlil", "Статистика и аналитика"],
  stViews7: ["Ko‘rishlar (7 kun)", "Просмотры (7 дней)"], stViews30: ["Ko‘rishlar (30 kun)", "Просмотры (30 дней)"], stViewsAll: ["Ko‘rishlar (jami)", "Просмотры (всего)"],
  stConv: ["Ko‘rishdan so‘rovga", "Из просмотра в запрос"], stWin: ["So‘rovdan kelishuvga", "Из запроса в договорённость"], stAvg: ["O‘rtacha kelishuv narxi", "Средняя цена договорённости"],
  stComm: ["Platforma komissiyasi", "Комиссия платформы"], stNet: ["Sizga qoladi", "Остаётся вам"],
  stDaily: ["Profil ko‘rishlari — so‘nggi 30 kun", "Просмотры профиля — последние 30 дней"], stFunnel: ["So‘rovlar voronkasi", "Воронка запросов"],
  f_requested: ["Javob kutmoqda", "Ждут ответа"], f_offered: ["Narx taklif qilingan", "Предложена цена"], f_agreed: ["Kelishuv (jami)", "Договорённости (всего)"], f_completed: ["Bajarilgan", "Выполнено"], f_lost: ["Rad / bekor", "Отклонено / отменено"],
  stMonth: ["Oylar bo‘yicha", "По месяцам"], month: ["Oy", "Месяц"], requests: ["So‘rovlar", "Запросы"], agreed: ["Kelishuvlar", "Договорённости"], value: ["Summa", "Сумма"],
  stDomain: ["Sohalar bo‘yicha so‘rovlar", "Запросы по сферам"], domain: ["Soha", "Сфера"], count: ["Soni", "Кол-во"],
  stRecent: ["So‘nggi so‘rovlar", "Последние запросы"], none: ["Hozircha bu yerda hech narsa yo‘q.", "Пока здесь ничего нет."],
  noProfile: ["Statistika uchun avval profilni to‘ldiring.", "Для статистики сначала заполните профиль."]
};
const L = lang => (k, v = {}) => { const s = (T[k] || [k, k])[lang === "ru" ? 1 : 0].replace(/\{(\w+)\}/g, (_, x) => v[x] ?? ""); return lang === "cyr" ? toCyrillic(s) : s; };
const initials = n => String(n || "").split(/\s+/).filter(w => /^\p{L}/u.test(w)).slice(0, 2).map(w => w[0]).join("").toUpperCase() || "•";
const photoUrl = p => p?.photo_at ? `/yuristlar/rasm/${p.id}?v=${new Date(p.photo_at).getTime()}` : null;
const avatar = (p, name, size = 96) => photoUrl(p)
  ? `<img class="ava big photo" src="${esc(photoUrl(p))}" alt="" width="${size}" height="${size}" data-photo-img>`
  : `<div class="ava big" aria-hidden="true" data-photo-img>${esc(initials(name))}</div>`;
const tile = (v, label, cls = "") => `<div class="stattile${cls ? " " + cls : ""}"><div class="stv">${v}</div><div class="stl">${esc(label)}</div></div>`;
const pct = (a, b) => b ? Math.round(a / b * 100) : 0;
const ICON = {
  clients: '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19.5c.6-3.2 2.9-5 5.5-5s4.9 1.8 5.5 5"/><path d="M16 4.5h4.5M16 8.5h4.5M17.5 12.5h3"/>',
  cal: '<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="M8 14h2M14 14h2M8 17h2"/>',
  blank: '<path d="M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-10A1.5 1.5 0 0 1 6 19V5A1.5 1.5 0 0 1 7.5 3.5z"/><path d="M9 8h4M9 12h6M9 16h6"/>',
  stats: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  catalog: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/><path d="M8.5 11h5M11 8.5v5"/>',
  org: '<path d="M4 20V6l8-3 8 3v14"/><path d="M9 20v-5h6v5M8 9h2M14 9h2M8 12h2M14 12h2"/>'
};
const svg = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICON[k]}</svg>`;

// Katalog holati: qachon fuqarolarga ko‘rinadi
export function catalogState(profile, pro){
  if (!profile) return "none";
  if (profile.status === "rejected") return "rejected";
  if (profile.status !== "approved") return "pending";
  return pro.paid ? "visible" : "nopro";
}
function completeness(p){
  if (!p) return { pct: 0, missing: ["m_photo", "m_headline", "m_about", "m_services"] };
  const checks = [["m_photo", !!p.photo_at], ["m_headline", !!p.headline], ["m_about", (p.about || "").length >= 60], ["m_education", !!p.education],
    ["m_services", (p.services || []).length > 0], ["m_areas", (p.areas || []).length > 0], ["m_region", !!p.region], ["m_license", !!p.license], ["m_contact", !!(p.telegram || p.email)]];
  return { pct: Math.round(checks.filter(c => c[1]).length / checks.length * 100), missing: checks.filter(c => !c[1]).map(c => c[0]) };
}

export function lawyerPanel({ lang, user, profile, pro, stats, pendingSub }){
  const t = L(lang), cat = catalogState(profile, pro), c = completeness(profile);
  const proChip = pro.paid ? `<span class="chip ok">✓ ${esc(t("pro_paid"))}${pro.endsAt ? ` · ${esc(t("until", { d: date(pro.endsAt, lang) }))}` : ""}</span>`
    : pro.trial ? `<span class="chip warn">${esc(t("pro_trial"))} · ${esc(t("until", { d: date(pro.endsAt, lang) }))}</span>` : `<span class="chip">${esc(t("pro_none"))}</span>`;
  const catChip = `<span class="chip ${cat === "visible" ? "ok" : cat === "rejected" ? "bad" : "warn"}">${cat === "visible" ? "✓ " : ""}${esc(t("cat_" + cat))}${cat === "rejected" && profile.review_note ? `: ${esc(profile.review_note)}` : ""}</span>`;
  const tools = [["clients", "t_clients", "d_clients", "/kabinet#mijozlar"], ["cal", "t_cal", "d_cal", "/kabinet#kalendar"], ["blank", "t_blank", "d_blank", "/kabinet#blanka"],
    ["stats", "t_stats", "d_stats", "/hisob/statistika"], ["catalog", "t_catalog", "d_catalog", "/hisob/profil"], ["org", "t_org", "d_org", "/kabinet#tashkilot"]];
  const free = k => k === "catalog";                     // profilni to‘ldirish Pro’siz ham mumkin (katalogda ko‘rinishi — Pro bilan)
  const toolHTML = tools.map(([ic, tt, dd, href]) => { const open = pro.tools || free(ic);
    return `<a class="tool${open ? "" : " locked"}" href="${open ? href : "/tariflar"}"><span class="tic">${svg(ic)}</span><span class="tbody"><b>${esc(t(tt))}</b><span>${esc(t(dd))}</span></span>
      <span class="tgo">${open ? esc(t("open")) + " →" : `🔒 ${esc(t("locked"))}`}</span></a>`; }).join("");
  const cta = pro.paid ? "" : `<section class="card procta" aria-labelledby="ctaH"><div><h2 id="ctaH">${esc(t("ctaTitle"))}</h2>
      <p>${esc(t("ctaText", { p: money(PRICES.pro, lang) }))}</p>${pro.trial ? `<p class="small">${esc(t("ctaTrial"))}</p>` : ""}</div>
      ${pendingSub ? `<p class="chip warn">${esc(t("ctaPending"))}</p>` : `<button class="btn primary" type="button" data-post="/api/subscriptions" data-body='${esc(JSON.stringify({ plan: "pro" }))}'>${esc(t("ctaBtn"))}</button>`}<p class="err" data-err hidden></p></section>`;
  return `<section class="card lwpanel" aria-labelledby="lpH">
      ${avatar(profile, profile?.name || user.name)}
      <div class="lpbody"><h2 id="lpH">${esc(profile?.name || user.name)}</h2>
        <p class="chips2">${proChip}${catChip}</p>
        <div class="meter" role="img" aria-label="${esc(t("complete", { p: c.pct }))}"><svg width="100%" height="8" aria-hidden="true" focusable="false"><rect class="track" width="100%" height="8" rx="4"/><rect class="fill" width="${Math.max(2, c.pct)}%" height="8" rx="4"/></svg></div>
        <p class="small muted">${esc(t("complete", { p: c.pct }))}${c.missing.length ? ` · ${esc(t("missing", { list: c.missing.map(m => t(m)).join(", ") }))}` : ""}</p>
        <p class="rowbtn"><a class="btn primary" href="/hisob/profil">${esc(t("editProfile"))}</a>${cat === "visible" ? `<a class="btn ghost" href="/yuristlar/y${profile.id}">${esc(t("viewProfile"))}</a>` : ""}</p></div>
    </section>
    ${cta}
    ${profile ? `<div class="kabstats">${tile(fmtSum(stats?.views.d30 || 0), t("kViews"))}${tile(fmtSum(stats?.cons.total || 0), t("kReq"))}${tile(fmtSum(stats?.cons.agreed || 0), t("kAgreed"))}${tile(esc(money(stats?.cons.value || 0, lang)), t("kValue"))}</div>` : ""}
    <h2 class="sec">${esc(t("toolsTitle"))}</h2><div class="tools">${toolHTML}</div>`;
}

export function profileEditPage({ lang, cssHref, fs, user, accHref, profile }){
  const t = L(lang), p = profile || {}, areas = areaList(lang);
  const inp = (n, v, attrs = "") => `<input id="p_${n}" name="${n}" value="${esc(v ?? "")}" ${attrs}>`;
  const ta = (n, v, rows, max) => `<textarea id="p_${n}" name="${n}" rows="${rows}" maxlength="${max}">${esc(v || "")}</textarea>`;
  const sel = (n, opts, cur) => `<select id="p_${n}" name="${n}">${opts.map(([v, label]) => `<option value="${esc(v)}"${v === cur ? " selected" : ""}>${esc(label)}</option>`).join("")}</select>`;
  const checks = (n, opts, cur = []) => `<div class="checks">${opts.map(([v, label]) => `<label class="check"><input type="checkbox" name="${n}[]" value="${esc(v)}"${cur.includes(v) ? " checked" : ""}> ${esc(label)}</label>`).join("")}</div>`;
  const svcs = [...(p.services || []), ...Array(Math.max(0, 4 - (p.services || []).length)).fill({})].slice(0, 8);
  const svcRows = svcs.map((s, i) => `<tr>
      <td><input name="services[${i}][name]" value="${esc(s.name || "")}" maxlength="120" aria-label="${esc(t("svcName"))} ${i + 1}"></td>
      <td><input name="services[${i}][min]" value="${s.min || ""}" inputmode="numeric" maxlength="3" aria-label="${esc(t("svcMin"))} ${i + 1}"></td>
      <td><select name="services[${i}][format]" aria-label="${esc(t("svcFmt"))} ${i + 1}"><option value="online"${s.format !== "office" ? " selected" : ""}>${esc(t("online"))}</option><option value="office"${s.format === "office" ? " selected" : ""}>${esc(t("office"))}</option></select></td>
      <td><input name="services[${i}][price]" value="${s.price ?? ""}" inputmode="numeric" maxlength="12" aria-label="${esc(t("svcPrice"))} ${i + 1}"></td>
      <td class="c"><input type="checkbox" name="services[${i}][from]"${s.from ? " checked" : ""} aria-label="${esc(t("svcFrom"))} ${i + 1}"></td></tr>`).join("");
  const regionOpts = [["", "—"], ...COURTS.regions.map(r => [r.name, lang === "ru" ? r.cyr : lang === "cyr" ? toCyrillic(r.name) : r.name])];
  return page({ lang, cssHref, fs, user, accHref, path: "/hisob/profil", title: t("pfTitle"), desc: t("pfLead"), body: `
    <p><a href="/hisob">${esc(t("back"))}</a></p><h1>${esc(t("pfTitle"))}</h1><p class="lead">${esc(t("pfLead"))}</p>
    <section class="card photobox" aria-labelledby="phH"><h2 id="phH">${esc(t("sPhoto"))}</h2>
      <div class="phrow">${avatar(profile, p.name || user.name, 120)}
        <div><p class="small muted">${esc(p.id ? t("photoHint") : t("photoFirst"))}</p>
        ${p.id ? `<p class="rowbtn"><label class="btn primary filebtn">${esc(t("photoPick"))}<input type="file" accept="image/jpeg,image/png,image/webp" class="sr" data-photo="/api/lawyer/photo"></label>
          ${p.photo_at ? `<button class="btn ghost" type="button" data-post="/api/lawyer/photo" data-body='{"remove":true}'>${esc(t("photoDel"))}</button>` : ""}</p>` : ""}
        <p class="err" data-err role="alert" hidden></p></div></div></section>
    <form class="kform profform" data-api="/api/lawyer/profile" data-ok="${esc(t("saved"))}" data-reload>
      <fieldset class="card"><legend>${esc(t("sMain"))}</legend><div class="grid2">
        ${field("p_kind", t("kind"), sel("kind", [["advokat", t("k_advokat")], ["yurist", t("k_yurist")], ["firma", t("k_firma")], ["mediator", t("k_mediator")]], p.kind || "yurist"))}
        ${field("p_name", t("name"), inp("name", p.name || user.name, 'required maxlength="120" autocomplete="name"'))}
        ${field("p_firm", t("firm"), inp("firm", p.firm, 'maxlength="160"'))}
        ${field("p_experience", t("experience"), inp("experience", p.experience, 'inputmode="numeric" maxlength="2"'))}
        ${field("p_license", t("license"), inp("license", p.license, 'maxlength="60"'))}
        ${field("p_licenseIssuer", t("licenseIssuer"), inp("licenseIssuer", p.license_issuer, 'maxlength="160"'))}</div>
        ${field("p_headline", t("headline"), inp("headline", p.headline, 'maxlength="200"'), t("headlineHint"))}</fieldset>
      <fieldset class="card"><legend>${esc(t("sAbout"))}</legend>
        ${field("p_about", t("about"), ta("about", p.about, 6, 3000))}
        ${field("p_education", t("education"), ta("education", p.education, 3, 1500))}
        ${field("p_achievements", t("achievements"), ta("achievements", p.achievements, 3, 1500))}</fieldset>
      <fieldset class="card"><legend>${esc(t("sAreas"))}</legend>${checks("areas", areas.map(a => [a.id, a.title]), p.areas)}</fieldset>
      <fieldset class="card"><legend>${esc(t("sFormat"))}</legend>${checks("formats", [["online", t("online")], ["office", t("office")]], p.formats || ["online"])}${checks("langs", [["uz", t("l_uz")], ["ru", t("l_ru")], ["en", t("l_en")]], p.langs || ["uz"])}</fieldset>
      <fieldset class="card"><legend>${esc(t("sServices"))}</legend>
        <div class="tscroll" tabindex="0"><table class="svcedit"><thead><tr><th scope="col">${esc(t("svcName"))}</th><th scope="col">${esc(t("svcMin"))}</th><th scope="col">${esc(t("svcFmt"))}</th><th scope="col">${esc(t("svcPrice"))}</th><th scope="col">${esc(t("svcFrom"))}</th></tr></thead><tbody>${svcRows}</tbody></table></div>
        <p class="hint">${esc(t("svcHint"))}</p></fieldset>
      <fieldset class="card"><legend>${esc(t("sContact"))}</legend><div class="grid2">
        ${field("p_region", t("region"), sel("region", regionOpts, p.region || ""))}
        ${field("p_district", t("district"), inp("district", p.district, 'maxlength="80"'))}
        ${field("p_address", t("address"), inp("address", p.address, 'maxlength="200" autocomplete="street-address"'))}
        ${field("p_hours", t("hours"), inp("hours", p.hours, 'maxlength="120"'), t("hoursHint"))}
        ${field("p_phone", t("phone"), inp("phone", p.phone || user.phone, 'type="tel" required maxlength="40" autocomplete="tel"'))}
        ${field("p_email", t("email"), inp("email", p.email || user.email, 'type="email" maxlength="120" autocomplete="email"'))}
        ${field("p_telegram", t("telegram"), inp("telegram", p.telegram, 'maxlength="40" autocomplete="off"'))}
        ${field("p_website", t("website"), inp("website", p.website, 'type="url" maxlength="200" placeholder="https://"'))}</div></fieldset>
      <div class="savebar"><button class="btn primary" type="submit">${esc(t("save"))}</button><p class="ok" data-ok-msg hidden></p><p class="err" data-err role="alert" hidden></p></div>
    </form>` });
}

export function lawyerStatsPage({ lang, cssHref, fs, user, accHref, profile, stats }){
  const t = L(lang), kb = kbFor(lang === "ru" ? "ru" : "uz"), cy = x => lang === "cyr" ? toCyrillic(x) : x;
  if (!profile || !stats) return page({ lang, cssHref, fs, user, accHref, path: "/hisob/statistika", title: t("stTitle"), desc: "",
    body: `<p><a href="/hisob">${esc(t("back"))}</a></p><h1>${esc(t("stTitle"))}</h1><p class="empty">${esc(t("noProfile"))} <a href="/hisob/profil">${esc(t("editProfile"))}</a></p>` });
  const { views, viewsDaily, cons, byMonth, byDomain, recent } = stats;
  const net = Number(cons.value) - Number(cons.commission);
  const max = Math.max(1, ...viewsDaily.map(d => d.n)), H = 120, w = 100 / viewsDaily.length;
  const cols = viewsDaily.map((d, i) => { const h = d.n ? Math.max(3, d.n / max * (H - 4)) : 0;
    return `<g><title>${esc(d.day)}: ${d.n}</title>${h ? `<rect class="fill" x="${(i * w + w * .14).toFixed(3)}%" y="${(H - h).toFixed(1)}" width="${(w * .72).toFixed(3)}%" height="${h.toFixed(1)}" rx="2"/>` : ""}</g>`; }).join("");
  const funnel = [["f_requested", cons.requested], ["f_offered", cons.offered], ["f_agreed", cons.agreed], ["f_completed", cons.completed], ["f_lost", cons.lost]];
  const fmax = Math.max(1, ...funnel.map(f => f[1]));
  const bar = (n, m) => `<svg class="hbar" width="100%" height="12" aria-hidden="true" focusable="false"><rect class="track" width="100%" height="12" rx="4"/>${n ? `<rect class="fill" width="${Math.max(1, n / m * 100).toFixed(2)}%" height="12" rx="4"/>` : ""}</svg>`;
  const tbl = (head, rows) => rows.length ? `<div class="tscroll" tabindex="0"><table class="stt bars"><thead><tr>${head.map(h => `<th scope="col"${h.startsWith("#") ? ` class="numc"` : ""}>${esc(h.replace(/^#/, ""))}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table></div>` : `<p class="empty">${esc(t("none"))}</p>`;
  return page({ lang, cssHref, fs, user, accHref, path: "/hisob/statistika", title: t("stTitle"), desc: "", body: `
    <p><a href="/hisob">${esc(t("back"))}</a></p><h1>${esc(t("stTitle"))}</h1>
    <div class="kabstats">${tile(fmtSum(views.d7), t("stViews7"))}${tile(fmtSum(views.d30), t("stViews30"))}${tile(fmtSum(views.total), t("stViewsAll"))}${tile(fmtSum(cons.total), t("requests"))}
      ${tile(`${pct(cons.total, views.total)}%`, t("stConv"))}${tile(`${pct(cons.agreed, cons.total)}%`, t("stWin"))}${tile(esc(money(cons.avg_price, lang)), t("stAvg"))}${tile(esc(money(net, lang)), t("stNet"))}</div>
    <h2 class="sec">${esc(t("stDaily"))}</h2>
    <figure class="trend"><div class="trendy"><span>${fmtSum(max)}</span><span>0</span></div><div class="trendplot"><svg width="100%" height="${H}" role="img" aria-label="${esc(t("stDaily"))}: ${fmtSum(views.d30)}"><line class="base" x1="0" x2="100%" y1="${H - .5}" y2="${H - .5}"/>${cols}</svg>
      <div class="trendx"><span>${esc(viewsDaily[0].day.slice(5))}</span><span>${esc(viewsDaily[15].day.slice(5))}</span><span>${esc(viewsDaily.at(-1).day.slice(5))}</span></div></div></figure>
    <h2 class="sec">${esc(t("stFunnel"))}</h2>${tbl([t("stFunnel"), "", "#" + t("count")], funnel.map(([k, n]) => `<tr><th scope="row">${esc(t(k))}</th><td class="barcell">${bar(n, fmax)}</td><td class="numc">${fmtSum(n)}</td></tr>`))}
    <p class="small muted">${esc(t("kValue"))}: ${esc(money(cons.value, lang))} · ${esc(t("stComm"))}: ${esc(money(cons.commission, lang))} · ${esc(t("stNet"))}: ${esc(money(net, lang))}</p>
    <h2 class="sec">${esc(t("stMonth"))}</h2>${tbl([t("month"), "#" + t("requests"), "#" + t("agreed"), "#" + t("value")], byMonth.map(r => `<tr><th scope="row">${esc(r.m)}</th><td class="numc">${r.requests}</td><td class="numc">${r.agreed}</td><td class="numc">${esc(money(r.value, lang))}</td></tr>`))}
    <h2 class="sec">${esc(t("stDomain"))}</h2>${tbl([t("domain"), "", "#" + t("count")], byDomain.map(d => `<tr><th scope="row">${esc(cy(kb.DOMAINS.find(x => x.id === d.domain)?.title || d.domain))}</th><td class="barcell">${bar(d.n, byDomain[0]?.n || 1)}</td><td class="numc">${d.n}</td></tr>`))}
    <h2 class="sec">${esc(t("stRecent"))}</h2>${recent.length ? `<ul class="klist">${recent.map(r => `<li><div><b>${esc(r.name)}</b> · ${esc(date(r.created_at, lang))}${r.scenario && kb.SCENARIO_BY_ID[r.scenario] ? `<br><span class="muted">${esc(cy(kb.SCENARIO_BY_ID[r.scenario].title))}</span>` : ""}</div><span class="tag">${esc(t(r.status === "requested" ? "f_requested" : r.status === "offered" ? "f_offered" : r.status === "completed" ? "f_completed" : ["agreed"].includes(r.status) ? "f_agreed" : "f_lost"))}</span></li>`).join("")}</ul>` : `<p class="empty">${esc(t("none"))}</p>`}` });
}
