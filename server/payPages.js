// Sahifalar: to‘lov (/tolov/:id), to‘lovlar tarixi, hisob-faktura (PDF), ommaviy oferta, hisob xavfsizligi, parolni tiklash, jamoa.
import PDFDocument from "pdfkit";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { page } from "./business.js";
import { esc, money, date, field } from "./accountPages.js";
import { toCyrillic } from "../public/translit.js";
import { fmtSum, fmtDate } from "../public/i18n.js";
import { PRICES, PERIODS, planAmount, discountOf, payLinks, company, bankTransfer, providers, SEATS } from "./billing.js";
import { mailEnabled } from "./mail.js";

const FONT_DIR = join(dirname(createRequire(import.meta.url).resolve("dejavu-fonts-ttf/package.json")), "ttf");
const T = {
  pl_pro: ["Yurist Pro", "Юрист Pro"], pl_firma: ["Firma", "Фирма"], pl_org: ["Tashkilot", "Организация"],
  mon1: ["1 oy", "1 месяц"], mon3: ["3 oy", "3 месяца"], mon12: ["12 oy", "12 месяцев"],
  payTitle: ["To‘lov", "Оплата"], order: ["Buyurtma № {n}", "Заказ № {n}"], total: ["To‘lanadi", "К оплате"], what: ["Xizmat", "Услуга"], period: ["Muddat", "Срок"],
  subOf: ["«{p}» obunasi", "Подписка «{p}»"], commission: ["Platforma komissiyasi", "Комиссия платформы"],
  how: ["Qanday to‘laysiz?", "Как оплатить?"], payme: ["Payme orqali to‘lash", "Оплатить через Payme"], click: ["Click orqali to‘lash", "Оплатить через Click"],
  cardsNote: ["Uzcard va Humo kartalari. Karta ma’lumotlari faqat to‘lov tizimida kiritiladi — bizning serverga kelmaydi.", "Карты Uzcard и Humo. Данные карты вводятся только в платёжной системе и к нам не попадают."],
  bank: ["Bank o‘tkazmasi (yuridik shaxslar)", "Банковский перевод (юрлица)"], bankNote: ["Hisob-fakturani yuklab oling va to‘lang. Pul tushgach, obunani qo‘lda faollashtiramiz (odatda 1 ish kuni).", "Скачайте счёт и оплатите. После поступления активируем подписку вручную (обычно 1 рабочий день)."],
  invoice: ["Hisob-faktura (PDF)", "Счёт (PDF)"], none: ["Onlayn to‘lov hozircha ulanmagan. To‘lov uchun biz bilan bog‘laning.", "Онлайн-оплата пока не подключена. Свяжитесь с нами для оплаты."],
  byDeal: ["Narx kelishuv bo‘yicha. Operator siz bilan bog‘lanib narxni belgilaydi, keyin shu sahifada to‘lash mumkin bo‘ladi.", "Цена по договорённости. Мы свяжемся с вами, назначим цену, и её можно будет оплатить здесь."],
  waiting: ["To‘lov holati avtomatik yangilanadi.", "Статус оплаты обновляется автоматически."], processing: ["To‘lov jarayonda… Odatda bir daqiqa ichida yakunlanadi.", "Платёж обрабатывается… Обычно это занимает до минуты."],
  paid: ["To‘lov qabul qilindi. Rahmat!", "Оплата получена. Спасибо!"], activeTill: ["Obuna {d} gacha faol.", "Подписка активна до {d}."], cancelled: ["Buyurtma bekor qilingan.", "Заказ отменён."], refunded: ["To‘lov qaytarilgan.", "Платёж возвращён."],
  receipt: ["Fiskal chek", "Фискальный чек"], cancelBtn: ["Buyurtmani bekor qilish", "Отменить заказ"], toPlans: ["Tariflarga qaytish", "К тарифам"], toCab: ["Kabinetga o‘tish", "В кабинет"], terms: ["To‘lash bilan ommaviy oferta shartlariga rozi bo‘lasiz.", "Оплачивая, вы соглашаетесь с публичной офертой."], offerLink: ["Oferta", "Оферта"],
  histTitle: ["To‘lovlarim", "Мои платежи"], histNone: ["Hali to‘lov yo‘q.", "Платежей пока нет."], payNow: ["To‘lash", "Оплатить"], view: ["Ko‘rish", "Открыть"],
  st_pending: ["Kutilmoqda", "Ожидает"], st_paid: ["To‘langan", "Оплачен"], st_refunded: ["Qaytarilgan", "Возвращён"], st_cancelled: ["Bekor qilingan", "Отменён"], back: ["← Hisobim", "← Мой аккаунт"],
  choose: ["To‘lovga o‘tish", "Перейти к оплате"], periodQ: ["Necha oyga", "На сколько"], renew: ["Uzaytirish", "Продлить"], save: ["−{p}%", "−{p}%"],
  // Hisob-faktura
  inv: ["HISOB-FAKTURA (to‘lov uchun)", "СЧЁТ НА ОПЛАТУ"], invFrom: ["Yetkazib beruvchi", "Поставщик"], invTo: ["Buyurtmachi", "Заказчик"], inn: ["STIR", "ИНН"], acc: ["Hisob raqami", "Расчётный счёт"], mfo: ["MFO", "МФО"], bankL: ["Bank", "Банк"], addr: ["Manzil", "Адрес"], tel: ["Telefon", "Телефон"],
  sum: ["Jami", "Итого"], purpose: ["To‘lov maqsadi: HuquqYo‘l, buyurtma № {n}", "Назначение: HuquqYo‘l, заказ № {n}"], vat: ["QQS: {v}", "НДС: {v}"], noVat: ["QQSsiz", "без НДС"],
  // Xavfsizlik
  secTitle: ["Xavfsizlik va ma’lumotlarim", "Безопасность и мои данные"], mustHave: ["Admin paneliga kirish uchun ikki bosqichli kirishni yoqing.", "Для доступа к админ-панели включите двухэтапный вход."],
  emailH: ["E-pochta", "Эл. почта"], emailOk: ["Tasdiqlangan", "Подтверждена"], emailNo: ["Tasdiqlanmagan", "Не подтверждена"], emailSend: ["Tasdiqlash xatini yuborish", "Отправить письмо"], emailSent: ["Xat yuborildi. Pochtangizni tekshiring.", "Письмо отправлено. Проверьте почту."],
  twoH: ["Ikki bosqichli kirish", "Двухэтапный вход"], twoLead: ["Parol o‘g‘irlansa ham, hisobingizga telefoningizdagi kodsiz kirib bo‘lmaydi.", "Даже зная пароль, без кода с вашего телефона войти нельзя."], twoOn: ["Yoqilgan", "Включён"], twoOff: ["O‘chirilgan", "Выключен"],
  pw: ["Parolingiz", "Ваш пароль"], start: ["Sozlashni boshlash", "Начать настройку"], step1: ["1. Google Authenticator, Microsoft Authenticator yoki Aegis ilovasida «Kalitni qo‘lda kiritish» ni tanlang va shu kalitni yozing:", "1. В Google Authenticator, Microsoft Authenticator или Aegis выберите «Ввести ключ вручную» и укажите ключ:"], openApp: ["Telefonda ilovani ochish", "Открыть приложение на телефоне"],
  step2: ["2. Ilova ko‘rsatgan 6 xonali kod", "2. 6-значный код из приложения"], enable: ["Yoqish", "Включить"], codesH: ["Zaxira kodlar", "Резервные коды"], codesLead: ["Telefon yo‘qolsa, kod o‘rniga shulardan birini kiriting. Har biri bir marta ishlaydi. Hozir saqlab qo‘ying — boshqa ko‘rsatilmaydi.", "Если потеряете телефон, введите один из них вместо кода. Каждый работает один раз. Сохраните сейчас — больше они не покажутся."], disable: ["O‘chirish", "Выключить"], code: ["Kod yoki zaxira kod", "Код или резервный код"], done: ["Saqladim, davom etish", "Сохранил, продолжить"],
  devH: ["Kirilgan qurilmalar", "Устройства"], cur: ["Shu qurilma", "Это устройство"], end: ["Chiqarish", "Завершить"], endAll: ["Boshqa barcha qurilmalardan chiqish", "Выйти на всех других устройствах"],
  pwH: ["Parolni almashtirish", "Смена пароля"], curPw: ["Joriy parol", "Текущий пароль"], newPw: ["Yangi parol", "Новый пароль"], pwHint: ["Kamida 8 belgi: harf va raqam.", "Не менее 8 символов: буквы и цифры."], change: ["Almashtirish", "Сменить"], changed: ["Parol almashtirildi. Boshqa qurilmalardan chiqarildi.", "Пароль изменён, другие устройства отключены."],
  dataH: ["Ma’lumotlarim", "Мои данные"], dataLead: ["Biz saqlaydigan barcha ma’lumotlaringizni fayl ko‘rinishida olishingiz yoki hisobni butunlay o‘chirishingiz mumkin.", "Вы можете скачать все ваши данные или полностью удалить аккаунт."], dl: ["Yuklab olish (JSON)", "Скачать (JSON)"], delH: ["Hisobni o‘chirish", "Удалить аккаунт"], delLead: ["Profil, kabinet, kelishuvlar va obuna o‘chadi. Qaytarib bo‘lmaydi. To‘lov yozuvlari buxgalteriya uchun shaxssiz qoladi.", "Профиль, кабинет, договорённости и подписка удалятся без возможности восстановления. Записи о платежах останутся обезличенными."], del: ["Hisobni butunlay o‘chirish", "Удалить навсегда"], delSure: ["Qaytarib bo‘lmasligini tushundim", "Понимаю, что это необратимо"],
  // Parol
  fgTitle: ["Parolni tiklash", "Восстановление пароля"], fgLead: ["Hisobingiz e-pochtasini yozing. Agar bunday hisob bo‘lsa, havola yuboramiz.", "Укажите почту аккаунта. Если он существует, мы отправим ссылку."], fgBtn: ["Havola yuborish", "Отправить ссылку"], fgOk: ["Agar bunday hisob bo‘lsa, xat yuborildi. Spam papkasini ham tekshiring.", "Если аккаунт существует, письмо отправлено. Проверьте и «Спам»."], rsBtn: ["Parolni saqlash", "Сохранить пароль"], badLink: ["Havola eskirgan yoki ishlatilgan.", "Ссылка устарела или уже использована."], again: ["Yangi havola so‘rash", "Запросить новую"],
  cfTitle: ["E-pochtani tasdiqlash", "Подтверждение почты"], cfBtn: ["Tasdiqlayman", "Подтверждаю"], cfLead: ["E-pochta sizniki ekanini tasdiqlash uchun tugmani bosing.", "Нажмите, чтобы подтвердить, что почта ваша."], mailOff: ["Xat yuborish hozircha sozlanmagan.", "Отправка писем пока не настроена."],
  email: ["E-pochta", "Эл. почта"],
  // Jamoa
  tmTitle: ["Jamoa", "Команда"], tmNone: ["Sizda jamoa yo‘q. Firma yoki Tashkilot tarifida hamkasblaringizni taklif qilib, umumiy kartoteka yuritasiz.", "У вас нет команды. В тарифах «Фирма» и «Организация» можно пригласить коллег и вести общую картотеку."], tmNoPlan: ["Jamoa tarifi faol emas — a’zolar umumiy kartotekani ocha olmaydi.", "Тариф команды не активен — участники не могут открыть общую картотеку."], seats: ["O‘rinlar: {a} / {b}", "Места: {a} / {b}"], owner: ["Egasi", "Владелец"], member: ["A’zo", "Участник"], remove: ["Chiqarish", "Исключить"], leave: ["Jamoadan chiqish", "Выйти из команды"], invH: ["Hamkasbni taklif qilish", "Пригласить коллегу"], invBtn: ["Taklif yuborish", "Отправить приглашение"], invOk: ["Taklif yaratildi. Havola 7 kun ishlaydi:", "Приглашение создано. Ссылка действует 7 дней:"], invList: ["Kutilayotgan takliflar", "Ожидают ответа"], until: ["{d} gacha", "до {d}"], revoke: ["Bekor qilish", "Отменить"], share: ["Umumiy kartotekani ochish", "Открыть общую картотеку"],
  ivTitle: ["Jamoaga taklif", "Приглашение в команду"], ivText: ["«{o}» sizni jamoasiga taklif qilmoqda. Qo‘shilsangiz, umumiy kartotekani ko‘rasiz va tahrirlaysiz; shaxsiy kabinetingiz sizda qoladi.", "«{o}» приглашает вас в команду. Вы сможете видеть и редактировать общую картотеку; личный кабинет останется вашим."], join: ["Qo‘shilish", "Присоединиться"]
};
export const L = lang => (k, v = {}) => { const s = (T[k] || [k, k])[lang === "ru" ? 1 : 0].replace(/\{(\w+)\}/g, (_, x) => v[x] ?? ""); return lang === "cyr" ? toCyrillic(s) : s; };
const ERR = `<p class="err" data-err role="alert" hidden></p>`;
const okMsg = `<p class="ok" data-ok-msg role="status" hidden></p>`;
const what = (p, t) => p.kind === "commission" ? t("commission") : t("subOf", { p: t("pl_" + p.plan) });
const mon = (m, t) => PERIODS.includes(Number(m)) ? t("mon" + m) : String(m);

