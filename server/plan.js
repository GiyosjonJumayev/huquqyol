import { SCENARIO_BY_ID, NORM_BY_ID } from "./kb.js";
import { addDays, addMonths, dayDiff, deadlineFrom, parseISO, startOfDay, termText, toISO, uzDate } from "./dates.js";

export const CB_RATE = Number(process.env.CB_RATE || 14);                    // MB asosiy stavkasi, 2026-yil 29-iyul
export const MIN_ALIMONY = Number(process.env.MIN_ALIMONY || 360_400);       // bir bola uchun, 2026-yil 1-sentabrdan
export const fmtSum = n => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
const fmtMoney = n => `${fmtSum(n)} so‘m`;
const num = v => Math.max(0, Number(v) || 0);

export function riskLevel(daysLeft, total){
  if (daysLeft < 0) return { level:"expired", label:"Muddat o‘tgan", tip:"Baribir murojaat qiling va uzrli sababni ko‘rsatib, muddatni tiklashni so‘rang." };
  if (daysLeft <= Math.max(3, total * 0.15)) return { level:"high", label:"Shoshiling", tip:"Bugundan harakat qiling: kerakli arizani darhol topshiring." };
  if (daysLeft <= Math.max(7, total * 0.4)) return { level:"medium", label:"Vaqt kam", tip:"Javob kutib, oxirgi muddatni o‘tkazib yubormang." };
  return { level:"low", label:"Vaqt yetarli", tip:"Avval tinch yo‘l bilan hal qilishga urinib ko‘rish mumkin." };
}

// MK 333-modda: har oy qarzi o‘z to‘lov kunidan hisoblanadi. low — yillik stavka ÷ 365; high — har kun uchun stavkaning 10%i.
export function compensation({ amount, months = 1, trigger, today = new Date(), rate = CB_RATE }){
  amount = num(amount);
  months = Math.max(1, Math.min(60, Math.round(Number(months) || 1)));
  const share = amount / months;
  let units = 0, maxDays = 0;
  for (let i = 0; i < months; i++){
    const d = dayDiff(addMonths(trigger, i), today);
    if (d > 0){ units += share * d; maxDays = Math.max(maxDays, d); }
  }
  return { rate, maxDelayDays: maxDays, low: Math.round(units * rate / 100 / 365), high: Math.round(units * rate / 100 * 0.10) };
}

const SHARES = [null, { f:1/4, text:"to‘rtdan bir qismi" }, { f:1/3, text:"uchdan bir qismi" }, { f:1/2, text:"yarmi" }];
export const alimonyShare = children => children > 0 ? SHARES[Math.min(3, children)] : null;

