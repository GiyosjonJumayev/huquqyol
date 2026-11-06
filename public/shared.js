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
  fuqarolik: SVG('<circle cx="9" cy="9" r="5"/><path d="M9 7v4M7.5 9h3"/><path d="M14.5 4.6A5 5 0 1 1 13 19"/><path d="M3 21h8"/>')
};
const EX = {
  uz: [
    "Ish beruvchim 3 oydan beri maosh bermayapti, qarzi 9 million so‘m",
    "«Texnomart» do‘konidan olgan televizor 2 haftada buzildi, almashtirmayapti",
    "Sobiq erim 2 ta bolamga aliment to‘lamayapti",
    "Hokimlikka murojaat qildim, bir oydan beri javob yo‘q",
    "YHXB radar bo‘yicha noto‘g‘ri jarima soldi",
    "Do‘stimga qarzga bergan 20 million so‘mni qaytarmayapti, tilxat bor"
  ],
  ru: [
    "Работодатель 3 месяца не платит зарплату, долг 9 млн сум",
    "Телевизор из магазина «Texnomart» сломался через 2 недели, не меняют",
    "Бывший муж не платит алименты на двоих детей",
    "Обратился в хокимият, уже месяц нет ответа",
    "СБДД выписали неправильный штраф по радару",
    "Друг не возвращает долг 20 млн сум, есть расписка"
  ]
};
export const examples = lang => lang === "ru" ? EX.ru : lang === "cyr" ? EX.uz.map(toCyrillic) : EX.uz;
export const EXAMPLES = EX.uz;

export const domainCardsHTML = (meta, t) => meta.domains.map(d => {
  const n = meta.scenarios.filter(s => s.domain === d.id).length;
  return `<button class="case domain" type="button" data-domain="${d.id}"><span class="ic">${ICONS[d.id] || ""}</span><span><b>${esc(d.title)}</b><span>${esc(d.desc)}</span><span class="count">${esc(n === 1 ? t("startCase") : t("casesCount", { n }))}</span></span></button>`;
}).join("");
export const examplesHTML = lang => examples(lang).map((e, i) => `<button class="chipbtn" type="button" data-ex="${i}">${esc(e)}</button>`).join("");
