// Hisob sahifalari: kirish, ro‘yxatdan o‘tish, «Hisobim» (fuqaro / yurist / tashkilot), admin paneli.
// Serverda chiziladi; formalar public/account.js orqali JSON API ga yuboriladi (inline skript yo‘q — qat’iy CSP).
import { page, tr as btr, pick, areaList } from "./business.js";
import { ADMIN_SECTIONS } from "./access.js";
import { fmtSum, fmtDate } from "../public/i18n.js";
import { toCyrillic } from "../public/translit.js";
import { kbFor, COURTS } from "./kb.js";
import { PRICES } from "./market.js";

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
const T = {
  bar: ["Ulush (diagramma)", "Доля (диаграмма)"],
  login: ["Kirish", "Вход"], register: ["Ro‘yxatdan o‘tish", "Регистрация"], email: ["E-pochta", "Эл. почта"], password: ["Parol", "Пароль"],
  name: ["F.I.Sh.", "ФИО"], phone: ["Telefon (ixtiyoriy)", "Телефон (необязательно)"],
  pwHint: ["Kamida 8 belgi: harf va raqam.", "Не менее 8 символов: буквы и цифры."],
  noAcc: ["Hisobingiz yo‘qmi?", "Нет аккаунта?"], haveAcc: ["Hisobingiz bormi?", "Уже есть аккаунт?"],
  loginLead: ["Yurist, tashkilot yoki fuqaro sifatida hisobingizga kiring.", "Войдите как юрист, организация или гражданин."],
  regLead: ["Fuqarolar uchun hujjat tayyorlash hisobsiz ham bepul. Hisob yuristga so‘rov yuborish, obuna va kelishuvlar uchun kerak.", "Гражданам готовить документы можно бесплатно и без аккаунта. Аккаунт нужен для запросов юристам, подписки и договорённостей."],
  roleQ: ["Kim sifatida", "В качестве кого"], rCitizen: ["Fuqaro", "Гражданин"], rLawyer: ["Yurist yoki advokat", "Юрист или адвокат"], rOrg: ["Tashkilot (korxona, muassasa, firma)", "Организация (предприятие, учреждение, фирма)"],
  orgName: ["Tashkilot nomi", "Название организации"], orgKind: ["Turi", "Тип"], inn: ["STIR (9 raqam, ixtiyoriy)", "ИНН (9 цифр, необязательно)"],
  kKorxona: ["Korxona", "Предприятие"], kMuassasa: ["Muassasa", "Учреждение"], kFirma: ["Yuridik firma", "Юридическая фирма"], kByuro: ["Advokatlik byurosi", "Адвокатское бюро"], kBoshqa: ["Boshqa", "Другое"],
  terms: ["Foydalanish shartlari va ma’lumotlarim qayta ishlanishiga roziman.", "Согласен(-на) с условиями использования и обработкой моих данных."],
  trialNote: ["Yurist va tashkilotlar uchun 14 kunlik bepul sinov avtomatik yoqiladi.", "Для юристов и организаций автоматически включается бесплатный пробный период на 14 дней."],
  dbOff: ["Hisobga kirish hozircha ishlamayapti. Reja va arizani hisobsiz ham tayyorlashingiz mumkin.", "Вход в аккаунт сейчас недоступен. План и заявление можно подготовить и без аккаунта."],
  hello: ["Salom, {n}", "Здравствуйте, {n}"], logout: ["Chiqish", "Выйти"],
  subs: ["Obuna", "Подписка"], noSubs: ["Hozircha obunangiz yo‘q.", "Подписки пока нет."], subscribe: ["Tariflar va obuna", "Тарифы и подписка"],
  until: ["{d} gacha", "до {d}"], price: ["Narx", "Цена"],
  st_trial: ["Sinov", "Пробный"], st_pending: ["To‘lov kutilmoqda", "Ожидает оплаты"], st_active: ["Faol", "Активна"], st_cancelled: ["Bekor qilingan", "Отменена"], st_expired: ["Muddati tugagan", "Истекла"],
  pl_pro: ["Yurist Pro", "Юрист Pro"], pl_firma: ["Firma", "Фирма"], pl_org: ["Tashkilot", "Организация"],
  payNote: ["To‘lov tizimi ulanmaguncha hisob-faktura bo‘yicha to‘lanadi; to‘lov tasdiqlangach obuna 30 kunga faollashadi.", "Пока платёжная система не подключена, оплата по счёту; после подтверждения подписка активна 30 дней."],
  myCons: ["Mening so‘rovlarim va kelishuvlarim", "Мои запросы и договорённости"], noCons: ["Hali so‘rov yo‘q. Katalogdan yurist tanlang.", "Запросов пока нет. Выберите юриста в каталоге."],
  inCons: ["Mijozlardan so‘rovlar", "Запросы клиентов"], noIn: ["Hozircha mijozlardan so‘rov yo‘q. Profilingiz to‘liq bo‘lsa, ular tezroq keladi.", "Запросов от клиентов пока нет. С заполненным профилем они приходят быстрее."],
  c_requested: ["So‘rov yuborilgan", "Запрос отправлен"], c_offered: ["Narx taklif qilingan", "Предложена цена"], c_agreed: ["Kelishuv tuzilgan", "Договорённость заключена"],
  c_completed: ["Bajarilgan", "Выполнено"], c_declined: ["Rad etilgan", "Отклонено"], c_cancelled: ["Bekor qilingan", "Отменено"],
  agree: ["Roziman — kelishuv tuzish", "Согласен — заключить договорённость"], cancel: ["Bekor qilish", "Отменить"],
  offer: ["Narx taklif qilish", "Предложить цену"], offerPrice: ["Narx, so‘m", "Цена, сум"], offerNote: ["Izoh (xizmat hajmi, muddat)", "Комментарий (объём, сроки)"],
  decline: ["Rad etish", "Отклонить"], complete: ["Bajarildi", "Выполнено"],
  commission: ["Platforma komissiyasi: {p}%", "Комиссия платформы: {p}%"],
  profile: ["Katalogdagi profil", "Профиль в каталоге"], prof_pending: ["Moderatsiyada", "На модерации"], prof_approved: ["Tasdiqlangan — katalogda", "Подтверждён — в каталоге"], prof_rejected: ["Rad etilgan", "Отклонён"],
  profNone: ["Profil yo‘q. Kabinetda to‘ldirib, katalogga ariza yuboring.", "Профиля нет. Заполните его в кабинете и отправьте заявку."], toCabinet: ["Kabinetga o‘tish", "Перейти в кабинет"],
  security: ["Xavfsizlik", "Безопасность"], curPw: ["Joriy parol", "Текущий пароль"], newPw: ["Yangi parol", "Новый пароль"], changePw: ["Parolni almashtirish", "Сменить пароль"],
  pwChanged: ["Parol almashtirildi.", "Пароль изменён."],
  org: ["Tashkilot", "Организация"],
  contactsOf: ["Aloqa", "Контакты"],
  // Admin
  adTitle: ["Admin paneli", "Панель администратора"],
  ad_umumiy: ["Umumiy", "Обзор"], ad_murojaat: ["Murojaatlar", "Обращения"], ad_daromad: ["Daromad", "Доход"], ad_obuna: ["Obunalar", "Подписки"],
  ad_yurist: ["Yuristlar", "Юристы"], ad_kelishuv: ["Kelishuvlar", "Договорённости"], ad_users: ["Foydalanuvchilar", "Пользователи"],
  kAppeals: ["Murojaatlar (holat ochilgan)", "Обращения (открыт план)"], kDocs: ["Tayyorlangan hujjatlar", "Подготовлено документов"], kUsers: ["Foydalanuvchilar", "Пользователи"],
  kActive: ["Faol obunalar", "Активные подписки"], kMrr: ["Oylik takroriy daromad (MRR)", "Ежемесячный доход (MRR)"], kMonth: ["Shu oy tushum", "Поступления за месяц"],
  kCons: ["Kelishuvlar", "Договорённости"], kComm: ["Komissiya (jami)", "Комиссия (всего)"], kOut: ["Doiradan tashqari so‘rovlar", "Запросы вне охвата"],
  byDomain: ["Sohalar bo‘yicha murojaatlar", "Обращения по сферам"], domain: ["Soha", "Сфера"], appeals: ["Murojaat", "Обращения"], docs: ["Hujjat", "Документы"], share: ["Ulush", "Доля"],
  topCases: ["Eng ko‘p holatlar", "Самые частые ситуации"], last30: ["So‘nggi 30 kun", "Последние 30 дней"], day: ["Kun", "День"],
  revMonth: ["Oylar bo‘yicha tushum", "Поступления по месяцам"], month: ["Oy", "Месяц"], fromSubs: ["Obunalar", "Подписки"], fromComm: ["Komissiya", "Комиссия"], total: ["Jami", "Итого"],
  pendingPay: ["Tasdiqlanmagan to‘lovlar", "Неподтверждённые платежи"], confirm: ["To‘lovni tasdiqlash", "Подтвердить оплату"], amount: ["Summa", "Сумма"], who: ["Kim", "Кто"], what: ["Nima uchun", "За что"],
  subsBy: ["Tariflar bo‘yicha obunalar", "Подписки по тарифам"], plan: ["Tarif", "Тариф"], status: ["Holat", "Статус"], count: ["Soni", "Кол-во"],
  orgSubs: ["Tashkilot, korxona va firmalar obunalari", "Подписки организаций, предприятий и фирм"], trialEnd: ["7 kun ichida sinovi tugaydiganlar", "Пробный период заканчивается в 7 дней"],
  pendingLaw: ["Moderatsiyadagi yuristlar", "Юристы на модерации"], approve: ["Tasdiqlash", "Подтвердить"], reject: ["Rad etish", "Отклонить"], license: ["Litsenziya", "Лицензия"],
  perLawyer: ["Yuristlar bo‘yicha: qancha fuqaro murojaat qilgan", "По юристам: сколько граждан обратилось"], views: ["Profil ko‘rishlari", "Просмотры профиля"],
  requests: ["So‘rovlar", "Запросы"], agreed: ["Kelishuv", "Договорённости"], completed: ["Bajarilgan", "Выполнено"], value: ["Kelishuv summasi", "Сумма договорённостей"],
  demoViews: ["Namuna profillar ko‘rishlari", "Просмотры демо-профилей"],
  consBy: ["Kelishuvlar holati bo‘yicha", "Договорённости по статусу"], consDomain: ["Kelishuvlar sohalar bo‘yicha", "Договорённости по сферам"],
  roles: ["Rollar bo‘yicha", "По ролям"], newUsers: ["Yangi foydalanuvchilar (oylar)", "Новые пользователи (по месяцам)"], recent: ["So‘nggi foydalanuvchilar", "Последние пользователи"],
  role: ["Rol", "Роль"], created: ["Ro‘yxatdan o‘tgan", "Зарегистрирован"], lastLogin: ["Oxirgi kirish", "Последний вход"], save: ["Saqlash", "Сохранить"],
  ro_citizen: ["Fuqaro", "Гражданин"], ro_lawyer: ["Yurist", "Юрист"], ro_org: ["Tashkilot", "Организация"], ro_admin: ["Admin", "Админ"], ro_moderator: ["Moderator", "Модератор"], ro_guest: ["Mehmon", "Гость"],
  ad_rasm: ["Rasmlar", "Фото"], ad_parol: ["Parol", "Пароль"],
  photoQueue: ["Tekshirilmagan rasmlar", "Непроверенные фото"], photoLead: ["Yuristlar katalog uchun yuklagan rasmlar. Rasmda odamning yuzi bo‘lishi kerak; reklama va nomaqbul tasvir bo‘lmasligi kerak.", "Фото, загруженные юристами для каталога. На фото должно быть лицо человека, без рекламы и недопустимых изображений."],
  photoOk: ["Tasdiqlash", "Одобрить"], photoDel: ["Rasmni o‘chirish", "Удалить фото"], photoOf: ["{n} rasmi", "Фото: {n}"], uploaded: ["Yuklangan", "Загружено"],
  modLead: ["Moderator paneli: yurist arizalari va rasmlar.", "Панель модератора: заявки юристов и фото."],
  apTitle: ["Yurist bo‘lish", "Стать юристом"],
  apLead: ["Ariza moderatorga yuboriladi. Litsenziya yoki guvohnoma tekshirilgach, hisobingiz yurist hisobiga aylanadi va profilingizni to‘ldirishingiz mumkin.", "Заявка уходит модератору. После проверки лицензии или удостоверения ваш аккаунт станет аккаунтом юриста, и вы сможете заполнить профиль."],
  apKind: ["Kim sifatida", "В качестве кого"], k_advokat: ["Advokat", "Адвокат"], k_yurist: ["Yurist", "Юрист"], k_firma: ["Yuridik firma", "Юридическая фирма"], k_mediator: ["Mediator", "Медиатор"],
  apFirm: ["Firma yoki byuro (ixtiyoriy)", "Фирма или бюро (необязательно)"], apLicense: ["Litsenziya yoki guvohnoma raqami", "Номер лицензии или удостоверения"],
  apRegion: ["Hudud", "Регион"], apDistrict: ["Tuman yoki shahar", "Район или город"], apExp: ["Tajriba (yil)", "Опыт (лет)"], apPhone: ["Telefon", "Телефон"],
  apAreas: ["Faoliyat sohalari", "Сферы практики"], apFormats: ["Xizmat shakli", "Формат"], online: ["Onlayn", "Онлайн"], office: ["Ofisda", "В офисе"],
  apLangs: ["Tillar", "Языки"], l_uz: ["O‘zbek", "Узбекский"], l_ru: ["Rus", "Русский"], l_en: ["Ingliz", "Английский"],
  apHeadline: ["Qisqa tavsif", "Краткое описание"], apAbout: ["O‘zingiz haqida", "О себе"],
  apConsent: ["Ma’lumotlarim to‘g‘ri; litsenziya tekshirilishiga roziman.", "Мои данные верны; согласен на проверку лицензии."],
  apSend: ["Arizani yuborish", "Отправить заявку"],
  apStatus: ["Arizangiz holati", "Статус заявки"], ap_pending: ["Ko‘rib chiqilmoqda", "На рассмотрении"], ap_rejected: ["Rad etildi", "Отклонена"], ap_approved: ["Tasdiqlandi", "Одобрена"],
  apAgain: ["Arizani yangilab qayta yuborish mumkin.", "Можно обновить заявку и отправить снова."],
  apCta: ["Siz yuristmisiz? Katalogga qo‘shilish uchun ariza bering.", "Вы юрист? Подайте заявку на включение в каталог."], apGo: ["Yurist bo‘lish →", "Стать юристом →"],
  fbTitle: ["Bu bo‘lim sizning hisobingiz uchun emas", "Этот раздел не для вашего аккаунта"],
  fbRole: ["Siz «{r}» sifatida kirgansiz. Bu sahifani boshqa turdagi hisob ochadi.", "Вы вошли как «{r}». Эту страницу открывает аккаунт другого типа."],
  fbSection: ["Bu bo‘lim sizning rolingiz uchun yopiq.", "Этот раздел закрыт для вашей роли."],
  fbHome: ["Mening sahifamga", "На мою страницу"], fbStart: ["Bosh sahifaga", "На главную"], fbOther: ["Boshqa hisob bilan kirish", "Войти в другой аккаунт"],
  none: ["Hozircha bu yerda hech narsa yo‘q.", "Пока здесь ничего нет."], statsOff: ["Anonim statistika o‘chirilgan (STATS=0).", "Анонимная статистика отключена (STATS=0)."]
};
const L = lang => (k, v = {}) => { const s = (T[k] || [k, k])[lang === "ru" ? 1 : 0].replace(/\{(\w+)\}/g, (_, x) => v[x] ?? ""); return lang === "cyr" ? toCyrillic(s) : s; };
const money = (n, lang) => `${fmtSum(Number(n) || 0)} ${lang === "ru" ? "сум" : lang === "cyr" ? "сўм" : "so‘m"}`;
const date = (d, lang) => d ? (s => lang === "cyr" ? toCyrillic(s) : s)(fmtDate(new Date(d), lang === "ru" ? "ru" : "uz")) : "—";
const field = (id, label, input, hint = "") => `<div class="field"><label for="${id}">${esc(label)}</label>${input}${hint ? `<span class="hint">${esc(hint)}</span>` : ""}</div>`;
const err = `<p class="err" data-err role="alert" hidden></p>`;
// «Chiqish» — qizil tugma (matn + belgi), klaviatura bilan ishlaydi; public/session.js boshqaradi
const LOGOUT_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 17l-5-5 5-5"/><path d="M5 12h11"/></svg>';
export const logoutButton = t => `<button class="btn danger logoutbtn" type="button" data-logout>${LOGOUT_ICON}<span>${esc(t("logout"))}</span></button>`;
const safeNext = n => typeof n === "string" && /^\/[a-z0-9/_-]*(\?[a-z0-9=&_%-]*)?$/i.test(n) && !n.startsWith("//") ? n : "";

