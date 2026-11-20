// Brauzer va server uchun umumiy interfeys bo‘laklari: server bosh sahifani shular bilan oldindan chizadi,
// shuning uchun sahifa ochilganda kontent «sakramaydi».
import { toCyrillic } from "./translit.js";
export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
const SVG = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
export const ICONS = {
  mehnat: SVG('<rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><path d="M3 12h18"/>'),
  istemol: SVG('<path d="M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>'),
  oila: SVG('<circle cx="8" cy="7" r="2.5"/><circle cx="16" cy="7" r="2.5"/><circle cx="12" cy="13" r="2"/><path d="M3.5 20c0-3 2-5 4.5-5M20.5 20c0-3-2-5-4.5-5M9 21c0-2 1.3-3.5 3-3.5s3 1.5 3 3.5"/>'),
  davlat: SVG('<path d="M3 9l9-5 9 5"/><path d="M5 9v9M9.5 9v9M14.5 9v9M19 9v9"/><path d="M3 21h18"/>'),
  jarima: SVG('<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6M9 16h3"/>'),
  ijara: SVG('<path d="M3 11l9-7 9 7"/><path d="M5 9.5V20h14V9.5"/><circle cx="12" cy="13.5" r="2"/><path d="M12 15.5V18"/>'),
  kommunal: SVG('<path d="M13 3L5 13.5h6L10 21l8-10.5h-6z"/>'),
  bank: SVG('<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M3 10h18"/><path d="M7 14.5h4"/>'),
  transport: SVG('<path d="M5 16.5V12l2-5h10l2 5v4.5"/><path d="M3.5 12h17"/><path d="M4 16.5h16"/><circle cx="8" cy="16.5" r="1.8"/><circle cx="16" cy="16.5" r="1.8"/>'),
  nafaqa: SVG('<path d="M3 12a9 9 0 0 1 18 0z"/><path d="M12 12v6.5a2 2 0 0 0 4 0"/>'),
  migrant: SVG('<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9s1.3-6.4 3.8-9z"/>'),
  fuqarolik: SVG('<circle cx="9" cy="9" r="5"/><path d="M9 7v4M7.5 9h3"/><path d="M14.5 4.6A5 5 0 1 1 13 19"/><path d="M3 21h8"/>')
};
const EX = {
  uz: [
    "Ish beruvchim 3 oydan beri maosh bermayapti, qarzi 9 million so‘m",
    "«Texnomart» do‘konidan olgan televizor 2 haftada buzildi, almashtirmayapti",
    "Hokimlikka ko‘chadagi chiroqlar haqida taklif bermoqchiman",
    "Sobiq erim 2 ta bolamga aliment to‘lamayapti",
    "Hokimlikka murojaat qildim, bir oydan beri javob yo‘q",
    "YHXB radar bo‘yicha noto‘g‘ri jarima soldi",
    "Do‘stimga qarzga bergan 20 million so‘mni qaytarmayapti, tilxat bor",
    "Kvartiradan chiqdim, uy egasi depozitni qaytarmayapti",
    "Kartamdan bilmagan holda 2 million so‘m yechib olishdi",
    "Avtohalokatdan keyin sug‘urta kompaniyasi pul to‘lamayapti",
    "Pensiya jamg‘armasi stajimning bir qismini hisobga olmadi",
    "Koreyaga ishga yuboramiz deb agentlik pul olib, aldadi"
  ],
  ru: [
    "Работодатель 3 месяца не платит зарплату, долг 9 млн сум",
    "Телевизор из магазина «Texnomart» сломался через 2 недели, не меняют",
    "Хочу подать в хокимият предложение по уличному освещению",
    "Бывший муж не платит алименты на двоих детей",
    "Обратился в хокимият, уже месяц нет ответа",
    "СБДД выписали неправильный штраф по радару",
    "Друг не возвращает долг 20 млн сум, есть расписка",
    "Съехал с квартиры, хозяин не возвращает залог",
    "С моей карты без моего ведома списали 2 млн сум",
    "После ДТП страховая компания не платит",
    "Пенсионный фонд не учёл часть моего стажа",
    "Агентство взяло деньги за работу в Корее и обмануло"
  ]
};
export const examples = lang => lang === "ru" ? EX.ru : lang === "cyr" ? EX.uz.map(toCyrillic) : EX.uz;
export const EXAMPLES = EX.uz;

export const domainCardsHTML = (meta, t) => meta.domains.map(d => {
  const n = meta.scenarios.filter(s => s.domain === d.id).length;
  return `<button class="case domain" type="button" data-domain="${d.id}"><span class="ic">${ICONS[d.id] || ""}</span><span><b>${esc(d.title)}</b><span>${esc(d.desc)}</span><span class="count">${esc(n === 1 ? t("startCase") : t("casesCount", { n }))}</span></span></button>`;
}).join("");
export const examplesHTML = lang => examples(lang).map((e, i) => `<button class="chipbtn" type="button" data-ex="${i}">${esc(e)}</button>`).join("");