const CALCS = {
  labor333({ form, trigger, today }){
    if (!num(form.amount)) return { title:"Sizga qo‘shimcha to‘lanishi kerak", value:"Qarzni kiriting", note:"Kechiktirilgan har bir kun uchun kompensatsiya (MK 333-modda)." };
    const c = compensation({ amount: form.amount, months: form.months, trigger, today });
    return { title:"Sizga qo‘shimcha to‘lanishi kerak", value:`kamida ${fmtMoney(c.low)}`, raw:c,
      note:`Qarz ustiga, MK 333-modda bo‘yicha (MB stavkasi ${c.rate}%). Ayrim mutaxassislar talqinida ${fmtMoney(c.high)}gacha.` };
  },
  consumerPenalty({ form, today }){
    const price = num(form.price), demand = parseISO(form.demandDate);
    const title = "Sotuvchi to‘laydigan penya";
    if (!price) return { title, value:"Tovar narxini kiriting", note:"Talab muddatida bajarilmasa, har kun uchun narxning 1 foizi (14–15-moddalar)." };
    if (!demand) return { title, value:`kuniga ${fmtMoney(price * 0.01)}`, note:"Sotuvchiga talab qo‘ygan sanani kiritsangiz, jami penya hisoblanadi. Almashtirish muddati — 7 kun." };
    const due = addDays(demand, 7), late = dayDiff(due, today);
    if (late <= 0) return { title, value:"Hali penya yo‘q", note:`Sotuvchi ${uzDate(due)}gacha talabni bajarishi kerak (${Math.max(0, -late)} kun qoldi). Keyin har kun uchun ${fmtMoney(price * 0.01)}.` };
    return { title, value:fmtMoney(price * 0.01 * late), raw:{ late, due: toISO(due) },
      note:`Almashtirish muddati ${uzDate(due)}da tugagan: ${late} kun × narxning 1 foizi. Ta’mirlash talabi uchun muddat 20 kun bo‘lgani sababli summa kamroq bo‘lishi mumkin.` };
  },
  alimony({ form }){
    const children = Math.round(num(form.children)), income = num(form.income), sh = alimonyShare(children);
    const title = "Taxminiy aliment (oyiga)";
    if (!sh) return { title, value:"Bolalar sonini kiriting", note:"Bir bola — daromadning 1/4, ikki bola — 1/3, uch va undan ortiq — 1/2 qismi." };
    const min = MIN_ALIMONY * children, byIncome = income * sh.f, val = Math.max(min, byIncome);
    return { title, value:`≈ ${fmtMoney(val)}`, raw:{ share: sh.f, min, byIncome },
      note: (income ? `Daromadning ${sh.text}: ${fmtMoney(byIncome)}. ` : "Daromadni kiritsangiz, ulush hisoblanadi. ")
        + `Eng kam miqdor: bir bola uchun ${fmtMoney(MIN_ALIMONY)} (2026-yil 1-sentabrdan). Aniq summani sud belgilaydi.` };
  },
  fineDiscount({ form, trigger, today }){
    const fine = num(form.fine), d15 = addDays(trigger, 15), d30 = addDays(trigger, 30);
    const title = "Jarimani tez to‘lash chegirmasi";
    if (!fine) return { title, value:"Jarima summasini kiriting", note:"15 kun ichida — 50%, 30 kun ichida — 70% to‘lanadi (MJtK 332¹-modda). Shikoyat qilinsa, chegirma yo‘q." };
    const rows = [
      [`${uzDate(d15)}gacha (50%)`, fmtMoney(fine * 0.5)],
      [`${uzDate(d30)}gacha (70%)`, fmtMoney(fine * 0.7)],
      ["Shikoyat qilinsa yoki kechiksa", fmtMoney(fine)]
    ];
    const value = today <= d15 ? fmtMoney(fine * 0.5) : today <= d30 ? fmtMoney(fine * 0.7) : fmtMoney(fine);
    return { title, value, rows, note:"Shikoyat qilsangiz va yutqazsangiz, jarima to‘liq to‘lanadi. Qaror aniq noto‘g‘ri bo‘lsa, shikoyat qiling." };
  }
};

const whenText = (w, { trigger, deadline }) => w
  .replace("{deadline}", deadline ? uzDate(deadline) : "muddatsiz")
  .replace(/\{t\+(\d+)\}/g, (_, n) => uzDate(addDays(trigger, Number(n))));

export function buildPlan({ scenario, triggerDate, form = {}, today = new Date() }){
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
    deadline: deadline ? toISO(deadline) : null, deadlineText: deadline ? uzDate(deadline) : "",
    deadlineTerm: termText(s.deadline), deadlineLabel: s.deadline.label, deadlineNote: s.deadline.note || "",
    daysLeft, progress: deadline ? Math.min(1, Math.max(0, dayDiff(base, now) / total)) : 0,
    risk: deadline ? riskLevel(daysLeft, total) : { level:"info", label:"Muddat cheklanmagan", tip: s.deadline.note || "" },
    steps: s.steps.map(st => ({ ...st, when: whenText(st.when, { trigger, deadline }) })),
    norms: s.norms.map(id => NORM_BY_ID[id]),
    evidence: s.evidence,
    calc: s.calc ? CALCS[s.calc.type]({ form, trigger, today: now }) : null
  };
}
