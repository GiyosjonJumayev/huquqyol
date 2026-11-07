// HuquqYo‘l tarjimalari: o‘zbek (lotin), o‘zbek (kirill — lotindan avtomatik), rus.
// Brauzer ham, server ham shu faylni ishlatadi.
import { toCyrillic } from "./translit.js";

export const LANGS = ["uz", "cyr", "ru"];
export const LANG_NAMES = { uz:"O‘zbek", cyr:"Ўзбек", ru:"Русский" };
export const HTML_LANG = { uz:"uz", cyr:"uz-Cyrl", ru:"ru" };
export const normLang = l => l === "ru" ? "ru" : (l === "cyr" || l === "uz-Cyrl") ? "cyr" : "uz";

// Rus tili uchun ko‘plik: [1, 2–4, 5+]
export function plural(n, forms){
  n = Math.abs(n) % 100; const n1 = n % 10;
  return n > 10 && n < 20 ? forms[2] : n1 > 1 && n1 < 5 ? forms[1] : n1 === 1 ? forms[0] : forms[2];
}

const M = {
  metaDesc:{ uz:"HuquqYo‘l — huquqingiz buzilganda: qonun, qadamlar va tayyor ariza. Mehnat, iste’molchi, aliment, davlat idoralari, jarima, qarz.", ru:"HuquqYo‘l — если ваши права нарушены: закон, шаги и готовое заявление. Труд, защита потребителей, алименты, госорганы, штрафы, долги." },
  title:{ uz:"HuquqYo‘l — huquqiy yo‘l xaritasi", ru:"HuquqYo‘l — правовая дорожная карта" },
  skip:{ uz:"Asosiy qismga o‘tish", ru:"Перейти к основному содержанию" },
  homeLabel:{ uz:"HuquqYo‘l — boshiga qaytish", ru:"HuquqYo‘l — на главную" },
  langGroup:{ uz:"Til", ru:"Язык" },
  stepsNav:{ uz:"Bosqichlar", ru:"Этапы" },
  step1:{ uz:"Vaziyat", ru:"Ситуация" }, step2:{ uz:"Reja", ru:"План" }, step3:{ uz:"Ariza", ru:"Заявление" },
  hero:{ uz:"Huquqingiz buzildimi?", ru:"Ваши права нарушены?" },
  lead:{ uz:"Vaziyatni o‘z so‘zlaringiz bilan yozing. Qaysi qonun himoya qilishini va qayerga murojaat qilishni bilib olasiz, arizangizni ham shu yerda tayyorlaysiz.",
         ru:"Опишите ситуацию своими словами. Вы узнаете, какой закон вас защищает и куда обращаться, и здесь же подготовите заявление." },
  or:{ uz:"Yoki sohani tanlang", ru:"Или выберите сферу" },
  moreEx:{ uz:"Yana namunalar", ru:"Ещё примеры" },
  startCase:{ uz:"Boshlash →", ru:"Начать →" },
  problemLabel:{ uz:"Muammo tavsifi", ru:"Описание проблемы" },
  problemPh:{ uz:"Masalan: do‘kondan olgan muzlatkichim bir haftada buzildi, sotuvchi almashtirmayapti", ru:"Например: холодильник из магазина сломался через неделю, продавец не меняет" },
  analyze:{ uz:"Reja tuzish", ru:"Составить план" },
  analyzing:{ uz:"Tahlil qilinmoqda…", ru:"Анализируем…" },
  examplesLabel:{ uz:"Namunalar", ru:"Примеры" },
  privacy:{ uz:"Tahlil uchun faqat shu matn serverga yuboriladi va saqlanmaydi. Ariza ma’lumotlari faqat fayl yasash uchun ishlatiladi.", ru:"Для анализа на сервер отправляется только этот текст, и он не сохраняется. Данные заявления используются только для создания файла." },
  aiOn:{ uz:"AI tahlil: Claude", ru:"ИИ-анализ: Claude" }, aiOff:{ uz:"Qonunlar bazasi bo‘yicha tahlil", ru:"Анализ по базе законов" },
  backToPlan:{ uz:"← Rejaga qaytish", ru:"← К плану" },
  docReady:{ uz:"Arizani to‘ldiring", ru:"Заполните заявление" },
  docLead:{ uz:"Kimga yozishni tanlang va ma’lumotlaringizni kiriting. Hujjat siz yozgan sari yangilanadi.", ru:"Выберите адресата и заполните данные. Документ обновляется по мере ввода." },
  toWhom:{ uz:"Kimga yozasiz", ru:"Кому пишете" },
  paperLabel:{ uz:"Ariza ko‘rinishi", ru:"Предпросмотр заявления" },
  print:{ uz:"Chop etish", ru:"Печать" }, copy:{ uz:"Nusxalash", ru:"Копировать" },
  demoFill:{ uz:"Namuna bilan to‘ldirish", ru:"Заполнить примером" },
  demoFilled:{ uz:"Namuna ma’lumotlar qo‘yildi. Ularni o‘zingiznikiga almashtiring.", ru:"Подставлены примерные данные. Замените их своими." },
  howto:{ uz:"Qanday topshiriladi", ru:"Как подать" },
  howtoFor:{ uz:"Qanday topshiriladi: {label}", ru:"Как подать: {label}" },
  disclaimerB:{ uz:"Bu huquqiy maslahat emas.", ru:"Это не юридическая консультация." },
  disclaimer:{ uz:"Ilova ma’lumot beradi va hujjat loyihasini tayyorlaydi; muhim qaror oldidan yurist bilan maslahatlashing.", ru:"Сервис даёт информацию и готовит проект документа; перед важным решением посоветуйтесь с юристом." },
  sources:{ uz:"Manbalar: Mehnat, Oila, Fuqarolik va Ma’muriy javobgarlik kodekslari, Iste’molchilar va Murojaatlar to‘g‘risidagi qonunlar —", ru:"Источники: Трудовой, Семейный, Гражданский кодексы, Кодекс об административной ответственности, законы о защите прав потребителей и об обращениях —" },
  checked:{ uz:"2026-yil noyabr holatiga tekshirilgan.", ru:"Проверено по состоянию на ноябрь 2026 г." },
  local:{ uz:"Kiritgan ma’lumotlaringiz faqat shu qurilmada saqlanadi.", ru:"Введённые данные хранятся только на этом устройстве." },
  wipe:{ uz:"Ma’lumotlarimni o‘chirish", ru:"Удалить мои данные" },
  wiped:{ uz:"Ma’lumotlaringiz o‘chirildi", ru:"Ваши данные удалены" },
  cancel:{ uz:"Bekor qilish", ru:"Отмена" },
  del:{ uz:"O‘chirish", ru:"Удалить" },
  wipeT:{ uz:"Ma’lumotlaringiz o‘chirilsinmi?", ru:"Удалить ваши данные?" },
  wipeP:{ uz:"Kiritgan barcha ma’lumotlaringiz shu qurilmadan o‘chiriladi. Ularni qaytarib bo‘lmaydi.", ru:"Все введённые данные будут удалены с этого устройства. Восстановить их будет нельзя." },
  newT:{ uz:"Oldingi ish o‘chirilsinmi?", ru:"Удалить прошлое дело?" },
  newP:{ uz:"Reja va arizaga kiritgan ma’lumotlaringiz shu qurilmadan o‘chiriladi. Ularni qaytarib bo‘lmaydi.", ru:"Данные плана и заявления будут удалены с этого устройства. Восстановить их будет нельзя." },
  outGo:{ uz:"Sohalar ro‘yxatini ochish", ru:"Открыть список сфер" },
  formNote:{ uz:"* — hali to‘ldirilmagan joy. Yozganlaringiz avtomatik saqlanadi, faqat shu qurilmada.", ru:"* — ещё не заполнено. Введённое сохраняется автоматически и только на этом устройстве." },
  dlNote:{ uz:"{n} ta joy bo‘sh. Yuklab olsangiz, ularni hujjatda qo‘lda to‘ldirasiz.", ru:"Незаполненных мест: {n}. Если скачать сейчас, их придётся заполнить в документе вручную." },
  errNet:{ uz:"Internet aloqasi yo‘q yoki server ishlamayapti.", ru:"Нет подключения к интернету или сервер недоступен." },
  errServer:{ uz:"Server javob bermadi. Qayta urinib ko‘ring.", ru:"Сервер не ответил. Попробуйте ещё раз." },
  serverDown:{ uz:"Server bilan bog‘lanib bo‘lmadi: {msg}", ru:"Не удалось связаться с сервером: {msg}" },
  casesCount:{ uz:"{n} ta holat →", ru:["{n} ситуация →", "{n} ситуации →", "{n} ситуаций →"] },
  allDomains:{ uz:"← Barcha sohalar", ru:"← Все сферы" },
  resumeText:{ uz:"Oldingi ishingiz:", ru:"Ваше прошлое дело:" },
  resumeGo:{ uz:"Davom etish", ru:"Продолжить" }, resumeNew:{ uz:"Yangidan boshlash", ru:"Начать заново" },
  tooShort:{ uz:"Vaziyatni bir-ikki gap bilan yozing: kim, nima qildi, qachondan beri.", ru:"Опишите ситуацию в 1–2 предложениях: кто, что сделал и с какого времени." },
  back:{ uz:"← Orqaga", ru:"← Назад" },
  outTag:{ uz:"Doiradan tashqarida", ru:"Вне охвата" },
  outTitle:{ uz:"Bu holatni hozircha qamramaymiz", ru:"Эту ситуацию мы пока не охватываем" },
  outText:{ uz:"HuquqYo‘l hozir {n} ta sohada yordam beradi: {list}. {summary}Ro‘yxatdan sohani tanlab ko‘ring yoki bepul yuridik yordam markazi va advokatga murojaat qiling.",
            ru:"Сейчас HuquqYo‘l помогает в {n} сферах: {list}. {summary}Выберите сферу из списка или обратитесь в центр бесплатной юридической помощи либо к адвокату." },
  otherSituation:{ uz:"← Boshqa vaziyat", ru:"← Другая ситуация" },
  srcAI:{ uz:"Claude tahlili", ru:"Анализ Claude" }, srcRules:{ uz:"Avtomatik tahlil", ru:"Автоматический анализ" }, srcChoice:{ uz:"Siz tanladingiz", ru:"Выбрано вами" },
  needForDoc:{ uz:"Arizaga kerak bo‘ladi:", ru:"Для заявления понадобится:" },
  mainRight:{ uz:"Sizning asosiy huquqingiz", ru:"Ваше основное право" },
  whatToDo:{ uz:"Nima qilish kerak", ru:"Что делать" },
  lawSays:{ uz:"Qonun nima deydi", ru:"Что говорит закон" },
  moreNorms:{ uz:"Yana {n} ta norma", ru:"Ещё норм: {n}" },
  forYou:{ uz:"siz uchun", ru:"для вас" },
  lawOnly:{ uz:"Qonun", ru:"Закон" },
  evidenceH:{ uz:"Dalillarni to‘plang", ru:"Соберите доказательства" },
  evidenceHint:{ uz:"Belgilaganlaringiz arizaning «Ilovalar» ro‘yxatiga qo‘shiladi.", ru:"Отмеченное попадёт в раздел «Приложения» заявления." },
  evCount:{ uz:"· {a} / {b} bor", ru:"· есть {a} из {b}" },
  makeDoc:{ uz:"Ariza tayyorlash →", ru:"Подготовить заявление →" },
  nextHint:{ uz:"Keyingi qadam: arizani to‘ldirib, yuklab oling", ru:"Следующий шаг: заполните и скачайте заявление" },
  dateHint:{ uz:"Muddat shu sanadan hisoblanadi. To‘g‘ri ekanini tekshiring.", ru:"Срок считается от этой даты. Проверьте, что она верна." },
  eg:{ uz:"Masalan:", ru:"Например:" },
  unlimited:{ uz:"Muddatsiz", ru:"Без срока" },
  days:{ uz:"kun", ru:["день", "дня", "дней"] },
  daysLate:{ uz:"kun kechikdi", ru:["день просрочки", "дня просрочки", "дней просрочки"] },
  lastDay:{ uz:"Oxirgi kun:", ru:"Последний день:" },
  termSuffix:{ uz:"{term} muddat", ru:"срок: {term}" },
  progressLabel:{ uz:"O‘tgan muddat", ru:"Прошедший срок" },
  choose:{ uz:"— tanlang —", ru:"— выберите —" },
  aboutYou:{ uz:"Siz haqingizda", ru:"О вас" },
  groupDefault:{ uz:"Ma’lumotlar", ru:"Данные" },
  extraSummary:{ uz:"Qo‘shimcha holatlar", ru:"Дополнительные обстоятельства" },
  extraLabel:{ uz:"Ariza matniga qo‘shiladi", ru:"Будет добавлено в текст заявления" },
  allFilled:{ uz:"✓ Ariza tayyor: barcha joylar to‘ldirilgan", ru:"✓ Заявление готово: все поля заполнены" },
  missingN:{ uz:"{n} ta joy to‘ldirilmagan: {list} — to‘ldirish", ru:"Не заполнено ({n}): {list} — заполнить" },
  errPhone:{ uz:"Faqat raqam, +, bo‘sh joy va qavs. Masalan: +998 90 123 45 67", ru:"Только цифры, +, пробелы и скобки. Например: +998 90 123 45 67" },
  errDigits:{ uz:"Faqat raqam kiriting.", ru:"Введите только цифры." },
  errRange:{ uz:"{min} dan {max} gacha son kiriting.", ru:"Введите число от {min} до {max}." },
  errFuture:{ uz:"Sana kelajakda bo‘lishi mumkin emas.", ru:"Дата не может быть в будущем." },
  fixRed:{ uz:"Xato kiritilgan maydonni tuzating", ru:"Исправьте поле с ошибкой" },
  dlDone:{ uz:"{fmt} yuklab olindi", ru:"{fmt} загружен" },
  dlDoneMissing:{ uz:"{fmt} yuklandi. {n} ta joyni qo‘lda to‘ldiring.", ru:"{fmt} загружен. Заполните вручную полей: {n}." },
  copied:{ uz:"Matn nusxalandi", ru:"Текст скопирован" },
  selected:{ uz:"Matn belgilandi: Ctrl+C bosing", ru:"Текст выделен: нажмите Ctrl+C" },
  offline:{ uz:"Internet uzildi. Ma’lumotlaringiz saqlanadi, aloqa tiklanganda davom eting.", ru:"Нет интернета. Данные сохранены — продолжите, когда связь восстановится." },
  online:{ uz:"Aloqa tiklandi", ru:"Связь восстановлена" },
  howLabel:{ uz:"Qanday ishlaydi", ru:"Как это работает" },
  how1:{ uz:"Vaziyatni yozing yoki sohani tanlang", ru:"Опишите ситуацию или выберите сферу" },
  how2:{ uz:"Qonun, muddat va qadamlarni bilib oling", ru:"Узнайте закон, срок и шаги" },
  how3:{ uz:"Tayyor arizani yuklab oling: Word, PDF", ru:"Скачайте готовое заявление: Word, PDF" },
  askHint:{ uz:"Ctrl+Enter — reja tuzish", ru:"Ctrl+Enter — составить план" },
  charCount:{ uz:"{n} / 4000 belgi", ru:"{n} / 4000 символов" },
  voice:{ uz:"Ovoz bilan yozish", ru:"Ввести голосом" },
  voiceOn:{ uz:"Gapiring… To‘xtatish uchun yana bosing", ru:"Говорите… Нажмите ещё раз, чтобы остановить" },
  voiceErr:{ uz:"Ovozni tanib bo‘lmadi. Mikrofonga ruxsat berilganini tekshiring.", ru:"Не удалось распознать речь. Проверьте доступ к микрофону." },
  altTitle:{ uz:"Boshqa holat bo‘lishi mumkin:", ru:"Возможно, у вас другая ситуация:" },
  printPlan:{ uz:"Rejani chop etish", ru:"Распечатать план" },
  calendar:{ uz:"Kalendarga eslatma", ru:"Напоминание в календарь" },
  calTitle:{ uz:"Oxirgi kun: {title}", ru:"Последний день: {title}" },
  calSoon:{ uz:"3 kun qoldi: {title}", ru:"Осталось 3 дня: {title}" },
  calDone:{ uz:"Eslatma fayli yuklandi — uni kalendaringizda oching", ru:"Файл напоминания загружен — откройте его в календаре" },
  printedAt:{ uz:"HuquqYo‘l rejasi · {date}", ru:"План HuquqYo‘l · {date}" },
  notFoundPage:{ uz:"Sahifa topilmadi", ru:"Страница не найдена" },
  toHome:{ uz:"Bosh sahifaga", ru:"На главную" },
  docLang:{ uz:"Ariza tili: o‘zbekcha", ru:"Язык заявления: русский" },
  docLangNote:{ uz:"", ru:"Обращения можно подавать на государственном или другом языке. В суде делопроизводство ведётся на узбекском языке; при необходимости суд обеспечивает переводчика." }
};

