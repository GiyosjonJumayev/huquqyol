// Server tomonidagi til: so‘rov tilini aniqlash, server xabarlari va kirill yozuviga o‘girish.
// Tillar: uz (lotin), cyr (o‘zbek kirill — lotindan avtomatik), ru (rus).
import { toCyrillic } from "../public/translit.js";
import { LANGS } from "../public/i18n.js";

export const LANG_COOKIE = "hy_lang";
// Eski mijozlar "lat" yuboradi
export const parseLang = v => v === "lat" ? "uz" : LANGS.includes(v) ? v : null;

function fromCookie(header){
  const m = /(?:^|;\s*)hy_lang=([a-z]{2,3})/.exec(header || "");
  return m ? parseLang(m[1]) : null;
}
function fromAccept(header){
  for (const part of String(header || "").toLowerCase().split(",")){
    const tag = part.trim().split(";")[0];
    if (tag.startsWith("ru")) return "ru";
    if (tag === "uz-cyrl" || tag.startsWith("uz-cyrl")) return "cyr";
    if (tag.startsWith("uz")) return "uz";
  }
  return null;
}
// Ustuvorlik: so‘rov tanasi → ?lang= → cookie → brauzer tili → o‘zbek
export const resolveLang = req =>
  parseLang(req.body?.lang) || parseLang(req.query?.lang) || fromCookie(req.headers.cookie) || fromAccept(req.headers["accept-language"]) || "uz";