export function loginPage({ lang, cssHref, fs, user, accHref, query, db }){
  const t = L(lang), next = safeNext(query.next);
  return page({ lang, cssHref, fs, user, accHref, path: "/kirish", title: t("login"), desc: t("loginLead"), body: `
    <div class="authbox"><h1>${esc(t("login"))}</h1><p class="lead">${esc(t("loginLead"))}</p>
    ${!db ? `<p class="note warn">${esc(t("dbOff"))}</p>` : `<form class="card kform" data-api="/api/auth/login"${next ? ` data-next="${esc(next)}"` : ""}>
      ${field("l_email", t("email"), `<input id="l_email" name="email" type="email" required autocomplete="username" maxlength="254">`)}
      ${field("l_pw", t("password"), `<input id="l_pw" name="password" type="password" required autocomplete="current-password" maxlength="200">`)}
      <button class="btn primary" type="submit">${esc(t("login"))}</button>${err}</form>
    <p>${esc(t("noAcc"))} <a href="/royxat${next ? `?next=${encodeURIComponent(next)}` : ""}">${esc(t("register"))}</a></p>`}</div>` });
}

export function registerPage({ lang, cssHref, fs, user, accHref, query, db }){
  const t = L(lang), tar = query.tarif, role0 = tar === "org" ? "org" : tar ? "lawyer" : (["lawyer", "org"].includes(query.rol) ? query.rol : "citizen");
  const next = safeNext(query.next) || (tar ? "/tariflar" : "");
  const kinds = [["korxona", "kKorxona"], ["muassasa", "kMuassasa"], ["firma", "kFirma"], ["byuro", "kByuro"], ["boshqa", "kBoshqa"]];
  return page({ lang, cssHref, fs, user, accHref, path: "/royxat", title: t("register"), desc: t("regLead"), body: `
    <div class="authbox"><h1>${esc(t("register"))}</h1><p class="lead">${esc(t("regLead"))}</p>
    ${!db ? `<p class="note warn">${esc(t("dbOff"))}</p>` : `<form class="card kform" data-api="/api/auth/register"${next ? ` data-next="${esc(next)}"` : ""}>
      <fieldset><legend>${esc(t("roleQ"))}</legend><div class="checks">${[["citizen", "rCitizen"], ["lawyer", "rLawyer"], ["org", "rOrg"]].map(([v, k]) =>
        `<label class="check"><input type="radio" name="role" value="${v}"${v === role0 ? " checked" : ""} data-toggle="org" data-show="${v === "org"}"> ${esc(t(k))}</label>`).join("")}</div></fieldset>
      ${field("r_name", t("name"), `<input id="r_name" name="name" required minlength="2" maxlength="120" autocomplete="name">`)}
      ${field("r_email", t("email"), `<input id="r_email" name="email" type="email" required maxlength="254" autocomplete="email">`)}
      ${field("r_phone", t("phone"), `<input id="r_phone" name="phone" type="tel" maxlength="40" autocomplete="tel">`)}
      ${field("r_pw", t("password"), `<input id="r_pw" name="password" type="password" required minlength="8" maxlength="200" autocomplete="new-password">`, t("pwHint"))}
      <div class="grid2" data-group="org"${role0 === "org" ? "" : " hidden"}>
        ${field("r_org", t("orgName"), `<input id="r_org" name="orgName" maxlength="200" autocomplete="organization">`)}
        ${field("r_kind", t("orgKind"), `<select id="r_kind" name="orgKind">${kinds.map(([v, k]) => `<option value="${v}">${esc(t(k))}</option>`).join("")}</select>`)}
        ${field("r_inn", t("inn"), `<input id="r_inn" name="inn" inputmode="numeric" maxlength="9" pattern="\\d{9}">`)}
      </div>
      <label class="check"><input type="checkbox" name="consent" required> ${esc(t("terms"))}</label>
      <p class="small muted">${esc(t("trialNote"))}</p>
      <button class="btn primary" type="submit">${esc(t("register"))}</button>${err}</form>
    <p>${esc(t("haveAcc"))} <a href="/kirish${next ? `?next=${encodeURIComponent(next)}` : ""}">${esc(t("login"))}</a></p>`}</div>` });
}

