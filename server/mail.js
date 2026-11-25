// E-pochta (SMTP): tasdiqlash, parolni tiklash, taklif, obuna eslatmasi. SMTP_URL bo‘lmasa — o‘chiq (mailEnabled() = false).
// SMTP_URL=smtps://user:parol@smtp.server.uz:465   MAIL_FROM="HuquqYo‘l <no-reply@domen.uz>"
import { toCyrillic } from "../public/translit.js";

const url = () => (process.env.SMTP_URL || "").trim();
export const mailEnabled = () => !!url() || !!testBox;
let transport = null, testBox = null;
export const useTestMail = box => { testBox = box; };                        // testlar: xatlar massivga yig‘iladi

const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const TEXT = {
  verify: { s: ["E-pochtangizni tasdiqlang", "Подтвердите эл. почту"], b: ["Hisobingizni himoya qilish uchun e-pochtangizni tasdiqlang. Havola 24 soat ishlaydi.", "Подтвердите почту, чтобы защитить аккаунт. Ссылка действует 24 часа."], a: ["Tasdiqlash", "Подтвердить"] },
  reset: { s: ["Parolni tiklash", "Восстановление пароля"], b: ["Yangi parol o‘rnatish uchun havolani bosing. U 1 soat ishlaydi va faqat bir marta. Siz so‘ramagan bo‘lsangiz, xatga e’tibor bermang.", "Перейдите по ссылке, чтобы задать новый пароль. Она действует 1 час и один раз. Если вы не запрашивали — просто не обращайте внимания."], a: ["Parolni tiklash", "Задать пароль"] },
  invite: { s: ["HuquqYo‘l jamoasiga taklif", "Приглашение в команду HuquqYo‘l"], b: ["«{org}» sizni jamoasiga taklif qildi. Havola 7 kun ishlaydi. Shu e-pochta bilan kiring yoki ro‘yxatdan o‘ting.", "«{org}» приглашает вас в команду. Ссылка действует 7 дней. Войдите или зарегистрируйтесь с этой почтой."], a: ["Taklifni ko‘rish", "Открыть приглашение"] },
  renew: { s: ["Obuna muddati tugayapti", "Подписка заканчивается"], b: ["Obunangiz {date} kuni tugaydi. Uzaytirsangiz, yangi muddat eskisining oxiriga qo‘shiladi.", "Подписка заканчивается {date}. При продлении новый срок прибавится к текущему."], a: ["Uzaytirish", "Продлить"] },
  paid: { s: ["To‘lov qabul qilindi", "Оплата получена"], b: ["{sum} so‘m to‘lovingiz qabul qilindi. Rahmat!", "Ваш платёж {sum} сум получен. Спасибо!"], a: ["Chekni ko‘rish", "Открыть чек"] }
};
export function renderMail(kind, lang, vars, link){
  const i = lang === "ru" ? 1 : 0, T = TEXT[kind], f = s => { const x = s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? "")); return lang === "cyr" ? toCyrillic(x) : x; };
  const subject = f(T.s[i]).replace(/[\r\n]+/g, " "), body = f(T.b[i]), action = f(T.a[i]);
  return { subject: `${subject} — HuquqYo‘l`, text: `${body}\n\n${action}: ${link}\n\nHuquqYo‘l`,
    html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#2A2420"><h1 style="font-size:20px">${esc(subject)}</h1><p style="line-height:1.5">${esc(body)}</p><p><a href="${esc(link)}" style="display:inline-block;background:#1E5B52;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none">${esc(action)}</a></p><p style="font-size:12px;color:#5C534B;word-break:break-all">${esc(link)}</p></div>` };
}
/** Xat yuborish. Xato foydalanuvchi oqimini to‘xtatmaydi; manzil va matn logga yozilmaydi. */
export async function sendMail(to, kind, { lang = "uz", vars = {}, link }){
  const m = renderMail(kind, lang, vars, link);
  if (testBox){ testBox.push({ to, kind, link, ...m }); return true; }
  if (!url()) return false;
  try {
    if (!transport){ const { default: nodemailer } = await import("nodemailer"); transport = nodemailer.createTransport(url(), { connectionTimeout: 10000, socketTimeout: 20000 }); }
    await transport.sendMail({ from: process.env.MAIL_FROM || "HuquqYo‘l <no-reply@localhost>", to, ...m });
    return true;
  } catch (e){ console.error("[mail]", kind, e.code || e.message); return false; }
}
/** Havola asosi: production’da faqat PUBLIC_HOST (soxta Host sarlavhasi bilan parol tiklash havolasini o‘g‘irlab bo‘lmaydi). */
export function siteUrl(req){
  const h = (process.env.PUBLIC_HOST || "").trim();
  if (h) return `https://${h}`;
  return process.env.NODE_ENV === "production" ? null : `${req.protocol}://${req.get("host")}`;
}
