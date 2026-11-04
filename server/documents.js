import { Document, Packer, Paragraph, TextRun, AlignmentType } from "docx";
import PDFDocument from "pdfkit";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { SCENARIO_BY_ID } from "./kb.js";
import { deadlineFrom, parseISO, startOfDay, uzDate, addMonths } from "./dates.js";

const require = createRequire(import.meta.url);
const FONT_DIR = join(dirname(require.resolve("dejavu-fonts-ttf/package.json")), "ttf");
export const RECIPIENTS = { employer:"Ish beruvchiga", inspection:"Mehnat inspeksiyasiga", court:"Sudga" };

const fmtSum = n => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0"); // bo‘linmas bo‘shliq
const P = (v, ph) => (v ? { v: String(v) } : { ph });   // to‘ldirilmagan joy — ph

// Hujjat modeli: bloklar ro‘yxati. Ham ko‘rinish (JSON), ham DOCX/PDF shu modeldan yasaladi.
export function documentModel({ scenario, recipient, form = {}, triggerDate, today = new Date() }){
  const s = SCENARIO_BY_ID[scenario];
  if (!s) throw Object.assign(new Error("Noma’lum holat"), { status: 400 });
  if (!s.documents.includes(recipient)) recipient = s.documents[0];
  const f = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, String(v ?? "").trim().slice(0, 400)]));
  const now = startOfDay(today);
  const trigger = parseISO(triggerDate) || addMonths(now, -1);
  const deadline = deadlineFrom(trigger, s.deadlineMonths);
  const amt = Number(f.amount) > 0 ? fmtSum(Number(f.amount)) + " so‘m" : null;
  const months = Number(f.months) || null;
  const trig = uzDate(trigger);
  const applicant = [P(f.fio, "F.I.Sh."), { v: ", yashash manzili: " }, P(f.address, "manzil"), { v: ", tel.: " }, P(f.phone, "telefon")];
  const employer = P(f.employer, "tashkilot nomi");
  const pos = P(f.position, "lavozim");
  const B = [];

  if (recipient === "employer"){
    B.push({ t:"addr", lines:[[employer, { v:" rahbari" }], [P(f.boss, "rahbar F.I.Sh."), { v:"ga" }], [{ v:"xodim " }, ...applicant, { v:" dan" }]] });
    B.push({ t:"title", text: scenario === "tatil" ? "ARIZA" : "TALABNOMA" });
  } else if (recipient === "inspection"){
    B.push({ t:"addr", lines:[[{ v:"Davlat mehnat inspeksiyasining " }, P(f.district, "tuman/shahar"), { v:" bo‘yicha hududiy bo‘limiga" }], [{ v:"fuqaro " }, ...applicant, { v:" dan" }]] });
    B.push({ t:"title", text:"ARIZA" });
    B.push({ t:"sub", text:"ish beruvchi tomonidan mehnat qonunchiligi buzilganligi to‘g‘risida" });
  } else {
    B.push({ t:"addr", lines:[[P(f.district, "tuman"), { v:" fuqarolik ishlari bo‘yicha tumanlararo sudiga" }],
      [{ v:"Da’vogar: " }, ...applicant],
      [{ v:"Javobgar: " }, employer, { v:", manzil: " }, P(f.empAddress, "ish beruvchi manzili")]] });
    if (scenario === "ish_haqi" && amt) B.push({ t:"addr", lines:[[{ v:`Da’vo summasi: ${amt} va kechiktirish kompensatsiyasi` }]] });
    B.push({ t:"title", text:"DA’VO ARIZASI" });
    B.push({ t:"sub", text: scenario === "ishdan_boshatish" ? "ishga tiklash va majburiy progul vaqti uchun haq undirish to‘g‘risida"
      : scenario === "hisob_kitob" ? "bo‘shatishda tegishli to‘lovlar va kompensatsiyani undirish to‘g‘risida"
      : "ish haqi qarzi va kechiktirish kompensatsiyasini undirish to‘g‘risida" });
  }

  const past = scenario === "hisob_kitob" || scenario === "ishdan_boshatish";
  B.push({ t:"p", parts:[{ v:"Men, " }, P(f.fio, "F.I.Sh."), { v:", " }, employer, { v:"da " }, pos, { v: past ? " lavozimida ishlaganman." : " lavozimida ishlayman." }] });

  if (scenario === "ish_haqi"){
    B.push({ t:"p", parts:[{ v:`${trig}dan boshlab ${months ? months + " oy davomida " : ""}menga ish haqi to‘lanmagan. Ish haqi bo‘yicha qarz miqdori ` }, P(amt, "summa"), { v:"ni tashkil etadi." }] });
    B.push({ t:"p", parts:[{ v:"O‘zbekiston Respublikasi Mehnat kodeksining 25 va 253-moddalariga ko‘ra ish beruvchi ish haqini har yarim oyda kamida bir marta, belgilangan muddatlarda to‘liq hajmda to‘lashi shart. Kodeksning 333-moddasiga muvofiq to‘lov kechiktirilgan har bir kun uchun ish beruvchi, aybi bor-yo‘qligidan qat’i nazar, pulli kompensatsiya to‘laydi." }] });
  } else if (scenario === "ishdan_boshatish"){
    B.push({ t:"p", parts:[{ v:`${trig}da ish beruvchi tashabbusi bilan men bilan tuzilgan mehnat shartnomasi bekor qilindi. Bo‘shatish qonuniy asossiz va belgilangan tartib buzilgan holda amalga oshirildi: Mehnat kodeksining 161-moddasiga ko‘ra ish beruvchi tashabbusi bilan bekor qilish asoslangan bo‘lishi, 165-moddaga ko‘ra esa xodim oldindan yozma ogohlantirilishi shart.` }] });
  } else if (scenario === "tatil"){
    B.push({ t:"p", parts:[{ v:"Mehnat kodeksining 217-moddasiga ko‘ra har bir xodim har yili kamida 21 kalendar kunlik haq to‘lanadigan asosiy ta’tilga haqli. " + (recipient === "employer" ? "Menga ta’til hozirgacha berilmagan." : `Men ta’til so‘rab ariza berganman, biroq ish beruvchi ${trig} holatiga ko‘ra ta’til bermagan.`) }] });
  } else {
    B.push({ t:"p", parts:[{ v:`${trig}da men bilan mehnat shartnomasi bekor qilingan. Biroq ish beruvchi hozirgacha men bilan to‘liq hisob-kitob qilmagan` }, ...(amt ? [{ v:` (qarz: ${amt})` }] : []), { v:" va mehnat daftarchasini (elektron ko‘chirmasini) bermagan. Mehnat kodeksiga ko‘ra barcha summalar shartnoma bekor qilingan kuni, xodim ishlamagan bo‘lsa, talabdan keyin 3 kun ichida to‘lanishi, 171-moddaga ko‘ra esa daftarcha va buyruq ko‘chirmasi o‘sha kuni berilishi shart." }] });
  }
  if (f.extra) B.push({ t:"p", parts:[{ v: f.extra }] });

  const asks = [];
  if (recipient === "employer"){
    B.push({ t:"lbl", text: scenario === "tatil" ? "So‘rayman:" : "Talab qilaman:" });
    if (scenario === "ish_haqi") asks.push([{ v:"ish haqi bo‘yicha " }, P(amt, "summa"), { v:" qarzni to‘lashni;" }], [{ v:"MK 333-moddasi bo‘yicha kechiktirish kompensatsiyasini hisoblab to‘lashni;" }], [{ v:"ish haqi hisob varaqasini yozma ravishda taqdim etishni." }]);
    else if (scenario === "tatil") asks.push([{ v:"menga yillik asosiy mehnat ta’tilini ____ kalendar kun muddatga ____ sanadan boshlab berishni;" }], [{ v:"ta’tillar grafigi nusxasini taqdim etishni." }]);
    else asks.push([{ v:"men bilan 3 kun ichida to‘liq hisob-kitob qilishni" }, ...(amt ? [{ v:` (${amt})` }] : []), { v:";" }], [{ v:"mehnat daftarchasini (elektron ko‘chirmani) va bo‘shatish buyrug‘i ko‘chirmasini berishni;" }], [{ v:"MK 333-moddasi bo‘yicha kechiktirish kompensatsiyasini to‘lashni." }]);
    B.push({ t:"list", items: asks });
    B.push({ t:"p", parts:[{ v:"Talabim qondirilmagan taqdirda Davlat mehnat inspeksiyasi va sudga murojaat qilishimni ma’lum qilaman." }] });
  } else if (recipient === "inspection"){
    B.push({ t:"lbl", text:"So‘rayman:" });
    asks.push([{ v:"ish beruvchi " }, employer, { v:" faoliyatida mehnat qonunchiligiga rioya etilishini tekshirishni;" }]);
    asks.push([{ v: scenario === "ish_haqi" ? "ish haqi qarzini kompensatsiya bilan to‘lash yuzasidan majburiy ko‘rsatma berishni;"
      : scenario === "tatil" ? "menga qonuniy ta’til berish yuzasidan ko‘rsatma berishni;"
      : scenario === "ishdan_boshatish" ? "bo‘shatish tartibi buzilganligi yuzasidan xulosa berishni;"
      : "hisob-kitob va mehnat daftarchasini berish yuzasidan majburiy ko‘rsatma berishni;" }]);
    asks.push([{ v:"aybdor mansabdor shaxslarni qonunda belgilangan javobgarlikka tortish masalasini ko‘rib chiqishni." }]);
    B.push({ t:"list", items: asks });
  } else {
    B.push({ t:"p", parts:[{ v:`Mehnat kodeksiga ko‘ra xodimlar yakka tartibdagi mehnat nizolari bo‘yicha sudga murojaat qilganda sud xarajatlaridan ozod qilinadi. Sudga murojaat muddati (${s.deadlineMonths} oy) ${uzDate(deadline)}da tugaydi.` }] });
    B.push({ t:"lbl", text:"Yuqoridagilarga asosan, so‘rayman:" });
    if (scenario === "ishdan_boshatish") asks.push([{ v:"meni avvalgi ishimga — " }, pos, { v:" lavozimiga tiklashni;" }], [{ v:"javobgardan majburiy progul vaqti uchun o‘rtacha ish haqini undirishni;" }], [{ v:"javobgardan ma’naviy zarar kompensatsiyasini undirishni." }]);
    else {
      asks.push([{ v:"javobgardan mening foydamga " }, P(amt, "summa"), { v:" miqdoridagi qarzni undirishni;" }], [{ v:"javobgardan MK 333-moddasiga muvofiq to‘lov kechiktirilgan har bir kun uchun pulli kompensatsiyani undirishni;" }]);
      if (scenario === "hisob_kitob") asks.push([{ v:"javobgarni mehnat daftarchasini berishga majburlashni." }]);
    }
    B.push({ t:"list", items: asks });
  }
  const att = recipient === "employer" ? ["Mehnat shartnomasi nusxasi."]
    : recipient === "inspection" ? ["Ish beruvchiga berilgan talabnoma nusxasi.", "Mehnat shartnomasi nusxasi.", "Dalillar nusxalari."]
    : ["Da’vo arizasining javobgar uchun nusxasi.", "Mehnat shartnomasi nusxasi.", "Pasport nusxasi.", scenario === "ishdan_boshatish" ? "Bo‘shatish buyrug‘i ko‘chirmasi." : "Bank ko‘chirmasi / ish haqi hisob varaqasi.", "Ish beruvchiga berilgan talabnoma nusxasi."];
  B.push({ t:"lbl", text:"Ilovalar:" });
  B.push({ t:"list", items: att.map(x => [{ v:x }]) });
  B.push({ t:"sign", left: uzDate(now), right:[{ v:"Imzo: ____________  " }, P(f.fio, "F.I.Sh.")] });
  return { scenario, recipient, blocks: B };
}