const consRow = (c, lang, side) => {
  const t = L(lang), sc = c.scenario && kbFor(lang === "ru" ? "ru" : "uz").SCENARIO_BY_ID[c.scenario];
  const who = side === "citizen" ? c.lawyer_name : c.citizen_name;
  const contacts = side === "citizen" ? [c.lawyer_phone, c.lawyer_email] : [c.citizen_phone, c.citizen_email];
  const act = (a, label, cls = "ghost") => `<button class="btn ${cls}" type="button" data-post="/api/consultations/${c.id}/${a}">${esc(t(label))}</button>`;
  let actions = "";
  if (side === "citizen" && c.status === "offered") actions = act("agree", "agree", "primary") + act("cancel", "cancel");
  else if (side === "citizen" && c.status === "requested") actions = act("cancel", "cancel");
  else if (side === "lawyer" && ["requested", "offered"].includes(c.status)) actions = `<form class="inline" data-api="/api/consultations/${c.id}/offer">
      <input name="price" inputmode="numeric" required aria-label="${esc(t("offerPrice"))}" placeholder="${esc(t("offerPrice"))}" value="${c.offer_price ?? ""}">
      <input name="note" maxlength="500" aria-label="${esc(t("offerNote"))}" placeholder="${esc(t("offerNote"))}" value="${esc(c.offer_note || "")}">
      <button class="btn primary" type="submit">${esc(t("offer"))}</button></form>${act("decline", "decline")}`;
  else if (side === "lawyer" && c.status === "agreed") actions = act("complete", "complete", "primary");
  const showContacts = ["agreed", "completed"].includes(c.status) || side === "citizen";
  return `<li class="cons st-${c.status}"><div><span class="tag">${esc(t("c_" + c.status))}</span> <b>${esc(who)}</b> · ${esc(date(c.created_at, lang))}
      ${sc ? `<br><span class="muted">${esc(lang === "cyr" ? toCyrillic(sc.title) : sc.title)}</span>` : ""}
      <p class="pre">${esc(c.message)}</p>
      ${c.offer_price != null ? `<p><b>${esc(t("price"))}: ${esc(money(c.offer_price, lang))}</b>${c.offer_note ? ` — ${esc(c.offer_note)}` : ""}${side === "lawyer" ? ` <span class="small muted">(${esc(t("commission", { p: Number(c.commission_pct) }))})</span>` : ""}</p>` : ""}
      ${showContacts ? `<p class="small">${esc(t("contactsOf"))}: ${contacts.filter(Boolean).map(esc).join(" · ") || "—"}</p>` : ""}</div>
    <div class="rowbtn">${actions}</div>${err}</li>`;
};

