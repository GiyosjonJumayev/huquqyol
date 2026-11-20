import { kbFor } from "./kb.js";
import { addDays, addMonths, dayDiff, deadlineFrom, parseISO, startOfDay, toISO } from "./dates.js";
import { fmtDate, fmtMoney as money, fmtSum as sum, termText } from "../public/i18n.js";

export const CB_RATE = Number(process.env.CB_RATE || 14);                    // MB asosiy stavkasi, 2026-yil 29-iyul
export const MIN_ALIMONY = Number(process.env.MIN_ALIMONY || 360_400);       // bir bola uchun, 2026-yil 1-sentabrdan
export const fmtSum = n => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
const fmtMoney = n => `${fmtSum(n)} so‘m`;
const num = v => Math.max(0, Number(v) || 0);

const RISK = {
  uz:{ expired:["Muddat o‘tgan","Baribir murojaat qiling va uzrli sababni ko‘rsatib, muddatni tiklashni so‘rang."],
       high:["Shoshiling","Bugundan harakat qiling: kerakli arizani darhol topshiring."],
       medium:["Vaqt kam","Javob kutib, oxirgi muddatni o‘tkazib yubormang."],
       low:["Vaqt yetarli","Avval tinch yo‘l bilan hal qilishga urinib ko‘rish mumkin."], info:"Muddat cheklanmagan", none:"muddatsiz" },
  ru:{ expired:["Срок истёк","Всё равно обращайтесь и просите восстановить срок, указав уважительную причину."],
       high:["Спешите","Действуйте сегодня: подайте нужное заявление немедленно."],
       medium:["Времени мало","Не пропустите последний день, ожидая ответа."],
       low:["Времени достаточно","Можно сначала попробовать решить вопрос мирно."], info:"Срок не ограничен", none:"без срока" }
};
export function riskLevel(daysLeft, total, lang = "uz"){
  const R = RISK[lang] || RISK.uz;
  const level = daysLeft < 0 ? "expired" : daysLeft <= Math.max(3, total * 0.15) ? "high" : daysLeft <= Math.max(7, total * 0.4) ? "medium" : "low";
  return { level, label: R[level][0], tip: R[level][1] };
}

// MK 333-modda (lex.uz/acts/-6257288): kechiktirilgan har bir kun uchun MB qayta moliyalash stavkasining 10 foizi.
// Har oy qarzi o‘z to‘lov kunidan hisoblanadi.
//   literal     — modda matni bo‘yicha (asosiy): qarz × stavka × 10% × kunlar (14% → kuniga 1,4%).
//   alternative — muqobil talqin: stavka yillik deb olinib, kunlik ulushi: qarz × stavka × 10% ÷ 365 × kunlar.
export const MK333_URL = "https://lex.uz/acts/-6257288";
export function compensation({ amount, months = 1, trigger, today = new Date(), rate = CB_RATE }){
  amount = num(amount);
  months = Math.max(1, Math.min(60, Math.round(Number(months) || 1)));
  const share = amount / months;
  let units = 0, maxDays = 0;
  for (let i = 0; i < months; i++){
    const d = dayDiff(addMonths(trigger, i), today);
    if (d > 0){ units += share * d; maxDays = Math.max(maxDays, d); }
  }
  const perDay = rate / 100 * 0.10;                                          // stavkaning 10 foizi
  return { rate, maxDelayDays: maxDays, dailyPct: Math.round(rate * 10) / 100,
    literal: Math.round(units * perDay), alternative: Math.round(units * perDay / 365), source: MK333_URL };
}
const dec = x => String(x).replace(".", ",");                                // uz va ru: o‘nlik vergul

const SHARES = [null, { f:1/4, text:"to‘rtdan bir qismi", ru:"одной четверти", frac:"1/4" }, { f:1/3, text:"uchdan bir qismi", ru:"одной трети", frac:"1/3" }, { f:1/2, text:"yarmi", ru:"половины", frac:"1/2" }];
export const alimonyShare = children => children > 0 ? SHARES[Math.min(3, children)] : null;