const partText = ps => ps.map(p => p.v ?? `[${p.ph}]`).join("");

// ---------- DOCX ----------
export async function toDocx(model){
  const font = "Times New Roman", size = 28;
  const run = (text, o = {}) => new TextRun({ text, font, size, bold: o.b, italics: o.i });
  const runs = ps => ps.map(p => run(p.v ?? `[${p.ph}]`));
  const children = [];
  for (const b of model.blocks){
    if (b.t === "addr") b.lines.forEach((l, i) => children.push(new Paragraph({ children: runs(l), indent:{ left: 4820 }, spacing:{ after: i === b.lines.length - 1 ? 240 : 40 } })));
    else if (b.t === "title") children.push(new Paragraph({ children:[run(b.text, { b:true })], alignment: AlignmentType.CENTER, spacing:{ before:120, after:40 } }));
    else if (b.t === "sub") children.push(new Paragraph({ children:[run(b.text, { i:true })], alignment: AlignmentType.CENTER, spacing:{ after:240 } }));
    else if (b.t === "p") children.push(new Paragraph({ children: runs(b.parts), alignment: AlignmentType.JUSTIFIED, indent:{ firstLine: 709 }, spacing:{ after:80, line:300 } }));
    else if (b.t === "lbl") children.push(new Paragraph({ children:[run(b.text, { b:true })], spacing:{ before:120, after:60 } }));
    else if (b.t === "list") b.items.forEach((it, n) => children.push(new Paragraph({ children:[run(`${n + 1}. `), ...runs(it)], indent:{ left:709, hanging:360 }, alignment: AlignmentType.JUSTIFIED, spacing:{ after:40 } })));
    else if (b.t === "sign"){
      children.push(new Paragraph({ children:[run(b.left)], spacing:{ before:480, after:40 } }));
      children.push(new Paragraph({ children: runs(b.right), alignment: AlignmentType.RIGHT }));
    }
  }
  const doc = new Document({
    creator:"HuquqYo‘l", title:"Ariza",
    sections:[{ properties:{ page:{ margin:{ top:1134, right:850, bottom:1134, left:1701 } } }, children }]
  });
  return Packer.toBuffer(doc);
}