export function accountPage({ lang, cssHref, fs, user, accHref, subs, cons, panel = "", application = null }){
  const t = L(lang);
  const subRows = subs.length ? `<ul class="klist">${subs.map(s => `<li><div><b>${esc(t("pl_" + s.plan))}</b> · <span class="tag">${esc(t("st_" + s.status))}</span>
      ${s.ends_at ? ` · ${esc(t("until", { d: date(s.ends_at, lang) }))}` : ""}<br><span class="muted">${esc(t("price"))}: ${s.plan === "org" && !Number(s.price) ? "—" : esc(money(s.price, lang))}</span></div></li>`).join("")}</ul>` : `<p class="empty">${esc(t("noSubs"))}</p>`;
  const lawyer = cons.lawyer;
  return page({ lang, cssHref, fs, user, accHref, path: "/hisob", title: t("hello", { n: user.name }), desc: "", body: `
    <div class="acchead"><div class="accwho"><h1>${esc(t("hello", { n: user.name }))}</h1><span class="tag">${esc(t("ro_" + user.role))}</span></div>${logoutButton(t)}</div>
    <p class="muted">${esc(user.email)}${user.org_name ? ` · ${esc(t("org"))}: ${esc(user.org_name)}` : ""}</p>
    ${panel}
    ${user.role === "citizen" ? applyBox(application, lang) : ""}
    ${["lawyer", "org"].includes(user.role) ? `<h2 class="sec">${esc(t("subs"))}</h2>${subRows}<p class="small muted">${esc(t("payNote"))}</p><p><a class="btn ghost" href="/tariflar">${esc(t("subscribe"))}</a> <a class="btn ghost" href="/kabinet">${esc(t("toCabinet"))}</a></p>` : ""}
    ${user.role === "lawyer" ? `<h2 class="sec">${esc(t("inCons"))}</h2>${cons.asLawyer.length ? `<ul class="klist">${cons.asLawyer.map(c => consRow(c, lang, "lawyer")).join("")}</ul>` : `<p class="empty">${esc(t("noIn"))}</p>`}` : ""}
    <h2 class="sec">${esc(t("myCons"))}</h2>${cons.asCitizen.length ? `<ul class="klist">${cons.asCitizen.map(c => consRow(c, lang, "citizen")).join("")}</ul>` : `<p class="empty">${esc(t("noCons"))} <a href="/yuristlar">${esc(btr(lang)("navLawyers"))}</a></p>`}
    <h2 class="sec">${esc(t("security"))}</h2>
    ${passwordForm(t)}` });
}
const passwordForm = t => `<form class="card kform narrow" data-api="/api/auth/password" data-ok="${esc(t("pwChanged"))}">
      ${field("a_cur", t("curPw"), `<input id="a_cur" name="current" type="password" required autocomplete="current-password">`)}
      ${field("a_new", t("newPw"), `<input id="a_new" name="password" type="password" required minlength="8" autocomplete="new-password">`, t("pwHint"))}
      <button class="btn primary" type="submit">${esc(t("changePw"))}</button>${err}<p class="ok" data-ok-msg hidden></p></form>`;