// Kalkulyator matnlari: uz / ru (kirill — uz dan avtomatik)
const CT = {
  uz:{
    l333:"Sizga qo‘shimcha to‘lanishi kerak", l333in:"Qarzni kiriting", l333n0:"Kechiktirilgan har bir kun uchun kompensatsiya (MK 333-modda).",
    l333lit:"MK 333-modda matni bo‘yicha", l333alt:"Muqobil talqin (stavka ÷ 365)",
    l333n:(r, d) => `Qarz ustiga. MK 333-modda: kechiktirilgan har bir kun uchun MB qayta moliyalash stavkasining 10 foizi (${r}% × 10% = qarzning kuniga ${d}%). Ayrim hisobchilar stavkani yillik deb, 365 kunga bo‘lib hisoblaydi — shu sababli summa ancha kam chiqadi. Yakuniy summani sud belgilaydi. Manba: ${MK333_URL}`,
    cp:"Sotuvchi to‘laydigan penya", cpIn:"Tovar narxini kiriting", cpN0:"Talab muddatida bajarilmasa, har kun uchun narxning 1 foizi (14–15-moddalar).",
    cpDay:m => `kuniga ${m}`, cpN1:"Sotuvchiga talab qo‘ygan sanani kiritsangiz, jami penya hisoblanadi. Almashtirish muddati — 7 kun.",
    cpNone:"Hali penya yo‘q", cpN2:(d, n, m) => `Sotuvchi ${d}gacha talabni bajarishi kerak (${n} kun qoldi). Keyin har kun uchun ${m}.`,
    cpN3:(d, n) => `Almashtirish muddati ${d}da tugagan: ${n} kun × narxning 1 foizi. Ta’mirlash talabi uchun muddat 20 kun bo‘lgani sababli summa kamroq bo‘lishi mumkin.`,
    al:"Taxminiy aliment (oyiga)", alIn:"Bolalar sonini kiriting", alN0:"Bir bola — daromadning 1/4, ikki bola — 1/3, uch va undan ortiq — 1/2 qismi.",
    alShare:(sh, m) => `Daromadning ${sh.text}: ${m}. `, alNoInc:"Daromadni kiritsangiz, ulush hisoblanadi. ",
    alMin:m => `Eng kam miqdor: bir bola uchun ${m} (2026-yil 1-sentabrdan). Aniq summani sud belgilaydi.`,
    fd:"Jarimani tez to‘lash chegirmasi", fdIn:"Jarima summasini kiriting", fdN0:"15 kun ichida — 50%, 30 kun ichida — 70% to‘lanadi (MJtK 332¹-modda). Shikoyat qilinsa, chegirma yo‘q.",
    fdTill:(d, p) => `${d}gacha (${p})`, fdLate:"Shikoyat qilinsa yoki kechiksa",
    fdN:"Shikoyat qilsangiz va yutqazsangiz, jarima to‘liq to‘lanadi. Qaror aniq noto‘g‘ri bo‘lsa, shikoyat qiling.",
    lc:"Mikroqarz to‘lovlari chegarasi", lcIn:"Qarz summasini kiriting", lcN0:"Foiz, komissiya va jarimalar jami yiliga qarz summasining yarmidan oshmasligi kerak (32-modda).",
    lcCap:"Yillik chegara (qarzning 50%)", lcCharged:"Sizdan undirilgan", lcOver:"Qonundan ortiq",
    lcOverV:m => `${m} ortiqcha`, lcOk:"Undirilgan summa chegaradan oshmagan. Lekin ko‘rib chiqish komissiyasi yoki muddatidan oldin to‘lash jarimasi olingan bo‘lsa, ular baribir qonunga zid.",
    lcN:"Bir yillik foiz, komissiya va jarimalarni kiritsangiz, ortiqcha qismini hisoblaymiz.", lcBad:"Ortiqcha summani qaytarishni talab qiling: avval tashkilotdan, keyin Markaziy bank yoki sud orqali."
  },
  ru:{
    l333:"Вам дополнительно положено", l333in:"Введите сумму долга", l333n0:"Компенсация за каждый день задержки (ст. 333 ТК).",
    l333lit:"По тексту ст. 333 ТК", l333alt:"Иное толкование (ставка ÷ 365)",
    l333n:(r, d) => `Сверх долга. Ст. 333 ТК: за каждый день задержки — 10% ставки рефинансирования ЦБ (${r}% × 10% = ${d}% долга в день). Некоторые бухгалтеры считают ставку годовой и делят на 365 — тогда сумма значительно меньше. Окончательную сумму определяет суд. Источник: ${MK333_URL}`,
    cp:"Пеня, которую платит продавец", cpIn:"Введите цену товара", cpN0:"Если требование не исполнено в срок — 1% цены за каждый день (ст. 14–15).",
    cpDay:m => `${m} в день`, cpN1:"Укажите дату предъявления требования продавцу — посчитаем общую пеню. Срок замены — 7 дней.",
    cpNone:"Пени пока нет", cpN2:(d, n, m) => `Продавец должен исполнить требование до ${d} (осталось дней: ${n}). Затем — ${m} за каждый день.`,
    cpN3:(d, n) => `Срок замены истёк ${d}: ${n} дн. × 1% цены. Для требования о ремонте срок 20 дней, поэтому сумма может быть меньше.`,
    al:"Примерные алименты (в месяц)", alIn:"Укажите количество детей", alN0:"Один ребёнок — 1/4 дохода, двое — 1/3, трое и более — 1/2.",
    alShare:(sh, m) => `Доля дохода (${sh.frac}): ${m}. `, alNoInc:"Укажите доход — посчитаем долю. ",
    alMin:m => `Минимум: ${m} на одного ребёнка (с 1 сентября 2026 г.). Точную сумму определяет суд.`,
    fd:"Скидка за быструю оплату штрафа", fdIn:"Введите сумму штрафа", fdN0:"В течение 15 дней — 50%, в течение 30 дней — 70% (ст. 332¹ КоАО). При обжаловании скидки нет.",
    fdTill:(d, p) => `до ${d} (${p})`, fdLate:"При обжаловании или просрочке",
    fdN:"Если обжалуете и проиграете, штраф уплачивается полностью. Обжалуйте, если постановление явно неправильное.",
    lc:"Предел платежей по микрозайму", lcIn:"Введите сумму займа", lcN0:"Проценты, комиссии и штрафы в сумме не должны превышать половины суммы займа в год (ст. 32).",
    lcCap:"Годовой предел (50% займа)", lcCharged:"С вас взыскано", lcOver:"Сверх закона",
    lcOverV:m => `${m} сверх предела`, lcOk:"Взысканная сумма не превышает предел. Но комиссия за рассмотрение заявки или штраф за досрочное погашение всё равно незаконны.",
    lcN:"Введите проценты, комиссии и штрафы за год — посчитаем превышение.", lcBad:"Требуйте вернуть превышение: сначала у организации, затем через Центральный банк или суд."
  }
};