const fill = (s, vars) => s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");

// t("key", {n:3}) — joriy til uchun matn. cyr = o‘zbek lotin matnining kirill shakli.
export function makeT(lang){
  lang = normLang(lang);
  return (key, vars = {}) => {
    const m = M[key]; if (!m) return key;
    let s = m[lang === "ru" ? "ru" : "uz"];
    if (Array.isArray(s)) s = plural(Number(vars.n) || 0, s);
    s = fill(s, vars);
    return lang === "cyr" ? toCyrillic(s) : s;
  };
}

// ---- Sana, pul, muddat ----
const MONTHS_UZ = ["yanvar","fevral","mart","aprel","may","iyun","iyul","avgust","sentabr","oktabr","noyabr","dekabr"];
const MONTHS_RU = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];
export function fmtDate(d, lang = "uz"){
  if (!d) return "";
  if (normLang(lang) === "ru") return `${d.getDate()} ${MONTHS_RU[d.getMonth()]} ${d.getFullYear()} г.`;
  const s = `${d.getDate()}-${MONTHS_UZ[d.getMonth()]} ${d.getFullYear()}-yil`;
  return normLang(lang) === "cyr" ? toCyrillic(s) : s;
}
export const fmtSum = n => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
export const fmtMoney = (n, lang = "uz") => `${fmtSum(n)} ${normLang(lang) === "ru" ? "сум" : normLang(lang) === "cyr" ? "сўм" : "so‘m"}`;
export function termText(spec, lang = "uz"){
  if (!spec || spec.none) return "";
  const [n, kind] = spec.years ? [spec.years, "y"] : spec.months ? [spec.months, "m"] : [spec.days, "d"];
  if (normLang(lang) === "ru") return `${n} ${plural(n, { y:["год","года","лет"], m:["месяц","месяца","месяцев"], d:["день","дня","дней"] }[kind])}`;
  const s = `${n} ${{ y:"yil", m:"oy", d:"kun" }[kind]}`;
  return normLang(lang) === "cyr" ? toCyrillic(s) : s;
}
