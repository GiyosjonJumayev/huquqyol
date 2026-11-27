// O‘zbekiston hududlari (14 ta: Qoraqalpog‘iston Respublikasi, 12 viloyat, Toshkent shahri) — sudlar ma’lumotnomasidan
// (server/kb/courts.json). Statistika uchun barqaror id: lotin nomidan slug ("Toshkent shahri" → "toshkent_shahri").
import { COURTS } from "./kb.js";
import { findPlace } from "../public/courts.js";

const slug = name => String(name).toLowerCase().replace(/[‘'ʻ`’]/g, "").replace(/ (viloyati|respublikasi)$/, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
// Rasmiy ruscha nomlar (courts.json da faqat idoralar nomi bor)
const RU = { qoraqalpogiston: "Республика Каракалпакстан", andijon: "Андижанская область", buxoro: "Бухарская область", jizzax: "Джизакская область",
  qashqadaryo: "Кашкадарьинская область", navoiy: "Навоийская область", namangan: "Наманганская область", samarqand: "Самаркандская область",
  surxondaryo: "Сурхандарьинская область", sirdaryo: "Сырдарьинская область", toshkent: "Ташкентская область", toshkent_shahri: "город Ташкент",
  fargona: "Ферганская область", xorazm: "Хорезмская область" };
export const REGIONS = COURTS.regions.map(r => { const id = slug(r.name); return { id, name: r.name, cyr: r.cyr, ru: RU[id] || r.cyr }; });
const BY_NAME = new Map(COURTS.regions.map(r => [r.name, slug(r.name)]));
export const REGION_IDS = new Set(REGIONS.map(r => r.id));

// Ariza formasidagi tuman/manzil maydonlaridan hudud (faqat hudud nomi; manzilning o‘zi hech qayerga yozilmaydi)
export function regionOfForm(form = {}){
  for (const k of ["district", "court", "address", "empAddress", "sellerAddress", "propAddress", "landlordAddress", "debtorAddress", "respAddress"]){
    const v = form[k];
    if (typeof v !== "string" || v.length < 3) continue;
    try {
      const hit = findPlace(COURTS, v, { strict: k !== "district" });
      if (hit?.region) return BY_NAME.get(hit.region.name) || null;
    } catch {}
  }
  return null;
}