// ---------- Tarif kartasidagi «davr tanlash + to‘lovga o‘tish» ----------
export function orderForm({ lang, plan, active = false, best = false }){
  const t = L(lang), opts = plan === "org" ? "" : `<div class="field"><label for="pm_${plan}">${esc(t("periodQ"))}</label><select id="pm_${plan}" name="months">${PERIODS.map(m =>
    `<option value="${m}">${esc(t("mon" + m))} — ${esc(money(planAmount(plan, m), lang))}${discountOf(m) ? ` (${esc(t("save", { p: discountOf(m) }))})` : ""}</option>`).join("")}</select></div>`;
  return `<form class="orderf" data-api="/api/subscriptions">${opts}<input type="hidden" name="plan" value="${plan}"><button class="btn ${best ? "primary" : "ghost"}" type="submit">${esc(t(active ? "renew" : "choose"))}</button>${ERR}</form>`;
}

// ---------- To‘lov sahifasi ----------
export function checkoutPage({ lang, cssHref, fs, user, accHref, req, p, tx, fiscal }){
  const t = L(lang), links = p.status === "pending" && Number(p.amount) > 0 ? payLinks(p, req, lang) : {}, prov = providers();
  const row = (k, v) => `<div><dt>${esc(k)}</dt><dd>${v}</dd></div>`;
  const summary = `<dl class="paysum">${row(t("what"), esc(what(p, t)))}${p.kind === "subscription" && Number(p.amount) ? row(t("period"), esc(mon(p.months, t))) : ""}${Number(p.amount) ? row(t("total"), `<b class="paytotal">${esc(money(p.amount, lang))}</b>`) : ""}</dl>`;
  let body;
  if (p.status === "paid") body = `<p class="paystate ok" role="status">✓ ${esc(t("paid"))}</p>${p.sub_ends ? `<p>${esc(t("activeTill", { d: date(p.sub_ends, lang) }))}</p>` : ""}
      <p class="rowbtn"><a class="btn primary" href="/kabinet">${esc(t("toCab"))}</a>${fiscal ? `<a class="btn ghost" href="${esc(fiscal)}" target="_blank" rel="noopener noreferrer">${esc(t("receipt"))} ↗</a>` : ""}</p>`;
  else if (p.status !== "pending") body = `<p class="paystate">${esc(t(p.status))}</p><p><a class="btn ghost" href="/tariflar">${esc(t("toPlans"))}</a></p>`;
  else if (!Number(p.amount)) body = `<p class="note">${esc(t("byDeal"))}</p>`;
  else body = `<h2 class="sec" id="howH">${esc(t("how"))}</h2>
      ${tx?.state === 1 ? `<p class="note warn" role="status">${esc(t("processing"))}</p>` : ""}
      <div class="paymethods" aria-labelledby="howH">
      ${links.payme ? `<a class="paybtn" href="${esc(links.payme)}" rel="noopener"><b>Payme</b><span>${esc(t("payme"))}</span></a>` : ""}
      ${links.click ? `<a class="paybtn" href="${esc(links.click)}" rel="noopener"><b>Click</b><span>${esc(t("click"))}</span></a>` : ""}
      ${bankTransfer() ? `<a class="paybtn" href="/tolov/${p.id}/hisob-faktura"><b>${esc(t("bank"))}</b><span>${esc(t("invoice"))}</span></a>` : ""}</div>
      ${prov.some(x => x !== "bank") ? `<p class="small muted">🔒 ${esc(t("cardsNote"))}</p>` : ""}${bankTransfer() ? `<p class="small muted">${esc(t("bankNote"))}</p>` : ""}
      ${prov.length ? `<p class="small">${esc(t("terms"))} <a href="/oferta">${esc(t("offerLink"))}</a></p><p class="small muted" data-pay-status="/api/payments/${p.id}" role="status">${esc(t("waiting"))}</p>` : `<p class="note warn">${esc(t("none"))} ${esc([company().phone, company().email].filter(Boolean).join(" · "))}</p>`}`;
  const cancel = p.status === "pending" && p.kind === "subscription" ? `<p><button class="linkbtn" type="button" data-post="/api/payments/${p.id}/cancel">${esc(t("cancelBtn"))}</button></p>` : "";
  return page({ lang, cssHref, fs, user, accHref, path: `/tolov/${p.id}`, title: t("payTitle"), desc: "", body: `
    <p><a href="/hisob/tolovlar">← ${esc(t("histTitle"))}</a></p>
    <section class="card paybox"><h1>${esc(t("payTitle"))}</h1><p class="muted">${esc(t("order", { n: p.id }))}</p>${summary}${body}${cancel}${ERR}</section>` });
}
export function paymentsPage({ lang, cssHref, fs, user, accHref, list }){
  const t = L(lang);
  return page({ lang, cssHref, fs, user, accHref, path: "/hisob/tolovlar", title: t("histTitle"), desc: "", body: `
    <p><a href="/hisob">${esc(t("back"))}</a></p><h1>${esc(t("histTitle"))}</h1>
    ${list.length ? `<ul class="klist">${list.map(p => `<li><div><b>${esc(what(p, t))}</b>${p.kind === "subscription" && Number(p.amount) ? ` · ${esc(mon(p.months, t))}` : ""}<br>
      <span class="small muted">${esc(t("order", { n: p.id }))} · ${esc(date(p.paid_at || p.created_at, lang))}${p.method ? ` · ${esc(p.method)}` : ""}</span></div>
      <div class="rowbtn"><b>${Number(p.amount) ? esc(money(p.amount, lang)) : "—"}</b><span class="chip ${p.status === "paid" ? "ok" : p.status === "pending" ? "warn" : ""}">${esc(t("st_" + p.status))}</span>
      <a class="btn ${p.status === "pending" ? "primary" : "ghost"} sm" href="/tolov/${p.id}">${esc(t(p.status === "pending" ? "payNow" : "view"))}<span class="sr"> — ${esc(t("order", { n: p.id }))}</span></a></div></li>`).join("")}</ul>` : `<p class="empty">${esc(t("histNone"))}</p>`}
    <p><a class="btn ghost" href="/tariflar">${esc(t("toPlans"))}</a></p>` });
}

