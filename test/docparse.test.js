import { test } from "node:test";
import assert from "node:assert/strict";
import { fixMixedScript, parseDocText, pickAmount, pickPlate, pickNumber, pickDate, pickIssuer, pickType, findDates } from "../server/docparse.js";

const TODAY = new Date(2026, 10, 20);

test("summa: OCR xatolariga chidamli, yil/STIR/QQS/telefon summa emas", () => {
  assert.equal(pickAmount("Karimov A.B.ga 375 000 (uch yuz yetmish besh ming) 5071.\nmiqdorida jarima solinsin."), 375000);
  assert.equal(pickAmount("STIR: 301234567\nQQS 12%: 519 643\nJAMI: 4 850 000 so`m"), 4850000);
  assert.equal(pickAmount("Назначить штраф в размере 412 000 сум."), 412000);
  assert.equal(pickAmount("1988-yilda tug‘ilgan, tel: +998 90 123 45 67"), null);
  assert.equal(pickAmount("Jarima: 1.500.000 so‘m"), 1500000);
  assert.equal(pickAmount("Kartangizdan 2 000 000,00 UZS yechildi"), 2000000);
});

test("avtomobil raqami: ikki format, kirill o‘xshash harflar va OCR xatolari", () => {
  assert.equal(pickPlate("davlat raqami 01 A 123 BC,"), "01 A 123 BC");
  assert.equal(pickPlate("davlat raqami OLA 123 BC,"), "01 A 123 BC");
  assert.equal(pickPlate("госномером 30 В 456 СА нарушил"), "30 B 456 CA");
  assert.equal(pickPlate("yuridik shaxs: 10 345 ABC"), "10 345 ABC");
  assert.equal(pickPlate("davlat raqami 30 $ 777 AA, qizil"), "30 S 777 AA");
  assert.equal(pickPlate("Televizor Samsung UE43 1x4850 000"), null);
});

test("hujjat raqami: № / Ne / WN: — lotin hujjatda kirill o‘xshash harflar lotinga", () => {
  assert.equal(pickNumber("QAROR Ne AB 1234567"), "AB 1234567");
  assert.equal(pickNumber("QAROR WN: AB 1234567"), "AB 1234567");
  assert.equal(pickNumber("QAROR № АВ 1234567"), "AB 1234567");
  assert.equal(pickNumber("ПОСТАНОВЛЕНИЕ № АБ 7654321", false), "АБ 7654321");
  assert.equal(pickNumber("hech qanday raqam yo‘q"), null);
});

test("sana: belgilangan sana ustun, tug‘ilgan sana va kelajak tashlanadi; so‘zli oylar", () => {
  assert.equal(pickDate("Tug‘ilgan sana: 03.05.1988\nSana: 14.11.2026", TODAY), "2026-11-14");
  assert.equal(pickDate("Qaror 25.12.2026 kuni", TODAY), null);
  assert.equal(pickDate("12 ноября 2026 г.", TODAY), "2026-11-12");
  assert.equal(pickDate("14-noyabr 2026-yil", TODAY), "2026-11-14");
  assert.equal(pickDate("31.02.2026", TODAY), null);
  assert.deepEqual(findDates("2026-11-01 va 02/11/2026", TODAY).map(d => d.iso), ["2026-11-01", "2026-11-02"]);
});

test("tashkilot va hujjat turi", () => {
  assert.equal(pickIssuer("O‘ZBEKISTON RESPUBLIKASI ICHKI ISHLAR VAZIRLIGI\nToshkent shahar IIBB Yo‘l harakati xavfsizligi boshqarmasi\nQAROR"), "Toshkent shahar IIBB Yo‘l harakati xavfsizligi boshqarmasi");
  assert.equal(pickIssuer("Fuqaro Karimov Aziz\n«TEXNOMART» MChJ"), "«TEXNOMART» MChJ");
  assert.equal(pickType("BUYRUQ № 45-k\nKarimov A. ishdan bo‘shatilsin"), "ish_buyrugi");
  assert.equal(pickType("Xalq banki: kartangizdan 2 000 000 so‘m yechildi"), "bank_xabarnoma");
  assert.equal(pickType("Elektr energiyasi uchun kvitansiya, 350 kVt"), "kommunal_hisob");
  assert.equal(pickType("Salom dunyo"), "boshqa");
});

test("parseDocText: to‘liq hujjat (bo‘shatish buyrug‘i)", () => {
  const p = parseDocText("«Bog‘bon Agro» MChJ\nBUYRUQ № 112-k\nSana: 02.11.2026\nOmborchi Karimov A.B. 2026-yil 2-noyabrdan ishdan bo‘shatilsin.\nAsos: MK 161-moddasi", TODAY);
  assert.equal(p.doc_type, "ish_buyrugi");
  assert.equal(p.issuer, "«Bog‘bon Agro» MChJ");
  assert.equal(p.date, "2026-11-02");
  assert.match(p.situation, /bo‘shatdi/);
  assert.equal(parseDocText("  \n ", TODAY).readable, false);
});

test("aralash yozuv: lotin qatordagi adashgan kirill so‘zlar tuzatiladi, kirill qatorlar o‘zgarmaydi", () => {
  assert.equal(fixMixedScript("Toshkent shahar ПВВ Yo‘l harakati xavfsizligi boshqarmasi"), "Toshkent shahar IIBB Yo‘l harakati xavfsizligi boshqarmasi");
  assert.equal(fixMixedScript("QAROR № АВ 1234567 Toshkent shahri"), "QAROR № AB 1234567 Toshkent shahri");
  assert.equal(fixMixedScript("Управление ГУВД Самаркандской области"), "Управление ГУВД Самаркандской области");
  assert.equal(fixMixedScript("Тошкент шаҳар ЙҲХБ бошқармаси"), "Тошкент шаҳар ЙҲХБ бошқармаси");
});
