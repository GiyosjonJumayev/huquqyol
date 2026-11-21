// Tuman (shahar) → sud. Brauzer va server uchun umumiy: sayt, bot va hujjat dvigateli bir xil natija beradi.
// Ma’lumot: kb/courts.json (PF-6034-son Farmon, 10-ilova). Nomlar lotin, kirill va rus yozuvida yozilishi mumkin:
// «Chilonzor tumani», «Чилонзор тумани», «Чиланзарский район», «р-н Сергели» — hammasi bitta joyni topadi.

const CYR = { а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"yo",ж:"j",з:"z",и:"i",й:"y",к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",
  с:"s",т:"t",у:"u",ф:"f",х:"x",ц:"s",ч:"ch",ш:"sh",щ:"sh",ъ:"",ь:"",ы:"i",э:"e",ю:"yu",я:"ya",ў:"o",қ:"q",ғ:"g",ҳ:"h" };
// Ruscha nomi o‘zbekchasidan ancha farq qiladigan joylar (undosh skeleti mos kelmaydi)
const ALIAS = { "джизак":"jizzax", "коканд":"qo‘qon", "кокандский":"qo‘qon", "джизакский":"jizzax", "джаркурган":"jarqo‘rg‘on",
  "джамбай":"jomboy", "джандар":"jondor", "янгиюль":"yangiyo‘l", "алмалык":"olmaliq", "ахангаран":"ohangaron", "сырдарья":"sirdaryo" };