// ---------- Hisob-faktura (bank o‘tkazmasi uchun) ----------
export function invoicePdf({ lang, p, user, org }){
  const t = L(lang), c = company(), doc = new PDFDocument({ size: "A4", margin: 56, info: { Title: `HuquqYo'l ${p.id}` } });
  doc.registerFont("R", join(FONT_DIR, "DejaVuSerif.ttf")); doc.registerFont("B", join(FONT_DIR, "DejaVuSerif-Bold.ttf"));
  const cy = s => lang === "cyr" ? toCyrillic(String(s)) : String(s);
  return new Promise((ok, no) => {
    const out = []; doc.on("data", d => out.push(d)); doc.on("end", () => ok(Buffer.concat(out))); doc.on("error", no);
    doc.font("B").fontSize(15).text(t("inv"), { align: "center" }).moveDown(0.3).font("R").fontSize(11).text(`№ ${p.id} · ${cy(fmtDate(new Date(p.created_at), lang === "ru" ? "ru" : "uz"))}`, { align: "center" }).moveDown(1.5);
    const block = (h, rows) => { doc.font("B").fontSize(11).text(h); doc.font("R").fontSize(10.5); for (const [k, v] of rows) if (v) doc.text(`${k ? k + ": " : ""}${v}`); doc.moveDown(1); };
    block(t("invFrom"), [["", c.name], [t("inn"), c.inn], [t("addr"), c.address], [t("bankL"), c.bank], [t("acc"), c.account], [t("mfo"), c.mfo], [t("tel"), c.phone]]);
    block(t("invTo"), [["", org?.name || user.name], [t("inn"), org?.inn], ["", user.email]]);
    doc.font("B").text(`${t("what")}: `, { continued: true }).font("R").text(`${what(p, t)}${p.kind === "subscription" ? `, ${mon(p.months, t)}` : ""}`);
    const vat = Number(process.env.FISCAL_VAT || 0), amount = Number(p.amount);
    doc.moveDown(0.5).font("B").fontSize(13).text(`${t("sum")}: ${fmtSum(amount)} ${cy(lang === "ru" ? "сум" : "so‘m")}`).font("R").fontSize(10.5)
      .text(vat ? t("vat", { v: `${vat}% — ${fmtSum(Math.round(amount * vat / (100 + vat)))}` }) : t("noVat")).moveDown(1).text(t("purpose", { n: p.id }));
    doc.end();
  });
}

