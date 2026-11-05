import { test } from "node:test";
import assert from "node:assert/strict";
import { toCyrillic } from "../public/translit.js";

test("Lotin → kirill: asosiy qoidalar", () => {
  const cases = {
    "Ish haqi to‘lanmayapti":"Иш ҳақи тўланмаяпти",
    "DA’VO ARIZASI":"ДАЪВО АРИЗАСИ",
    "Yo‘l xaritasi, yoki ta’til":"Йўл харитаси, ёки таътил",
    "qo‘shimcha, g‘amxo‘rlik, eng":"қўшимча, ғамхўрлик, энг",
    "E’tibor bering":"Эътибор беринг",
    "Yer, yetkazilgan":"Ер, етказилган",
    "Mehnat inspeksiyasiga, kompensatsiya":"Меҳнат инспекциясига, компенсация",
    "«Bog‘bon Agro» MChJda":"«Боғбон Агро» МЧЖда",
    "4-noyabr 2026-yil":"4-ноябр 2026-йил"
  };
  for (const [lat, cyr] of Object.entries(cases)) assert.equal(toCyrillic(lat), cyr);
});

test("Havolalar o‘zgarmaydi; turli tutuq belgilari", () => {
  assert.equal(toCyrillic("manba: https://lex.uz/acts/-6257288"), "манба: https://lex.uz/acts/-6257288");
  assert.equal(toCyrillic("oʻgʻil o'g'il o’g’il"), "ўғил ўғил ўғил");
});