const latin = s => String(s || "").toLowerCase().replace(/[а-яёўқғҳ]/g, c => CYR[c] ?? c);
// Undosh skeleti: unlilar, tutuq belgilari va «h/x», «q/k» farqi olib tashlanadi — «Mirobod» = «Мирабад» = «mrbd»
const skel = s => latin(s).replace(/dj/g, "j").replace(/ts/g, "s").replace(/[‘’ʻʼ'`\-\s.]/g, "")
  .replace(/h/g, "x").replace(/q/g, "k").replace(/[aeiouo]/g, "").replace(/(.)\1+/g, "$1");
// Ruscha sifatdosh qo‘shimchalari: «Чиланзарский», «Учтепинский», «Ферганская»
const stripRu = w => w.replace(/(инский|инская|инского|инском|ский|ская|ское|ского|ском|скому|ий|ая|ой)$/u, "");

const KIND = [
  [/^(tumani?|t\.?|туман[и]?|т\.?|район[аеу]?|р-н|р-на|р\.)$/i, "tuman"],
  [/^(shahar|shahri|sh\.?|шаҳар|шаҳри|ш\.?|город[ау]?|г\.?)$/i, "shahar"],
  [/^(viloyati?|vil\.?|вилоят[и]?|вил\.?|области|область|обл\.?|respublikasi|республикаси|республика|республики)$/i, "region"]
];
const kindOf = w => w ? (KIND.find(([re]) => re.test(w)) || [])[1] : undefined;
const clean = w => w.replace(/^[«"(]+|[»",;:)]+$/g, "");

// Ma’lumotdan qidiruv indeksi (bir marta quriladi)
const cache = new WeakMap();
function index(courts){
  if (cache.has(courts)) return cache.get(courts);
  const places = [], regionBy = new Map();
  for (const r of courts.regions){
    const rbase = r.name.replace(/ (viloyati|shahri|Respublikasi)$/, "");
    const k = skel(rbase), type = / shahri$/.test(r.name) ? "shahar" : "region";
    regionBy.set(k, { ...regionBy.get(k), [type]: r });
    for (const d of r.districts){
      const base = d.name.replace(/ (tumani|shahri)$/, "");
      places.push({ ...d, base, region: r, sk: skel(base) });
    }
  }
  const ix = { places, regionBy, bySk: new Map() };
  for (const p of places){ if (!ix.bySk.has(p.sk)) ix.bySk.set(p.sk, []); ix.bySk.get(p.sk).push(p); }
  cache.set(courts, ix);
  return ix;
}

/**
 * Matndan tuman yoki shaharni topadi.
 * strict=true (manzil, idora nomi): faqat yonida «tumani / sh. / район / г.» kabi so‘z bo‘lsa — ko‘cha nomi
 * («A. Navoiy ko‘chasi») shaharga aylanib qolmasligi uchun. strict=false («Tuman yoki shahar» maydoni): yalang‘och nom ham.
 * Natija: { place, region } yoki { region } (faqat viloyat aniqlangan) yoki null.
 */
export function findPlace(courts, text, { strict = false } = {}){
  if (!courts || !text) return null;
  const ix = index(courts);
  const words = String(text).split(/[\s,;/]+/).map(clean).filter(Boolean);
  const hits = []; let region = null;
  for (let i = 0; i < words.length; i++){
    if (kindOf(words[i])) continue;
    for (const len of [2, 1]){
      const name = words.slice(i, i + len);
      if (name.length < len || name.some(kindOf)) continue;
      const after = kindOf(words[i + len]), before = kindOf(words[i - 1]);
      const kind = after || (/^(г\.?|город|р-н|район)$/i.test(words[i - 1] || "") ? before : undefined);
      const raw = name.join(" ").toLowerCase();
      const key = ALIAS[raw] ? skel(ALIAS[raw]) : skel(name.map(w => stripRu(w.toLowerCase())).join(" "));
      if (key.length < 2) continue;
      const rg = ix.regionBy.get(key);
      if (kind === "region"){ if (rg) region = rg.region || rg.shahar; continue; }
      let cands = ix.bySk.get(key) || [];
      if (region) { const inR = cands.filter(p => p.region === region); if (inR.length) cands = inR; }
      if (kind) {
        const exact = cands.filter(p => p.kind === kind);
        // «Chirchiq sh.» — jadvalda «Chirchiq tumani» deb yozilgan; lekin «Toshkent sh.» → «Toshkent tumani» emas
        cands = exact.length ? exact : (cands.length === 1 && !rg ? cands : []);
        if (!cands.length && kind === "shahar" && rg) region = rg.shahar || rg.region;   // «Toshkent sh.» — faqat hudud
      } else if (strict) cands = [];
      if (!cands.length) continue;
      // Shahar va bir xil nomli tuman bir sudga qarasa — farqi yo‘q; har xil bo‘lsa (Samarqand) — aniqlashtirish kerak
      const courtsSet = new Set(cands.map(p => p.civil));
      hits.push({ at: i, explicit: !!kind, place: courtsSet.size === 1 ? cands.find(p => p.kind === (kind || "tuman")) || cands[0] : null, options: courtsSet.size > 1 ? cands : null });
      i += len - 1;
      break;
    }
  }
  const best = hits.filter(h => h.place).sort((a, b) => (b.explicit - a.explicit) || (b.at - a.at))[0];
  if (best) return { place: best.place, region: best.place.region };
  const amb = hits.find(h => h.options);
  if (amb) return { options: amb.options, region: amb.options[0].region };
  return region ? { region } : null;
}

const SUFFIX = { tuman: [" tuman sudi", " туман суди"], shahar: [" shahar sudi", " шаҳар суди"] };
/** Sud nomi: kind = civil | admin | criminal; cyr=true — kirill (ruscha hujjat uchun rasmiy o‘zbekcha kirill nomi). */
export function courtName(hit, kind, { cyr = false } = {}){
  if (!hit) return "";
  if (kind === "admin") return hit.region ? (cyr ? hit.region.adminCyr : hit.region.admin) : "";
  const p = hit.place;
  if (!p) return "";
  if (kind === "civil") return cyr ? p.civilCyr : p.civil;
  if (kind === "criminal"){
    const base = cyr ? p.cyr.replace(/ (тумани|шаҳри)$/, "") : p.base;
    return (cyr ? "Жиноят ишлари бўйича " : "Jinoyat ishlari bo‘yicha ") + base + SUFFIX[p.kind][cyr ? 1 : 0];
  }
  return "";
}

/**
 * Holat va forma bo‘yicha sud: avval «Tuman yoki shahar» maydoni, keyin holatdagi manzil va idora maydonlari.
 * spec = scenario.court = { kind, from:[maydonlar] }. Natija: { name, place, region, from, options } yoki null.
 */
export function courtFromForm(courts, spec, form = {}, { cyr = false } = {}){
  if (!courts || !spec) return null;
  for (const k of ["district", ...(spec.from || [])]){
    const v = form[k]; if (!v) continue;
    const hit = findPlace(courts, v, { strict: k !== "district" });
    if (!hit) continue;
    if (hit.options) return { name: "", options: hit.options, region: hit.region, from: k };
    const name = courtName(hit, spec.kind, { cyr });
    if (name) return { name, place: hit.place || null, region: hit.region, from: k };
  }
  return null;
}

/** «Tuman yoki shahar» maydoni uchun ro‘yxat: «Mirobod tumani, Toshkent shahri». */
export const placeOptions = courts => courts.regions.flatMap(r => r.districts.map(d => `${d.name}, ${r.name}`));
/** Barcha sudlar ro‘yxati (qo‘lda tanlash uchun), takrorlarsiz. */
export function allCourts(courts, kind, { cyr = false } = {}){
  const out = new Set();
  for (const r of courts.regions){
    if (kind === "admin"){ out.add(cyr ? r.adminCyr : r.admin); continue; }
    for (const d of r.districts) out.add(courtName({ place:{ ...d, base: d.name.replace(/ (tumani|shahri)$/, "") }, region:r }, kind, { cyr }));
  }
  return [...out];
}