// Fuqaro «Hisobim»: «Yurist bo‘lish» arizasi holati yoki taklif
function applyBox(app, lang){
  const t = L(lang);
  if (!app) return `<aside class="card join"><p>${esc(t("apCta"))}</p><a class="btn ghost" href="/yurist-bolish">${esc(t("apGo"))}</a></aside>`;
  return `<aside class="card join"><h2>${esc(t("apStatus"))}: <span class="tag">${esc(t("ap_" + app.status))}</span></h2>
    ${app.status === "rejected" ? `<p>${app.review_note ? esc(app.review_note) + " " : ""}${esc(t("apAgain"))}</p><a class="btn ghost" href="/yurist-bolish">${esc(t("apGo"))}</a>` : ""}</aside>`;
}

// «Yurist bo‘lish» — fuqaro arizasi (yurist profil muharriridan alohida). Moderator tasdiqlagach rol «lawyer» bo‘ladi.
export function applyPage({ lang, cssHref, fs, user, accHref, application }){
  const t = L(lang), a = application && application.status === "rejected" ? application : null;
  const pending = application?.status === "pending";
  const regionOpts = [["", "—"], ...COURTS.regions.map(r => [r.name, lang === "ru" ? r.cyr : lang === "cyr" ? toCyrillic(r.name) : r.name])];
  const sel = (id, name, opts, cur) => `<select id="${id}" name="${name}">${opts.map(([v, l]) => `<option value="${esc(v)}"${v === cur ? " selected" : ""}>${esc(l)}</option>`).join("")}</select>`;
  const checks = (name, opts, cur = []) => `<div class="checks">${opts.map(([v, l]) => `<label class="check"><input type="checkbox" name="${name}[]" value="${esc(v)}"${cur.includes(v) ? " checked" : ""}> ${esc(l)}</label>`).join("")}</div>`;
  const group = (legend, inner) => `<fieldset class="kab"><legend>${esc(legend)}</legend>${inner}</fieldset>`;
  return page({ lang, cssHref, fs, user, accHref, path: "/yurist-bolish", title: t("apTitle"), desc: t("apLead"), body: `
    <h1>${esc(t("apTitle"))}</h1><p class="lead">${esc(t("apLead"))}</p>
    ${application ? `<p class="note${pending ? " warn" : ""}" role="status">${esc(t("apStatus"))}: <b>${esc(t("ap_" + application.status))}</b>${application.status === "rejected" && application.review_note ? ` — ${esc(application.review_note)}` : ""}</p>` : ""}
    ${pending ? "" : `<form class="card kform" data-api="/api/lawyers/apply" data-next="/hisob">
      ${field("ap_kind", t("apKind"), sel("ap_kind", "kind", ["advokat", "yurist", "firma", "mediator"].map(k => [k, t("k_" + k)]), a?.kind || "yurist"))}
      ${field("ap_name", t("name"), `<input id="ap_name" name="name" required minlength="2" maxlength="120" autocomplete="name" value="${esc(a?.name || user.name)}">`)}
      ${field("ap_firm", t("apFirm"), `<input id="ap_firm" name="firm" maxlength="160" value="${esc(a?.firm || "")}">`)}
      ${field("ap_lic", t("apLicense"), `<input id="ap_lic" name="license" maxlength="60" value="${esc(a?.license || "")}">`)}
      <div class="grid2">${field("ap_region", t("apRegion"), sel("ap_region", "region", regionOpts, a?.region || ""))}
        ${field("ap_district", t("apDistrict"), `<input id="ap_district" name="district" maxlength="80" value="${esc(a?.district || "")}">`)}</div>
      <div class="grid2">${field("ap_phone", t("apPhone"), `<input id="ap_phone" name="phone" type="tel" required autocomplete="tel" maxlength="40" value="${esc(a?.phone || user.phone || "")}">`)}
        ${field("ap_email", t("email"), `<input id="ap_email" name="email" type="email" maxlength="120" autocomplete="email" value="${esc(a?.email || user.email || "")}">`)}</div>
      ${field("ap_exp", t("apExp"), `<input id="ap_exp" name="experience" inputmode="numeric" maxlength="2" value="${esc(a?.experience ?? "")}">`)}
      ${group(t("apAreas"), checks("areas", areaList(lang).map(x => [x.id, x.title]), a?.areas))}
      ${group(t("apFormats"), checks("formats", [["online", t("online")], ["office", t("office")]], a?.formats || ["online"]))}
      ${group(t("apLangs"), checks("langs", [["uz", t("l_uz")], ["ru", t("l_ru")], ["en", t("l_en")]], a?.langs || ["uz"]))}
      ${field("ap_head", t("apHeadline"), `<input id="ap_head" name="headline" maxlength="200" value="${esc(a?.headline || "")}">`)}
      ${field("ap_about", t("apAbout"), `<textarea id="ap_about" name="about" rows="5" maxlength="1500">${esc(a?.about || "")}</textarea>`)}
      <label class="check"><input type="checkbox" name="consent" required> ${esc(t("apConsent"))}</label>
      <button class="btn primary" type="submit">${esc(t("apSend"))}</button>${err}</form>`}` });
}