// ---------- Hisob xavfsizligi ----------
export function securityPage({ lang, cssHref, fs, user, accHref, sessions, query }){
  const t = L(lang), pw = (id) => field(id, t("pw"), `<input id="${id}" name="password" type="password" required autocomplete="current-password" maxlength="200">`);
  const code = id => field(id, t("code"), `<input id="${id}" name="code" inputmode="text" autocomplete="one-time-code" maxlength="20" required>`);
  const ua = s => { const u = String(s || ""), os = /Windows|Android|iPhone|iPad|Mac OS|Linux/.exec(u)?.[0] || "", br = /Edg|OPR|Firefox|YaBrowser|Chrome|Safari/.exec(u)?.[0] || ""; return [br === "Edg" ? "Edge" : br === "OPR" ? "Opera" : br === "YaBrowser" ? "Yandex" : br, os].filter(Boolean).join(" · ") || "—"; };
  return page({ lang, cssHref, fs, user, accHref, path: "/xavfsizlik", title: t("secTitle"), desc: "", body: `
    <p><a href="${["admin", "moderator"].includes(user.role) ? "/admin" : "/hisob"}">← ${esc(user.name)}</a></p><h1>${esc(t("secTitle"))}</h1>
    ${query?.majburiy && !user.totp ? `<p class="note warn" role="alert">${esc(t("mustHave"))}</p>` : ""}
    <section class="card secbox" aria-labelledby="emH"><h2 id="emH">${esc(t("emailH"))}</h2><p>${esc(user.email)} <span class="chip ${user.email_verified_at ? "ok" : "warn"}">${esc(t(user.email_verified_at ? "emailOk" : "emailNo"))}</span></p>
      ${!user.email_verified_at && mailEnabled() ? `<form data-api="/api/auth/verify" data-ok="${esc(t("emailSent"))}"><button class="btn ghost" type="submit">${esc(t("emailSend"))}</button>${okMsg}${ERR}</form>` : ""}</section>
    <section class="card secbox" aria-labelledby="twH"><h2 id="twH">${esc(t("twoH"))} <span class="chip ${user.totp ? "ok" : "warn"}">${esc(t(user.totp ? "twoOn" : "twoOff"))}</span></h2><p class="muted">${esc(t("twoLead"))}</p>
      ${user.totp ? `<form class="kform narrow" data-api="/api/auth/2fa/disable">${pw("tf_pw")}${code("tf_code")}<button class="btn ghost" type="submit">${esc(t("disable"))}</button>${ERR}</form>` : `
      <form class="kform narrow" data-api="/api/auth/2fa/start" data-result="tf_setup">${pw("tf_pw")}<button class="btn primary" type="submit">${esc(t("start"))}</button>${ERR}</form>
      <div id="tf_setup" hidden><p>${esc(t("step1"))}</p><p><code class="totpkey" data-fill="secret"></code></p><p><a class="btn ghost sm" data-fill-href="uri" href="#">${esc(t("openApp"))}</a></p>
        <form class="kform narrow" data-api="/api/auth/2fa/enable" data-result="tf_codes">${field("tf_new", t("step2"), `<input id="tf_new" name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="\\d{6}" required>`)}<button class="btn primary" type="submit">${esc(t("enable"))}</button>${ERR}</form></div>
      <div id="tf_codes" hidden><h3>${esc(t("codesH"))}</h3><p>${esc(t("codesLead"))}</p><ul class="reccodes" data-fill-list="codes"></ul><p><a class="btn primary" href="/xavfsizlik">${esc(t("done"))}</a></p></div>`}</section>
    <section class="card secbox" aria-labelledby="pwH"><h2 id="pwH">${esc(t("pwH"))}</h2><form class="kform narrow" data-api="/api/auth/password" data-ok="${esc(t("changed"))}">
      ${field("a_cur", t("curPw"), `<input id="a_cur" name="current" type="password" required autocomplete="current-password" maxlength="200">`)}${field("a_new", t("newPw"), `<input id="a_new" name="password" type="password" required minlength="8" maxlength="200" autocomplete="new-password">`, t("pwHint"))}
      <button class="btn primary" type="submit">${esc(t("change"))}</button>${ERR}${okMsg}</form></section>
    <section class="card secbox" aria-labelledby="dvH"><h2 id="dvH">${esc(t("devH"))}</h2><ul class="klist">${sessions.map(s => `<li><div><b>${esc(ua(s.ua))}</b><br><span class="small muted">${esc(date(s.created_at, lang))}${s.ip ? ` · ${esc(s.ip)}` : ""}</span></div>${s.current ? `<span class="chip ok">${esc(t("cur"))}</span>` : `<button class="btn ghost sm" type="button" data-post="/api/auth/sessions/${s.ref}/end">${esc(t("end"))}</button>`}</li>`).join("")}</ul>
      ${sessions.length > 1 ? `<p><button class="btn ghost" type="button" data-post="/api/auth/sessions/others/end">${esc(t("endAll"))}</button></p>` : ""}${ERR}</section>
    <section class="card secbox" aria-labelledby="dtH"><h2 id="dtH">${esc(t("dataH"))}</h2><p class="muted">${esc(t("dataLead"))}</p><p><a class="btn ghost" href="/malumotlarim" download>${esc(t("dl"))}</a></p>
      ${user.role === "admin" ? "" : `<details><summary>${esc(t("delH"))}</summary><p>${esc(t("delLead"))}</p><form class="kform narrow" data-api="/api/account/delete">${pw("dl_pw")}${user.totp ? code("dl_code") : ""}<label class="check"><input type="checkbox" required> ${esc(t("delSure"))}</label><button class="btn danger" type="submit">${esc(t("del"))}</button>${ERR}</form></details>`}</section>` });
}