export const CALCS = {
  labor333({ form, trigger, today, lang }){
    const T = CT[lang], M = n => money(n, lang);
    if (!num(form.amount)) return { title:T.l333, value:T.l333in, note:T.l333n0 };
    const c = compensation({ amount: form.amount, months: form.months, trigger, today });
    return { title:T.l333, value:M(c.literal), raw:c, rows:[[T.l333lit, M(c.literal)], [T.l333alt, M(c.alternative)]],
      note:T.l333n(dec(c.rate), dec(c.dailyPct)) };
  },
  consumerPenalty({ form, today, lang }){
    const T = CT[lang], M = n => money(n, lang), D = d => fmtDate(d, lang);
    const price = num(form.price), demand = parseISO(form.demandDate);
    if (!price) return { title:T.cp, value:T.cpIn, note:T.cpN0 };
    if (!demand) return { title:T.cp, value:T.cpDay(M(price * 0.01)), note:T.cpN1 };
    const due = addDays(demand, 7), late = dayDiff(due, today);
    if (late <= 0) return { title:T.cp, value:T.cpNone, note:T.cpN2(D(due), Math.max(0, -late), M(price * 0.01)) };
    return { title:T.cp, value:M(price * 0.01 * late), raw:{ late, due: toISO(due) }, note:T.cpN3(D(due), late) };
  },
  alimony({ form, lang }){
    const T = CT[lang], M = n => money(n, lang);
    const children = Math.round(num(form.children)), income = num(form.income), sh = alimonyShare(children);
    if (!sh) return { title:T.al, value:T.alIn, note:T.alN0 };
    const min = MIN_ALIMONY * children, byIncome = income * sh.f, val = Math.max(min, byIncome);
    return { title:T.al, value:`≈ ${M(val)}`, raw:{ share: sh.f, min, byIncome },
      note: (income ? T.alShare(sh, M(byIncome)) : T.alNoInc) + T.alMin(M(MIN_ALIMONY)) };
  },
  // Mikroqarz: foiz + komissiya + jarima jami yiliga qarzning yarmidan oshmasligi kerak (O‘RQ-765, 32-modda)
  loanCap({ form, lang }){
    const T = CT[lang], M = n => money(n, lang);
    const loan = num(form.loan), charged = num(form.charged);
    if (!loan) return { title:T.lc, value:T.lcIn, note:T.lcN0 };
    const cap = Math.round(loan * 0.5), excess = Math.max(0, charged - cap);
    if (!charged) return { title:T.lc, value:M(cap), raw:{ cap, excess:0 }, note:T.lcN };
    const rows = [[T.lcCap, M(cap)], [T.lcCharged, M(charged)], [T.lcOver, M(excess)]];
    return { title:T.lc, value: excess ? T.lcOverV(M(excess)) : M(cap), raw:{ cap, excess }, rows, note: excess ? T.lcBad : T.lcOk };
  },
  fineDiscount({ form, trigger, today, lang }){
    const T = CT[lang], M = n => money(n, lang), D = d => fmtDate(d, lang);
    const fine = num(form.fine), d15 = addDays(trigger, 15), d30 = addDays(trigger, 30);
    if (!fine) return { title:T.fd, value:T.fdIn, note:T.fdN0 };
    const rows = [[T.fdTill(D(d15), "50%"), M(fine * 0.5)], [T.fdTill(D(d30), "70%"), M(fine * 0.7)], [T.fdLate, M(fine)]];
    const value = today <= d15 ? M(fine * 0.5) : today <= d30 ? M(fine * 0.7) : M(fine);
    return { title:T.fd, value, rows, note:T.fdN };
  }
};