// 403: do‘stona xabar va rolning o‘z sahifasiga havola
export function forbiddenPage({ lang, cssHref, fs, user, accHref, reason, home }){
  const t = L(lang), role = user?.role || "guest";
  return page({ lang, cssHref, fs, user, accHref, path: "/403", title: t("fbTitle"), desc: "", body: `
    <section class="card fb" aria-labelledby="fbH"><h1 id="fbH">${esc(t("fbTitle"))}</h1>
      <p>${esc(reason === "role" ? t("fbRole", { r: t("ro_" + role) }) : t("fbSection"))}</p>
      <p class="rowbtn"><a class="btn primary" href="${esc(home)}">${esc(t("fbHome"))}</a><a class="btn ghost" href="/">${esc(t("fbStart"))}</a></p>
      <p class="small"><button class="linkbtn" type="button" data-logout data-next="/kirish">${esc(t("fbOther"))}</button></p></section>` });
}


// ---------- Admin ----------
const bar = (n, max) => `<svg class="hbar" width="100%" height="12" aria-hidden="true" focusable="false"><rect class="track" width="100%" height="12" rx="4"/>${n ? `<rect class="fill" width="${Math.max(1, n / max * 100).toFixed(2)}%" height="12" rx="4"/>` : ""}</svg>`;
const table = (head, rows, cls = "") => rows.length ? `<div class="tscroll" tabindex="0"><table class="${cls}"><thead><tr>${head.map(h => /^@/.test(h) ? `<th scope="col"><span class="sr">${esc(h.slice(1))}</span></th>` : `<th scope="col"${/^#/.test(h) ? ` class="numc"` : ""}>${esc(h.replace(/^#/, ""))}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table></div>` : "";
const tile = (v, label) => `<div class="stattile"><div class="stv">${v}</div><div class="stl">${esc(label)}</div></div>`;

export function adminPage({ lang, cssHref, fs, user, accHref, query, a, s, photos = [] }){
  const allowed = ADMIN_SECTIONS[user.role] || [];                 // moderator: faqat yurist arizalari va rasmlar (server/access.js)
  const t = L(lang), b = allowed.includes(query.b) ? query.b : allowed[0];
  const kb = kbFor(lang === "ru" ? "ru" : "uz"), cy = x => lang === "cyr" ? toCyrillic(x) : x;
  const ym = new Date().toISOString().slice(0, 7);
  const revMonths = [...new Set(a.revenue.map(r => r.m))];
  const revBy = (m, k) => Number(a.revenue.find(r => r.m === m && r.kind === k)?.sum || 0);
  const commTotal = a.byLawyer.reduce((n, l) => n + Number(l.commission), 0);
  const consN = a.cons.filter(c => ["agreed", "completed"].includes(c.status)).reduce((n, c) => n + c.n, 0);
  const users = a.roles.reduce((n, r) => n + r.n, 0);
  const domains = kb.DOMAINS.map(d => ({ id: d.id, title: cy(d.title), n: s.byDomain[d.id] || 0, docs: s.docsByDomain[d.id] || 0 })).sort((x, y) => y.n - x.n);
  const maxD = Math.max(1, ...domains.map(d => d.n));
  const domainTable = table([t("domain"), "@" + t("bar"), "#" + t("appeals"), "#" + t("share"), "#" + t("docs")], domains.map(d =>
    `<tr><th scope="row">${esc(d.title)}</th><td class="barcell">${bar(d.n, maxD)}</td><td class="numc">${fmtSum(d.n)}</td><td class="numc">${s.total ? Math.round(d.n / s.total * 100) : 0}%</td><td class="numc">${fmtSum(d.docs)}</td></tr>`), "stt bars");
  const revTable = table([t("month"), "#" + t("fromSubs"), "#" + t("fromComm"), "#" + t("total")], revMonths.map(m =>
    `<tr><th scope="row">${esc(m)}</th><td class="numc">${esc(money(revBy(m, "subscription"), lang))}</td><td class="numc">${esc(money(revBy(m, "commission"), lang))}</td><td class="numc"><b>${esc(money(revBy(m, "subscription") + revBy(m, "commission"), lang))}</b></td></tr>`));
  const nav = `<nav class="kabtabs" aria-label="${esc(t("adTitle"))}">${allowed.map(x => `<a href="/admin?b=${x}"${x === b ? ` aria-current="page"` : ""}>${esc(t("ad_" + x))}</a>`).join("")}</nav>`;
  const evRef = ref => a.events.find(e => e.lawyer_ref === ref) || { views: 0, requests: 0 };
  let body = "";
  if (b === "umumiy") body = `<div class="kabstats">
      ${tile(fmtSum(s.total), t("kAppeals"))}${tile(fmtSum(s.documents), t("kDocs"))}${tile(fmtSum(users), t("kUsers"))}${tile(fmtSum(a.mrr.n), t("kActive"))}
      ${tile(esc(money(a.mrr.mrr, lang)), t("kMrr"))}${tile(esc(money(revBy(ym, "subscription") + revBy(ym, "commission"), lang)), t("kMonth"))}${tile(fmtSum(consN), t("kCons"))}${tile(esc(money(commTotal, lang)), t("kComm"))}</div>
    ${!s.enabled ? `<p class="note warn">${esc(t("statsOff"))}</p>` : ""}
    <h2 class="sec">${esc(t("byDomain"))}</h2>${domainTable}
    <h2 class="sec">${esc(t("revMonth"))}</h2>${revTable || `<p class="empty">${esc(t("none"))}</p>`}
    ${a.pendingPay.length || a.pending.length ? `<p class="note warn"><a href="/admin?b=daromad">${esc(t("pendingPay"))}: ${a.pendingPay.length}</a> · <a href="/admin?b=yurist">${esc(t("pendingLaw"))}: ${a.pending.length}</a></p>` : ""}`;
  else if (b === "murojaat"){
    const scen = Object.entries(s.byScenario).filter(([id]) => kb.SCENARIO_BY_ID[id]).sort((x, y) => y[1] - x[1]).slice(0, 15);
    const maxS = Math.max(1, ...scen.map(x => x[1]));
    body = `<div class="kabstats">${tile(fmtSum(s.total), t("kAppeals"))}${tile(fmtSum(s.documents), t("kDocs"))}${tile(`${s.analyzed ? Math.round(s.outOfScope / s.analyzed * 100) : 0}%`, t("kOut"))}${tile(fmtSum(s.series.reduce((n, x) => n + x.opens, 0)), t("last30"))}</div>
      <h2 class="sec">${esc(t("byDomain"))}</h2>${domainTable}
      <h2 class="sec">${esc(t("topCases"))}</h2>${table([t("domain"), "@" + t("bar"), "#" + t("appeals")], scen.map(([id, n]) => `<tr><th scope="row">${esc(cy(kb.SCENARIO_BY_ID[id].title))}</th><td class="barcell">${bar(n, maxS)}</td><td class="numc">${fmtSum(n)}</td></tr>`), "stt bars") || `<p class="empty">${esc(t("none"))}</p>`}
      <h2 class="sec">${esc(t("last30"))}</h2>${table([t("day"), "#" + t("appeals"), "#" + t("docs")], [...s.series].reverse().map(x => `<tr><th scope="row">${esc(x.day)}</th><td class="numc">${fmtSum(x.opens)}</td><td class="numc">${fmtSum(x.docs)}</td></tr>`))}`;
  }
  else if (b === "daromad") body = `<div class="kabstats">${tile(esc(money(a.mrr.mrr, lang)), t("kMrr"))}${tile(esc(money(revBy(ym, "subscription") + revBy(ym, "commission"), lang)), t("kMonth"))}${tile(esc(money(commTotal, lang)), t("kComm"))}${tile(fmtSum(a.pendingPay.length), t("pendingPay"))}</div>
    <h2 class="sec">${esc(t("revMonth"))}</h2>${revTable || `<p class="empty">${esc(t("none"))}</p>`}
    <h2 class="sec">${esc(t("pendingPay"))}</h2>${a.pendingPay.length ? `<ul class="klist">${a.pendingPay.map(p => `<li><div><b>${esc(p.name || "—")}</b> · ${esc(p.email || "")}<br>
        <span class="muted">${esc(p.kind === "subscription" ? t("fromSubs") : t("fromComm"))} · ${esc(p.note || "")} · ${esc(date(p.created_at, lang))}</span></div>
        <form class="inline" data-api="/api/admin/payment/${p.id}/confirm"><input name="amount" inputmode="numeric" aria-label="${esc(t("amount"))}" value="${Number(p.amount) || ""}" placeholder="${esc(t("amount"))}">
        <button class="btn primary" type="submit">${esc(t("confirm"))}</button></form><button class="btn ghost" type="button" data-post="/api/admin/payment/${p.id}/cancel">${esc(t("cancel"))}</button>${err}</li>`).join("")}</ul>` : `<p class="empty">${esc(t("none"))}</p>`}`;
  else if (b === "obuna") body = `<h2 class="sec">${esc(t("subsBy"))}</h2>${table([t("plan"), t("status"), "#" + t("count"), "#" + t("price")], a.subs.map(r => `<tr><th scope="row">${esc(t("pl_" + r.plan))}</th><td>${esc(t("st_" + r.status))}</td><td class="numc">${r.n}</td><td class="numc">${esc(money(r.sum, lang))}</td></tr>`)) || `<p class="empty">${esc(t("none"))}</p>`}
    <h2 class="sec">${esc(t("orgSubs"))}</h2>${table([t("org"), t("plan"), t("status"), t("who"), "#" + t("price"), t("created")], a.orgSubs.map(r => `<tr><th scope="row">${esc(r.org_name || "—")}${r.org_kind ? ` <span class="small muted">(${esc(r.org_kind)}${r.inn ? `, ${esc(r.inn)}` : ""})</span>` : ""}</th><td>${esc(t("pl_" + r.plan))}</td><td>${esc(t("st_" + r.status))}${r.ends_at ? `<br><span class="small muted">${esc(t("until", { d: date(r.ends_at, lang) }))}</span>` : ""}</td><td>${esc(r.name)}<br><span class="small muted">${esc(r.email)}</span></td><td class="numc">${esc(money(r.price, lang))}</td><td>${esc(date(r.created_at, lang))}${["active", "trial", "pending"].includes(r.status) ? `<br><button class="linkbtn" type="button" data-post="/api/admin/subscription/${r.id}/cancel">${esc(t("cancel"))}</button>` : ""}</td></tr>`)) || `<p class="empty">${esc(t("none"))}</p>`}
    <h2 class="sec">${esc(t("trialEnd"))}</h2>${table([t("who"), t("plan"), t("until", { d: "" }).trim() || "—"], a.trialEnding.map(r => `<tr><th scope="row">${esc(r.name)} <span class="small muted">${esc(r.email)}</span></th><td>${esc(t("pl_" + r.plan))}</td><td>${esc(date(r.ends_at, lang))}</td></tr>`)) || `<p class="empty">${esc(t("none"))}</p>`}`;
  else if (b === "yurist"){
    const demo = a.events.filter(e => !/^y\d+$/.test(e.lawyer_ref));
    body = `<h2 class="sec">${esc(t("pendingLaw"))}</h2>${a.pending.length ? `<ul class="klist">${a.pending.map(p => `<li><div><b>${esc(p.name)}</b> · ${esc(p.kind)}${p.firm ? ` · ${esc(p.firm)}` : ""}<br>
        <span class="muted">${esc(t("license"))}: ${esc(p.license || "—")} · ${esc(p.region || "")} ${esc(p.district || "")} · ${esc(p.phone)} ${esc(p.email || "")}</span>
        <br><span class="small">${esc((p.areas || []).join(", "))} · ${esc(money(p.price, lang))}</span>${p.headline ? `<p class="pre">${esc(p.headline)}</p>` : ""}</div>
        <div class="rowbtn"><button class="btn primary" type="button" data-post="/api/admin/lawyer/${p.id}/approve">${esc(t("approve"))}</button><button class="btn ghost" type="button" data-post="/api/admin/lawyer/${p.id}/reject">${esc(t("reject"))}</button></div>${err}</li>`).join("")}</ul>` : `<p class="empty">${esc(t("none"))}</p>`}
      <h2 class="sec">${esc(t("perLawyer"))}</h2>${table([btr(lang)("navLawyers"), t("status"), "#" + t("views"), "#" + t("requests"), "#" + t("agreed"), "#" + t("completed"), "#" + t("value"), "#" + t("fromComm")],
        a.byLawyer.map(l => { const e = evRef(`y${l.id}`); return `<tr><th scope="row">${l.status === "approved" ? `<a href="/yuristlar/y${l.id}">${esc(l.name)}</a>` : esc(l.name)}</th><td>${esc(t("prof_" + l.status))}</td><td class="numc">${e.views}</td><td class="numc">${l.total}</td><td class="numc">${l.agreed}</td><td class="numc">${l.completed}</td><td class="numc">${esc(money(l.value, lang))}</td><td class="numc">${esc(money(l.commission, lang))}</td></tr>`; })) || `<p class="empty">${esc(t("none"))}</p>`}
      ${demo.length ? `<h2 class="sec">${esc(t("demoViews"))}</h2>${table([btr(lang)("navLawyers"), "#" + t("views")], demo.map(e => `<tr><th scope="row"><a href="/yuristlar/${esc(e.lawyer_ref)}">${esc(e.lawyer_ref)}</a></th><td class="numc">${e.views}</td></tr>`))}` : ""}`;
  }
  else if (b === "kelishuv"){
    const maxC = Math.max(1, ...a.cons.map(c => c.n));
    body = `<h2 class="sec">${esc(t("consBy"))}</h2>${table([t("status"), "@" + t("bar"), "#" + t("count"), "#" + t("value")], a.cons.map(c => `<tr><th scope="row">${esc(t("c_" + c.status))}</th><td class="barcell">${bar(c.n, maxC)}</td><td class="numc">${c.n}</td><td class="numc">${esc(money(c.value, lang))}</td></tr>`), "stt bars") || `<p class="empty">${esc(t("none"))}</p>`}
      <h2 class="sec">${esc(t("consDomain"))}</h2>${table([t("domain"), "#" + t("count")], a.consDomain.map(d => `<tr><th scope="row">${esc(cy(kb.DOMAINS.find(x => x.id === d.domain)?.title || d.domain))}</th><td class="numc">${d.n}</td></tr>`)) || `<p class="empty">${esc(t("none"))}</p>`}`;
  }
  else if (b === "rasm") body = `<h2 class="sec">${esc(t("photoQueue"))}</h2><p class="muted">${esc(t("photoLead"))}</p>
    ${photos.length ? `<ul class="klist photoq">${photos.map(p => `<li><img class="ava big photo" src="/yuristlar/rasm/${p.id}?v=${new Date(p.photo_at).getTime()}" alt="${esc(t("photoOf", { n: p.name }))}" width="96" height="96" loading="lazy">
        <div><b>${esc(p.name)}</b> · ${esc(p.kind)} · ${esc(t("prof_" + p.status))}<br><span class="small muted">${esc(t("uploaded"))}: ${esc(date(p.photo_at, lang))}</span></div>
        <div class="rowbtn"><button class="btn primary" type="button" data-post="/api/admin/photo/${p.id}/approve">${esc(t("photoOk"))}</button><button class="btn ghost" type="button" data-post="/api/admin/photo/${p.id}/remove">${esc(t("photoDel"))}</button></div>${err}</li>`).join("")}</ul>`
      : `<p class="empty">${esc(t("none"))}</p>`}`;
  else if (b === "parol") body = `<h2 class="sec">${esc(t("security"))}</h2>${passwordForm(t)}`;
  else if (b === "users"){
    const roles = ["citizen", "lawyer", "org", "moderator", "admin"];
    body = `<div class="kabstats">${roles.map(r => tile(fmtSum(a.roles.find(x => x.role === r)?.n || 0), t("ro_" + r))).join("")}</div>
      <h2 class="sec">${esc(t("newUsers"))}</h2>${table([t("month"), "#" + t("count")], a.newUsers.map(r => `<tr><th scope="row">${esc(r.m)}</th><td class="numc">${r.n}</td></tr>`)) || `<p class="empty">${esc(t("none"))}</p>`}
      <h2 class="sec">${esc(t("recent"))}</h2>${table([t("name"), t("email"), t("role"), t("created"), t("lastLogin")], a.recentUsers.map(u => `<tr><th scope="row">${esc(u.name)}</th><td>${esc(u.email)}</td>
        <td><form class="inline" data-api="/api/admin/user/${u.id}/role"><select name="role" aria-label="${esc(t("role"))}">${roles.map(r => `<option value="${r}"${r === u.role ? " selected" : ""}>${esc(t("ro_" + r))}</option>`).join("")}</select><button class="btn ghost" type="submit">${esc(t("save"))}</button></form>${err}</td>
        <td>${esc(date(u.created_at, lang))}</td><td>${esc(date(u.last_login_at, lang))}</td></tr>`))}`;
  }
  return page({ lang, cssHref, fs, user, accHref, path: `/admin?b=${b}`, title: t("adTitle"), desc: "", body: `<div class="acchead"><div class="accwho"><h1>${esc(t("adTitle"))}</h1><span class="tag">${esc(t("ro_" + user.role))}</span></div>${logoutButton(t)}</div>
    ${user.role === "moderator" ? `<p class="muted">${esc(t("modLead"))}</p>` : ""}${nav}${body}` });
}
export const pricesFor = () => PRICES;
export { consRow, field, L, esc, money, date };
export const regions = () => COURTS.regions.map(r => r.name);
export { pick };