// ---------- Parolni tiklash / e-pochtani tasdiqlash ----------
export function forgotPage(a){
  const t = L(a.lang);
  return page({ ...a, path: "/parol-unutdim", title: t("fgTitle"), desc: t("fgLead"), body: `<div class="authbox"><h1>${esc(t("fgTitle"))}</h1>${mailEnabled() ? `<p class="lead">${esc(t("fgLead"))}</p>
    <form class="card kform" data-api="/api/auth/forgot" data-ok="${esc(t("fgOk"))}">${field("f_email", t("email"), `<input id="f_email" name="email" type="email" required autocomplete="username" maxlength="254">`)}<button class="btn primary" type="submit">${esc(t("fgBtn"))}</button>${ERR}${okMsg}</form>`
    : `<p class="note warn">${esc(t("mailOff"))} ${esc([company().phone, company().email].filter(Boolean).join(" · "))}</p>`}</div>` });
}
export function resetPage(a){
  const t = L(a.lang);
  return page({ ...a, path: "/parol-tiklash", title: t("fgTitle"), desc: "", body: `<div class="authbox"><h1>${esc(t("fgTitle"))}</h1>${a.valid ? `<form class="card kform" data-api="/api/auth/reset"><input type="hidden" name="token" value="${esc(a.token)}">
    ${field("rs_pw", t("newPw"), `<input id="rs_pw" name="password" type="password" required minlength="8" maxlength="200" autocomplete="new-password">`, t("pwHint"))}<button class="btn primary" type="submit">${esc(t("rsBtn"))}</button>${ERR}</form>`
    : `<p class="note warn">${esc(t("badLink"))}</p><p><a class="btn ghost" href="/parol-unutdim">${esc(t("again"))}</a></p>`}</div>` });
}
export function confirmPage(a){
  const t = L(a.lang);
  return page({ ...a, path: "/tasdiqlash", title: t("cfTitle"), desc: "", body: `<div class="authbox"><h1>${esc(t("cfTitle"))}</h1>${a.valid ? `<p class="lead">${esc(t("cfLead"))}</p><form class="card kform" data-api="/api/auth/confirm"><input type="hidden" name="token" value="${esc(a.token)}"><button class="btn primary" type="submit">${esc(t("cfBtn"))}</button>${ERR}</form>` : `<p class="note warn">${esc(t("badLink"))}</p>`}</div>` });
}