const whenText = (w, { trigger, deadline, lang }) => w
  .replace("{deadline}", deadline ? fmtDate(deadline, lang) : RISK[lang].none)
  .replace(/\{t\+(\d+)\}/g, (_, n) => fmtDate(addDays(trigger, Number(n)), lang));

// lang: "uz" | "ru" (kirill yozuvi chiqishda o‘giriladi)
export function buildPlan({ scenario, triggerDate, form = {}, today = new Date(), lang = "uz" }){
  lang = lang === "ru" ? "ru" : "uz";
  const { SCENARIO_BY_ID, NORM_BY_ID, OFFICES, OFFICES_CHECKED } = kbFor(lang);
  const s = SCENARIO_BY_ID[scenario];
  if (!s) throw Object.assign(new Error("Noma’lum holat."), { status: 400 });
  const now = startOfDay(today);
  const trigger = parseISO(triggerDate) || addMonths(now, -1);
  const deadline = deadlineFrom(trigger, s.deadline);
  const base = s.deadline.offsetDays ? addDays(trigger, s.deadline.offsetDays) : trigger;
  const total = deadline ? Math.max(1, dayDiff(base, deadline)) : 0;
  const daysLeft = deadline ? dayDiff(now, deadline) : null;
  return {
    scenario: s.id,
    info: { title:s.title, short:s.short, lead:s.lead, domain:s.domain, trigger:s.trigger, docs: s.docs.map(d => ({ id:d.id, label:d.label })) },
    trigger: toISO(trigger),
    deadline: deadline ? toISO(deadline) : null, deadlineText: deadline ? fmtDate(deadline, lang) : "",
    deadlineTerm: termText(s.deadline, lang), deadlineLabel: s.deadline.label, deadlineNote: s.deadline.note || "",
    daysLeft, progress: deadline ? Math.min(1, Math.max(0, dayDiff(base, now) / total)) : 0,
    risk: deadline ? riskLevel(daysLeft, total, lang) : { level:"info", label:RISK[lang].info, tip: s.deadline.note || "" },
    steps: s.steps.map(st => ({ ...st, when: whenText(st.when, { trigger, deadline, lang }) })),
    norms: s.norms.map(id => NORM_BY_ID[id]),
    evidence: s.evidence,
    evidenceInfo: s.evidenceInfo || [],
    offices: (s.offices || []).map(id => OFFICES[id]).filter(Boolean),
    officesChecked: OFFICES_CHECKED ? fmtDate(parseISO(OFFICES_CHECKED), lang) : "",
    calc: s.calc ? CALCS[s.calc.type]({ form, trigger, today: now, lang }) : null
  };
}
