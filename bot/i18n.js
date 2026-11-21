// Bot matnlari: uz (lotin) va ru. Kirill (cyr) — o‘zbek lotin matnidan avtomatik (sayt bilan bir xil).
// Umumiy matnlar (calTitle, calSoon, sana va pul formati) saytning public/i18n.js faylidan olinadi.
import { toCyrillic } from "../public/translit.js";

const M = {
  start:{
    uz:"Assalomu alaykum! Men <b>HuquqYo‘l</b> botiman.\nMuammoingizni oddiy so‘z bilan yozing — qaysi qonun himoya qilishini, muddatni va qadamlarni aytaman, tayyor arizani PDF va Word shaklida beraman.",
    ru:"Здравствуйте! Я бот <b>HuquqYo‘l</b>.\nОпишите проблему своими словами — я скажу, какой закон вас защищает, какой срок и что делать, и подготовлю заявление в PDF и Word." },
  privacy:{
    uz:"🔒 Matningiz saqlanmaydi. Bot faqat 1 soat davomida joriy holatni eslab turadi; /delete — darhol o‘chirish. (Chat tarixi Telegram’ning o‘zida qoladi.)",
    ru:"🔒 Ваш текст не сохраняется. Бот помнит текущую ситуацию только 1 час; /delete — удалить сразу. (История чата остаётся в самом Telegram.)" },
  privacyAiG:{
    uz:"AI tahlili uchun matn Google (Gemini) ga uzatiladi.",
    ru:"Для AI-анализа текст передаётся в Google (Gemini)." },
  privacyAi:{
    uz:"AI tahlili uchun matn Anthropic (Claude) ga uzatiladi.",
    ru:"Для AI-анализа текст передаётся в Anthropic (Claude)." },
  chooseLang:{ uz:"Tilni tanlang:", ru:"Выберите язык:" },
  langSet:{ uz:"Til: O‘zbek (lotin). Endi muammoingizni yozing.", ru:"Язык: русский. Теперь опишите вашу проблему." },
  langSetCyr:{ uz:"Til: O‘zbek (kirill). Endi muammoingizni yozing.", ru:"Til: O‘zbek (kirill)." },
  help:{
    uz:"Muammoingizni bir-ikki gap bilan yozing, masalan: <i>«Ish beruvchi 3 oydan beri 9 mln so‘m maosh bermayapti»</i>.\n\n/start — boshlash\n/lang — tilni almashtirish\n/sana — muddat hisoblanadigan sanani kiritish (masalan 22.08.2026)\n/delete — bot xotirasidagi ma’lumotlarni o‘chirish\n/help — yordam",
    ru:"Опишите проблему в одном-двух предложениях, например: <i>«Работодатель 3 месяца не платит зарплату, долг 9 млн сум»</i>.\n\n/start — начать\n/lang — сменить язык\n/sana — указать дату, от которой считается срок (например 22.08.2026)\n/delete — удалить данные из памяти бота\n/help — помощь" },
  deleted:{ uz:"Ma’lumotlaringiz bot xotirasidan o‘chirildi.", ru:"Ваши данные удалены из памяти бота." },
  rate:{ uz:"Juda ko‘p xabar. Bir daqiqadan keyin qayta yozing.", ru:"Слишком много сообщений. Напишите через минуту." },
  expired:{ uz:"Avvalgi holat eskirgan yoki o‘chirilgan. Muammoingizni qayta yozing.", ru:"Предыдущая ситуация устарела или удалена. Опишите проблему заново." },
  error:{ uz:"Xatolik yuz berdi. Birozdan keyin qayta urinib ko‘ring.", ru:"Произошла ошибка. Попробуйте ещё раз чуть позже." },
  thinking:{ uz:"Tahlil qilyapman…", ru:"Анализирую…" },

  situation:{ uz:"Holat", ru:"Ситуация" },
  fromText:{ uz:"Matndan", ru:"Из текста" },
  debt:{ uz:"summa", ru:"сумма" },
  months:{ uz:"{n} oy", ru:"{n} мес." },
  daysLeft:{ uz:"Muddat: {n} kun qoldi", ru:"Срок: осталось {n} дн." },
  lastDay:{ uz:"oxirgi kun — {date}", ru:"последний день — {date}" },
  expiredDays:{ uz:"Muddat o‘tgan ({n} kun oldin)", ru:"Срок истёк ({n} дн. назад)" },
  noDeadline:{ uz:"Qat’iy muddat yo‘q", ru:"Жёсткого срока нет" },
  counted:{ uz:"{label}: {date}. O‘zgartirish: /sana", ru:"{label}: {date}. Изменить: /sana" },
  estimated:{ uz:"⚠️ Muddat taxminiy: sana kiritilmagan. Hisob {date} dan olindi. To‘g‘ri hisob uchun «{label}» ni kiriting.", ru:"⚠️ Срок примерный: дата не указана. Расчёт от {date}. Для точного расчёта укажите: «{label}»." },
  bDate:{ uz:"📅 Sanani kiritish", ru:"📅 Указать дату" },
  askDate:{ uz:"«{label}» ni yozing, masalan: 22.08.2026", ru:"Напишите: «{label}», например: 22.08.2026" },
  badDate:{ uz:"Sanani tushunmadim. Shunday yozing: 22.08.2026 (yoki 2026-08-22).", ru:"Не понял дату. Напишите так: 22.08.2026 (или 2026-08-22)." },
  shortReply:{ uz:"Yangi holat bo‘lsa, uni bir-ikki gap bilan yozing. Joriy holat:", ru:"Если это новая ситуация, опишите её в одном-двух предложениях. Текущая ситуация:" },
  clarify:{ uz:"Aniqlashtiring: qaysi biri sizning holatingizga mos?", ru:"Уточните: какая ситуация ваша?" },
  bOther:{ uz:"Boshqa", ru:"Другое" },
  calEstimated:{ uz:"Diqqat: sana kiritilmagan, muddat taxminiy.", ru:"Внимание: дата не указана, срок примерный." },
  disclaimer:{ uz:"Bu yo‘l xaritasi, yuridik maslahat emas.", ru:"Это дорожная карта, а не юридическая консультация." },
  alts:{ uz:"Boshqa holat bo‘lishi mumkin:", ru:"Возможно, другая ситуация:" },

  bPlan:{ uz:"📋 Reja", ru:"📋 План" },
  bDoc:{ uz:"📝 Ariza", ru:"📝 Заявление" },
  bCal:{ uz:"📅 Kalendar", ru:"📅 Календарь" },
  bCalLong:{ uz:"📅 Kalendarga eslatma", ru:"📅 Напоминание в календарь" },
  bDocLong:{ uz:"📝 Ariza tayyorlash", ru:"📝 Подготовить заявление" },

  planTitle:{ uz:"Reja", ru:"План" },
  deadlineLine:{ uz:"{label}: {n} kun", ru:"{label}: {n} дн." },
  laws:{ uz:"Qonun", ru:"Закон" },
  office:{ uz:"Qayerga murojaat qilish", ru:"Куда обращаться" },

  pickRecipient:{ uz:"Ariza kimga?", ru:"Кому заявление?" },
  askFio:{ uz:"F.I.Sh.ingizni yozing (yoki /skip — keyin qo‘lda yozasiz).", ru:"Напишите ваше ФИО (или /skip — впишете от руки)." },
  making:{ uz:"Hujjat tayyorlanyapti…", ru:"Готовлю документ…" },
  signSubmit:{ uz:"Imzolab topshiring.", ru:"Подпишите и подайте." },
  blanks:{ uz:"To‘ldirilmagan joylar [ ] bilan belgilangan ({n} ta): ularni qo‘lda yozing yoki saytda to‘ldiring.", ru:"Незаполненные места отмечены [ ] ({n}): впишите их от руки или заполните на сайте." },
  howCourt:{ uz:"Sudga: my.sud.uz orqali elektron yoki sud devonxonasiga.", ru:"В суд: электронно через my.sud.uz или в канцелярию суда." },
  howState:{ uz:"Idoraga: murojaat.gov.uz orqali, shaxsan yoki pochta bilan; ikkinchi nusxaga kiruvchi raqam qo‘ydiring.", ru:"В госорган: через murojaat.gov.uz, лично или по почте; на втором экземпляре попросите входящий номер." },
  howPrivate:{ uz:"Ikki nusxada topshiring: ikkinchisiga qabul qilgan shaxs imzosi va sanani qo‘ydiring yoki buyurtma xat bilan yuboring.", ru:"Подайте в двух экземплярах: на втором попросите подпись принявшего и дату, либо отправьте заказным письмом." },

  calNone:{ uz:"Bu holatda qat’iy muddat yo‘q — kalendarga qo‘yadigan sana yo‘q.", ru:"В этой ситуации нет жёсткого срока — нечего добавить в календарь." },
  calCaption:{ uz:"Faylni oching — telefon kalendariga oxirgi kun va 3 kun oldingi eslatma qo‘shiladi.", ru:"Откройте файл — в календарь добавится последний день и напоминание за 3 дня." },

  dateSet:{ uz:"Sana o‘zgartirildi.", ru:"Дата изменена." },

  other:{ uz:"Bu holat hozircha bot bazasida yo‘q.", ru:"Этой ситуации пока нет в базе бота." },
  otherWhere:{ uz:"Davlat idorasiga murojaat: murojaat.gov.uz\nTayyor hujjat shablonlari: yurxizmat.uz (Adliya vazirligi «Adolat» markazi)\n\nYoki sohani tanlang:", ru:"Обращение в госорган: murojaat.gov.uz\nГотовые шаблоны документов: yurxizmat.uz (центр «Адолат» Министерства юстиции)\n\nИли выберите сферу:" },
  pickScenario:{ uz:"Holatni tanlang:", ru:"Выберите ситуацию:" }
};

// Kirillga o‘girishda buyruqlar (/sana), HTML teglar va sana namunasi o‘zgarmaydi
const KEEP = /(\/[a-z_]+\b|<\/?[a-z]+(?:\s[^>]*)?>|YYYY-MM-DD)/;
export const cyr = s => String(s).split(KEEP).map((p, i) => i % 2 ? p : toCyrillic(p)).join("");

export function botT(lang){
  const l = lang === "ru" ? "ru" : "uz";
  return (key, vars = {}) => {
    const m = M[key]; if (!m) return key;
    const s = m[l].replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "").replace(/г\.\./g, "г.");   // «2026 г.» + «.»
    return lang === "cyr" ? cyr(s) : s;
  };
}
export const BOT_STRINGS = M;