// ---------- Jamoa ----------
export function teamPage(a){
  const t = L(a.lang), m = a.team;
  const body = !m ? `<p class="card">${esc(t("tmNone"))}</p><p><a class="btn primary" href="/tariflar">${esc(t("toPlans"))}</a></p>` : `
    <p class="lead">${esc(m.org.name)}</p>${m.plan ? `<p><span class="chip ok">${esc(t("pl_" + m.plan))}</span> <span class="chip">${esc(t("seats", { a: m.members.length, b: m.seats }))}</span></p><p><a class="btn primary" href="/kabinet?joy=jamoa">${esc(t("share"))}</a></p>` : `<p class="note warn">${esc(t("tmNoPlan"))} <a href="/tariflar">${esc(t("toPlans"))}</a></p>`}
    <ul class="klist">${m.members.map(x => `<li><div><b>${esc(x.name)}</b><br><span class="small muted">${esc(x.email)}</span></div><div class="rowbtn"><span class="chip">${esc(t(x.org_role === "owner" ? "owner" : "member"))}</span>
      ${x.org_role !== "owner" && (m.owner || x.id === a.user.id) ? `<button class="linkbtn" type="button" data-post="/api/team/members/${x.id}/remove">${esc(t(x.id === a.user.id ? "leave" : "remove"))}<span class="sr">: ${esc(x.name)}</span></button>` : ""}</div></li>`).join("")}</ul>${ERR}
    ${m.owner && m.plan ? `<form class="card kform narrow" data-api="/api/team/invite" data-result="inv_res"><h2>${esc(t("invH"))}</h2>${field("iv_email", t("email"), `<input id="iv_email" name="email" type="email" required maxlength="254" autocomplete="off">`)}<button class="btn primary" type="submit">${esc(t("invBtn"))}</button>${ERR}
      <div id="inv_res" hidden><p class="ok">${esc(t("invOk"))}</p><p><code class="totpkey" data-fill="link" data-abs></code></p></div></form>` : ""}
    ${m.owner && m.invites.length ? `<h2 class="sec">${esc(t("invList"))}</h2><ul class="klist">${m.invites.map(i => `<li><div>${esc(i.email)} <span class="small muted">${esc(t("until", { d: date(i.expires_at, a.lang) }))}</span></div><button class="linkbtn" type="button" data-post="/api/team/invite/${i.ref}/cancel">${esc(t("revoke"))}<span class="sr">: ${esc(i.email)}</span></button></li>`).join("")}</ul>` : ""}`;
  return page({ ...a, path: "/jamoa", title: t("tmTitle"), desc: "", body: `<p><a href="/hisob">${esc(t("back"))}</a></p><h1>${esc(t("tmTitle"))}</h1>${body}` });
}
export function invitePage(a){
  const t = L(a.lang);
  return page({ ...a, path: "/jamoa/taklif", title: t("ivTitle"), desc: "", body: `<div class="authbox"><h1>${esc(t("ivTitle"))}</h1>${a.inv ? `<p class="lead">${esc(t("ivText", { o: a.inv.org.name }))}</p><form class="card kform" data-api="/api/team/accept"><input type="hidden" name="token" value="${esc(a.token)}"><button class="btn primary" type="submit">${esc(t("join"))}</button>${ERR}</form>` : `<p class="note warn">${esc(t("badLink"))}</p>`}</div>` });
}