// ---------- PDF (DejaVu — o‘zbek harflari to‘liq) ----------
export function toPdf(model){
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size:"A4", margins:{ top:56, bottom:56, left:85, right:42 }, info:{ Title:"Ariza", Creator:"HuquqYo‘l" } });
    const chunks = []; doc.on("data", c => chunks.push(c)); doc.on("end", () => resolve(Buffer.concat(chunks))); doc.on("error", reject);
    doc.registerFont("R", join(FONT_DIR, "DejaVuSerif.ttf"));
    doc.registerFont("B", join(FONT_DIR, "DejaVuSerif-Bold.ttf"));
    doc.registerFont("I", join(FONT_DIR, "DejaVuSerif-Italic.ttf"));
    const W = doc.page.width - 85 - 42, size = 11.5;
    doc.fontSize(size);
    for (const b of model.blocks){
      if (b.t === "addr"){ b.lines.forEach(l => doc.font("R").text(partText(l), 85 + W * 0.48, undefined, { width: W * 0.52 })); doc.moveDown(1); }
      else if (b.t === "title") doc.font("B").text(b.text, 85, undefined, { width: W, align:"center", characterSpacing: 1 });
      else if (b.t === "sub"){ doc.font("I").text(b.text, 85, undefined, { width: W, align:"center" }); doc.moveDown(0.8); }
      else if (b.t === "p") doc.font("R").text(partText(b.parts), 85, undefined, { width: W, align:"justify", indent: 28, paragraphGap: 4, lineGap: 1.5 });
      else if (b.t === "lbl"){ doc.moveDown(0.3); doc.font("B").text(b.text, 85, undefined, { width: W }); }
      else if (b.t === "list") b.items.forEach((it, n) => doc.font("R").text(`${n + 1}. ${partText(it)}`, 85 + 20, undefined, { width: W - 20, align:"justify", paragraphGap: 2 }));
      else if (b.t === "sign"){
        doc.moveDown(2); const y = doc.y;
        doc.font("R").text(b.left, 85, y, { width: W / 2 });
        doc.text(partText(b.right), 85 + W / 2, y, { width: W / 2, align:"right" });
      }
    }
    doc.end();
  });
}
