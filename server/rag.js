import { NORMS, SCENARIOS, NORM_BY_ID } from "./kb.js";
import { existsSync, readFileSync } from "node:fs";
import { normalize, tokenize } from "./text.js";

// BM25 indeks: normalar + holat tavsiflari
function buildIndex(docs){
  const k1 = 1.4, b = 0.75;
  const toks = docs.map(d => tokenize(d.text));
  const avg = toks.reduce((a,t) => a + t.length, 0) / Math.max(1, toks.length);
  const df = new Map();
  toks.forEach(t => new Set(t).forEach(w => df.set(w, (df.get(w) || 0) + 1)));
  const N = docs.length;
  return function search(query, limit = 8){
    const q = [...new Set(tokenize(query))];
    return docs.map((d, i) => {
      const tf = new Map(); toks[i].forEach(w => tf.set(w, (tf.get(w) || 0) + 1));
      let score = 0;
      for (const w of q){
        const f = tf.get(w); if (!f) continue;
        const idf = Math.log(1 + (N - df.get(w) + 0.5) / (df.get(w) + 0.5));
        score += idf * (f * (k1 + 1)) / (f + k1 * (1 - b + b * toks[i].length / avg));
      }
      return { ...d, score };
    }).filter(r => r.score > 0).sort((a,b) => b.score - a.score).slice(0, limit);
  };
}

const normDocs = NORMS.map(n => ({ id:n.id, kind:"norm", text:`${n.lawName} ${n.title} ${n.text}` }));
const scenDocs = SCENARIOS.map(s => ({ id:s.id, kind:"scenario", text:`${s.title} ${s.card} ${s.lead} ${s.keywords.join(" ")} ${s.keywords.join(" ")}` }));
const searchNorms = buildIndex(normDocs);

// Ixtiyoriy: lex.uz'dan olingan to‘liq moddalar (npm run ingest). Bo‘lmasa — faqat tekshirilgan normalar.
const LEX_FILE = new URL("./kb/lex-articles.json", import.meta.url);
export const ARTICLES = existsSync(LEX_FILE) ? JSON.parse(readFileSync(LEX_FILE, "utf8")) : [];
const searchArticles = ARTICLES.length ? buildIndex(ARTICLES.map(a => ({ id:a.id, kind:"article", text:`${a.title} ${a.text}` }))) : () => [];
const ARTICLE_BY_ID = Object.fromEntries(ARTICLES.map(a => [a.id, a]));
const searchScen = buildIndex(scenDocs);

// Holatlarni kalit so‘z + BM25 bo‘yicha reytinglash
export function rankScenarios(text){
  const t = normalize(text);
  const bm = Object.fromEntries(searchScen(text, 10).map(r => [r.id, r.score]));
  return SCENARIOS.map(s => {
    const kw = s.keywords.reduce((a,k) => a + (t.includes(normalize(k)) ? 1 : 0), 0);
    return { id:s.id, keywordHits:kw, score: kw * 2 + (bm[s.id] || 0) };
  }).sort((a,b) => b.score - a.score);
}

// Tahlil uchun kontekst: eng mos 2 holatning normalari + matn bo‘yicha topilgan normalar
// Xalq tilidagi so‘zlarni qonun atamalariga yaqinlashtirish (qidiruvni kengaytirish)
const SYNONYMS = [
  [/maosh|oylik|zarplata|ish haqqi/, "ish haqi to‘lash"],
  [/haydash|haydab|uvol|chiqarib yubor/, "mehnat shartnomasini bekor qilish ish beruvchi tashabbusi"],
  [/otpusk|dam olish/, "mehnat ta’tili"],
  [/trudovoy|daftarcha/, "mehnat daftarchasi"],
  [/raschyot|rasschet|oxirgi pul/, "hisob-kitob"],
  [/shtraf|gai|radar/, "jarima ma’muriy huquqbuzarlik qaror shikoyat"],
  [/raspiska|tilxat|qarzga/, "qarz shartnomasi qaytarish"],
  [/garantiya|brak|buzuq|buzilib/, "nuqsonli tovar kafolat"],
  [/razmer|o‘lcham|mos kelmadi/, "sifatli tovarni almashtirish"],
  [/alement|aliment|bolamga|bolalarimga/, "aliment ota-ona ta’minot bola"],
  [/hokimlik|idora|javob bermay/, "murojaat ko‘rib chiqish muddati"]
];
export const expandQuery = text => {
  const t = normalize(text);
  return [text, ...SYNONYMS.filter(([re]) => re.test(t)).map(([, add]) => add)].join(" ");
};

export function retrieve(text){
  const ranked = rankScenarios(text);
  text = expandQuery(text);
  const top = ranked.filter(r => r.score > 0).slice(0, 2).map(r => r.id);
  const fromScen = (top.length ? top : SCENARIOS.map(s => s.id))
    .flatMap(id => SCENARIOS.find(s => s.id === id).norms);
  const hits = searchNorms(text, 6);
  const ids = [...new Set([...hits.map(h => h.id), ...fromScen])].slice(0, 10);
  const scores = Object.fromEntries(hits.map(h => [h.id, Number(h.score.toFixed(3))]));
  const articles = searchArticles(text, 3).map(h => ({ ...ARTICLE_BY_ID[h.id], text: ARTICLE_BY_ID[h.id].text.slice(0, 1500), score: Number(h.score.toFixed(3)) }));
  return { ranked, norms: ids.map(id => ({ ...NORM_BY_ID[id], score: scores[id] || 0 })), articles };
}