// ---------- Ommaviy oferta: faqat ilovada haqiqatan ishlaydigan shartlar. Yurist ko‘rib chiqishi kerak (qarang: DEPLOY.md). ----------
const OF = {
  title: ["Ommaviy oferta: xizmat, to‘lov va qaytarish shartlari", "Публичная оферта: услуги, оплата и возврат"],
  s: [
    [["1. Umumiy", "1. Общие положения"], ["Ushbu hujjat HuquqYo‘l platformasining pullik xizmatlari bo‘yicha ommaviy taklif (oferta). Buyurtmani to‘lash — oferta shartlarini qabul qilish hisoblanadi.", "Настоящий документ — публичное предложение (оферта) о платных услугах платформы HuquqYo‘l. Оплата заказа означает принятие условий оферты."]],
    [["2. Xizmatlar", "2. Услуги"], ["Fuqarolar uchun vaziyat tahlili, reja va hujjat tayyorlash bepul. Pullik obunalar: Yurist Pro, Firma va Tashkilot — kabinet, yo‘nalish kutubxonasi, jamoa va katalogdagi profil. Har bir tarif tarkibi «Tariflar» sahifasida.", "Анализ ситуации, план и документы для граждан бесплатны. Платные подписки: «Юрист Pro», «Фирма» и «Организация» — кабинет, библиотека направления, команда и профиль в каталоге. Состав — на странице «Тарифы»."], ["Platforma advokatlik xizmati ko‘rsatmaydi va yurist bilan mijoz o‘rtasidagi shartnoma tarafi emas. Tayyor hujjat va hisob-kitoblar ma’lumot uchun; yakuniy qaror foydalanuvchiniki.", "Платформа не оказывает адвокатских услуг и не является стороной договора между юристом и клиентом. Документы и расчёты носят справочный характер; решение принимает пользователь."]],
    [["3. Narx va to‘lov", "3. Цена и оплата"], ["Narxlar so‘mda, «Tariflar» va to‘lov sahifasida ko‘rsatiladi. To‘lov Payme, Click yoki bank o‘tkazmasi orqali. Karta ma’lumotlari faqat to‘lov tizimida qayta ishlanadi. Obuna to‘langan davrga ochiladi; avtomatik yechib olish yo‘q — davr tugagach, o‘zingiz uzaytirasiz. Muddatidan oldin uzaytirilsa, yangi davr amaldagisining oxiriga qo‘shiladi.", "Цены указаны в сумах на страницах «Тарифы» и оплаты. Оплата — Payme, Click или банковский перевод. Данные карты обрабатывает только платёжная система. Подписка открывается на оплаченный период; автосписаний нет — продлеваете вы сами. При досрочном продлении новый период прибавляется к текущему."], ["Yurist va fuqaro kelishuvidan olinadigan komissiya foizi kelishuv sahifasida ko‘rsatiladi va yurist tomonidan to‘lanadi.", "Процент комиссии с договорённостей указан на странице договорённости и оплачивается юристом."]],
    [["4. Qaytarish", "4. Возврат"], ["Xizmat bizning aybimiz bilan ishlamagan bo‘lsa yoki to‘lov xato qilingan bo‘lsa, murojaat qiling: buyurtma raqami va hisob e-pochtasini yozing. Pul to‘langan usulda qaytariladi; qaytarilgan davr obunadan ayiriladi. To‘lov tizimlarining qaytarish qoidalari ham qo‘llanadi.", "Если услуга не работала по нашей вине или платёж ошибочный, обратитесь к нам, указав номер заказа и почту аккаунта. Деньги возвращаются тем же способом; возвращённый период вычитается из подписки. Применяются и правила возврата платёжных систем."]],
    [["5. Shaxsiy ma’lumotlar", "5. Персональные данные"], ["Qaysi ma’lumotlar olinishi «Maxfiylik» sahifasida yozilgan. Ma’lumotlaringizni yuklab olish va hisobni o‘chirish — «Xavfsizlik» sahifasida.", "Какие данные обрабатываются, описано на странице «Конфиденциальность». Скачать данные и удалить аккаунт можно на странице «Безопасность»."]]
  ], req: ["6. Rekvizitlar", "6. Реквизиты"], noReq: ["Rekvizitlar hali kiritilmagan.", "Реквизиты ещё не указаны."]
};
export function offerPage(a){
  const t = L(a.lang), f = x => a.lang === "ru" ? x[1] : a.lang === "cyr" ? toCyrillic(x[0]) : x[0], c = company();
  const rows = [["", c.name], [t("inn"), c.inn], [t("addr"), c.address], [t("bankL"), c.bank], [t("acc"), c.account], [t("mfo"), c.mfo], [t("tel"), c.phone], ["E-mail", c.email]].filter(r => r[1]);
  return page({ ...a, path: "/oferta", title: f(OF.title), desc: f(OF.title), body: `<h1>${esc(f(OF.title))}</h1>${OF.s.map(([h, ...ps]) => `<section class="pvsec"><h2 class="sec">${esc(f(h))}</h2>${ps.map(p => `<p>${esc(f(p))}</p>`).join("")}</section>`).join("")}
    <section class="pvsec"><h2 class="sec">${esc(f(OF.req))}</h2>${rows.length ? `<p>${rows.map(([k, v]) => `${k ? esc(k) + ": " : ""}${esc(v)}`).join("<br>")}</p>` : `<p class="note warn">${esc(f(OF.noReq))}</p>`}</section>` });
}
export { PRICES, SEATS };