const M = {
  scenario:{ uz:"Bunday vaziyat topilmadi. Bosh sahifadan qaytadan tanlang.", ru:"Такой ситуации нет. Выберите её заново на главной." },
  date:{ uz:"{label}: sanani to‘liq kiriting — kun, oy va yil.", ru:"{label}: укажите полную дату — день, месяц и год." },
  future:{ uz:"{label}: bu kun hali kelmagan. Sanani tekshiring.", ru:"{label}: этот день ещё не наступил. Проверьте дату." },
  old:{ uz:"{label}: sana juda uzoq o‘tmishda. Tekshirib ko‘ring.", ru:"{label}: слишком давняя дата. Проверьте её." },
  num:{ uz:"{label}: faqat raqam yozing.", ru:"{label}: введите только число." },
  option:{ uz:"{label}: ro‘yxatdan birini tanlang.", ru:"{label}: выберите вариант из списка." },
  phone:{ uz:"Telefon raqamini tekshiring. Masalan: +998 90 123 45 67", ru:"Проверьте номер телефона. Например: +998 90 123 45 67" },
  email:{ uz:"E-pochta manzilini tekshiring. Masalan: ism@mail.uz", ru:"Проверьте адрес эл. почты. Например: name@mail.uz" },
  weakPassword:{ uz:"Parol kamida 8 belgi bo‘lsin va harf hamda raqamdan iborat bo‘lsin.", ru:"Пароль — не менее 8 символов, буквы и цифры." },
  emailTaken:{ uz:"Bu e-pochta bilan hisob allaqachon bor. Kirish sahifasidan foydalaning.", ru:"Аккаунт с этой почтой уже существует. Воспользуйтесь входом." },
  badLogin:{ uz:"E-pochta yoki parol noto‘g‘ri.", ru:"Неверная почта или пароль." },
  locked:{ uz:"Ko‘p marta noto‘g‘ri parol kiritildi. 15 daqiqadan keyin qayta urinib ko‘ring.", ru:"Слишком много неверных попыток. Попробуйте через 15 минут." },
  terms:{ uz:"Foydalanish shartlariga roziligingizni belgilang.", ru:"Отметьте согласие с условиями использования." },
  inn:{ uz:"STIR 9 ta raqamdan iborat bo‘lishi kerak.", ru:"ИНН должен состоять из 9 цифр." },
  auth:{ uz:"Avval hisobingizga kiring.", ru:"Сначала войдите в аккаунт." },
  forbidden:{ uz:"Sizning hisobingiz bu amalni bajara olmaydi.", ru:"Ваш аккаунт не может выполнить это действие." },
  dbOff:{ uz:"Hisobga kirish hozircha ishlamayapti. Reja va arizani hisobsiz ham tayyorlashingiz mumkin.", ru:"Вход в аккаунт сейчас недоступен. План и заявление можно подготовить и без аккаунта." },
  message:{ uz:"Vaziyatni kamida bir gap bilan yozing.", ru:"Опишите ситуацию хотя бы одним предложением." },
  lawyerNotFound:{ uz:"Yurist topilmadi yoki hali tasdiqlanmagan.", ru:"Юрист не найден или ещё не подтверждён." },
  ownProfile:{ uz:"O‘zingizga so‘rov yubora olmaysiz.", ru:"Нельзя отправить запрос самому себе." },
  badState:{ uz:"Holat o‘zgargan. Sahifani yangilab, qayta urinib ko‘ring.", ru:"Статус изменился. Обновите страницу и попробуйте снова." },
  needPro:{ uz:"Bu imkoniyat Yurist Pro obunachilari uchun. «Tariflar» sahifasida obuna bo‘ling.", ru:"Эта возможность для подписчиков «Юрист Pro». Оформите подписку на странице «Тарифы»." },
  profileFirst:{ uz:"Avval profilni saqlang.", ru:"Сначала сохраните профиль." },
  photoType:{ uz:"Rasm JPEG, PNG yoki WEBP formatida bo‘lsin.", ru:"Фото должно быть в формате JPEG, PNG или WEBP." },
  photoSize:{ uz:"Rasm hajmi juda katta yoki fayl buzilgan.", ru:"Фото слишком большое или файл повреждён." },
  telegram:{ uz:"Telegram username 5–32 ta lotin harfi, raqam yoki _ dan iborat bo‘lsin.", ru:"Telegram username: 5–32 латинских букв, цифр или _." },
  website:{ uz:"Veb-sayt manzili https:// bilan boshlansin.", ru:"Адрес сайта должен начинаться с https://." },
  ownRole:{ uz:"O‘zingizni admin rolidan chiqara olmaysiz.", ru:"Нельзя снять с себя роль администратора." },
  required:{ uz:"«{label}» ni to‘ldiring.", ru:"Заполните поле «{label}»." },
  consent:{ uz:"Ma’lumotlaringizni katalog uchun ko‘rib chiqishga roziligingizni belgilang.", ru:"Отметьте согласие на рассмотрение данных для каталога." },
  docText:{ uz:"Hujjat matnini yozing.", ru:"Введите текст документа." },
  short:{ uz:"Vaziyatni bir-ikki gap bilan yozing.", ru:"Опишите ситуацию в одном-двух предложениях." },
  long:{ uz:"Matn juda uzun. 4000 belgigacha qisqartiring.", ru:"Текст слишком длинный. Сократите до 4000 символов." },
  dateLabel:{ uz:"Sana", ru:"Дата" },
  json415:{ uz:"So‘rov JSON formatida bo‘lishi kerak.", ru:"Запрос должен быть в формате JSON." },
  rate:{ uz:"Biroz shoshildingiz. Bir daqiqadan keyin qayta urinib ko‘ring.", ru:"Слишком быстро. Попробуйте ещё раз через минуту." },
  tooLarge:{ uz:"So‘rov juda katta.", ru:"Запрос слишком большой." },
  badJson:{ uz:"JSON noto‘g‘ri.", ru:"Неверный JSON." },
  notFound:{ uz:"Bu narsa topilmadi.", ru:"Ничего не найдено." },
  format:{ uz:"Format: docx yoki pdf.", ru:"Формат: docx или pdf." },
  server:{ uz:"Nimadir ishlamadi. Bir ozdan keyin qayta urinib ko‘ring.", ru:"Что-то пошло не так. Попробуйте ещё раз чуть позже." },
  origin:{ uz:"So‘rov boshqa saytdan yuborilgan.", ru:"Запрос отправлен с другого сайта." },
  photoFormat:{ uz:"Rasm JPG, PNG yoki WEBP formatida bo‘lishi kerak.", ru:"Фото должно быть в формате JPG, PNG или WEBP." },
  photoBig:{ uz:"Rasm juda katta. Kichikroq rasm yuboring.", ru:"Фото слишком большое. Отправьте фото поменьше." },
  pdfLong:{ uz:"PDF matni juda uzun. Hujjatning faqat kerakli sahifasini yuklang.", ru:"Текст PDF слишком длинный. Загрузите только нужную страницу документа." },
  photoNoOcr:{ uz:"Rasmdan o‘qish bu serverda o‘chirilgan. Vaziyatni matn bilan yozing.", ru:"Чтение фото на этом сервере отключено. Опишите ситуацию текстом." },
  photoBusy:{ uz:"Hozir ko‘p rasm o‘qilmoqda. Bir necha soniyadan keyin qayta urinib ko‘ring.", ru:"Сейчас читается много фото. Попробуйте через несколько секунд." },
  photoSlow:{ uz:"Rasmni o‘qish juda uzoq davom etdi. Kichikroq yoki aniqroq rasm bilan qayta urinib ko‘ring.", ru:"Чтение фото заняло слишком много времени. Попробуйте фото поменьше или чётче." },
  photoUnread:{ uz:"Rasmda hujjatni o‘qib bo‘lmadi. Hujjatni yorug‘ joyda, to‘liq va tekis suratga oling.", ru:"Не удалось прочитать документ на фото. Сфотографируйте его целиком, ровно и при хорошем свете." }
};
export function msg(lang, key, vars = {}){
  const m = M[key]; if (!m) return key;
  const s = m[lang === "ru" ? "ru" : "uz"].replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
  return lang === "cyr" ? toCyrillic(s) : s;
}

// Javobdagi barcha matnlarni kirillga o‘girish. Identifikator, URL va texnik kalitlar o‘zgarmaydi.
const KEEP = new Set(["id","k","v","type","domain","law","scenario","recipient","level","calc","url","lawUrl","lex","source","model",
  "partyField","amountField","fallbackReason","lang","fmt","docType","analysisSource","from","field","kind","for"]);
const SKIP_TREE = new Set(["retrieval", "keywords", "raw", "form", "photo"]);   // photo — hujjatdan o‘qilgan asl matn
export function deepCyr(x, key){
  if (typeof x === "string") return KEEP.has(key) ? x : toCyrillic(x);
  if (Array.isArray(x)) return x.map(v => deepCyr(v, key));
  if (x && typeof x === "object"){
    const r = {};
    for (const [k, v] of Object.entries(x)) r[k] = SKIP_TREE.has(k) ? v : deepCyr(v, k);
    return r;
  }
  return x;
}
