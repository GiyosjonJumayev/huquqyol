# Ishga tushirish: python3 scripts/build-kb.py server/kb  (bilim bazasini qayta yaratadi)
# HuquqYo‘l bilim bazasi generatori: server/kb/*.json fayllarini yozadi.
# Shablon sintaksisi: {{kalit}} — maydon yoki hisoblangan qiymat; [?kalit]...[/] — kalit bo‘lsa; [!kalit]...[/] — bo‘lmasa.
import json, os, sys
OUT = sys.argv[1]
A = "’"

LAWS = {
  "mk":   {"name":"Mehnat kodeksi", "full":"O‘zbekiston Respublikasining Mehnat kodeksi (O‘RQ-798, 28.10.2022)", "url":"https://lex.uz/acts/-6257288"},
  "ihq":  {"name":"Iste’molchilar huquqlari to‘g‘risidagi qonun", "full":"«Iste’molchilarning huquqlarini himoya qilish to‘g‘risida»gi Qonun (221-I, 26.04.1996)", "url":"https://lex.uz/docs/-4704"},
  "ok":   {"name":"Oila kodeksi", "full":"O‘zbekiston Respublikasining Oila kodeksi (30.04.1998)", "url":"https://lex.uz/docs/104720"},
  "mq":   {"name":"Murojaatlar to‘g‘risidagi qonun", "full":"«Jismoniy va yuridik shaxslarning murojaatlari to‘g‘risida»gi Qonun (O‘RQ-445 tahririda)", "url":"https://lex.uz/docs/-3336169"},
  "msk":  {"name":"Ma’muriy sud ishlarini yuritish to‘g‘risidagi kodeks", "full":"O‘zbekiston Respublikasining Ma’muriy sud ishlarini yuritish to‘g‘risidagi kodeksi (25.01.2018)", "url":"https://lex.uz/docs/-3527353"},
  "mjtk": {"name":"Ma’muriy javobgarlik to‘g‘risidagi kodeks", "full":"Ma’muriy javobgarlik to‘g‘risidagi kodeks (MJtK)", "url":"https://lex.uz/acts/-97664"},
  "fk":   {"name":"Fuqarolik kodeksi", "full":"O‘zbekiston Respublikasining Fuqarolik kodeksi", "url":"https://lex.uz/mact/-111189"},
  "dbq":  {"name":"Davlat boji to‘g‘risidagi qonun", "full":"«Davlat boji to‘g‘risida»gi Qonun (O‘RQ-600, 06.01.2020)", "url":"https://lex.uz/docs/4680955"}
}

DOMAINS = [
  {"id":"mehnat",    "title":"Mehnat",              "desc":"Ish haqi, ishdan bo‘shatish, ta’til"},
  {"id":"istemol",   "title":"Iste’molchi",         "desc":"Sifatsiz tovar, tovarni qaytarish"},
  {"id":"oila",      "title":"Oila",                "desc":"Bolalar uchun aliment"},
  {"id":"davlat",    "title":"Davlat idoralari",    "desc":"Javobsiz murojaat, noqonuniy qaror"},
  {"id":"jarima",    "title":"Jarimalar",           "desc":"Ma’muriy jarimaga shikoyat"},
  {"id":"fuqarolik", "title":"Qarz",                "desc":"Qarzga bergan pulni undirish"}
]

N = []
def norm(id, law, article, title, text): N.append({"id":id, "law":law, "article":article, "title":title, "text":text})

# ---- Mehnat (avvalgi tekshirilgan normalar) ----
norm("m25","mk","25-modda","Ish beruvchining majburiyatlari","Ish beruvchi ish haqini Kodeks, jamoa shartnomasi va mehnat shartnomasida belgilangan muddatlarda to‘liq hajmda to‘lashi shart.")
norm("m253","mk","253-modda","Ish haqini to‘lash muddatlari","Ish haqi har yarim oyda kamida bir marta to‘lanadi, to‘lovlar orasidagi tanaffus 16 kundan oshmasligi kerak. To‘lov kuni dam olish yoki bayram kuniga to‘g‘ri kelsa, undan oldingi kunda to‘lanadi.")
norm("m333","mk","333-modda","Ish haqini kechiktirganlik uchun javobgarlik","Ish haqi, ta’til puli yoki bo‘shatishdagi to‘lovlar kechiktirilsa, ish beruvchi har bir kechikkan kun uchun pulli kompensatsiya to‘laydi (Markaziy bank qayta moliyalash stavkasining 10 foizi miqdorida). Ish beruvchining aybi bor-yo‘qligi ahamiyatsiz.")
norm("m161","mk","161-modda","Ish beruvchi tashabbusi bilan bekor qilish","Ish beruvchi mehnat shartnomasini faqat Kodeksda sanab o‘tilgan asoslar bo‘lganda va belgilangan tartibga rioya qilib bekor qila oladi. Bekor qilish asoslangan bo‘lishi kerak.")
norm("m165","mk","165-modda","Ogohlantirish muddati","Alohida asoslarda ish beruvchi xodimni oldindan yozma ogohlantirishi shart. Masalan, shtat qisqarganda kamida 2 oy oldin. Ayrim hollarda ogohlantirish pulli kompensatsiya bilan almashtiriladi.")
norm("m171","mk","171-modda","Bo‘shatish kuni beriladigan hujjatlar","Shartnoma bekor qilingan kuni ish beruvchi mehnat daftarchasini (yoki elektron daftarchadan ko‘chirmani) va bo‘shatish buyrug‘ining ko‘chirma nusxasini berishi shart.")
norm("hisob","mk","12-bob","Bo‘shatishda hisob-kitob","Barcha tegishli summalar shartnoma bekor qilingan kuni to‘lanadi. Xodim o‘sha kuni ishlamagan bo‘lsa, hisob-kitob talab qilingandan keyin 3 kundan kechiktirmay. Summa bo‘yicha nizo bo‘lsa ham, shubhasiz tegishli qism shu muddatda to‘lanadi.")
norm("m217","mk","217-modda","Har yilgi asosiy ta’til","Har bir xodim har yili kamida 21 kalendar kunlik haq to‘lanadigan asosiy mehnat ta’tili olish huquqiga ega.")
norm("m218","mk","218-modda","Uzaytirilgan asosiy ta’til","18 yoshgacha bo‘lganlar va I–II guruh nogironligi bo‘lgan xodimlarga 30 kalendar kun, davlat hokimiyati va boshqaruvi organlari xodimlariga 27 kalendar kun.")
norm("m220","mk","220-modda","Ish staji uchun qo‘shimcha ta’til","Bitta tashkilot yoki tarmoqda ishlangan har 5 yil uchun 2 kalendar kun, jami 8 kundan oshmaydigan qo‘shimcha ta’til beriladi.")
norm("m231","mk","231-modda","Ta’tilni qismlarga bo‘lish","Ta’tilni qismlarga bo‘lish mumkin, lekin qismlardan biri kamida 14 kalendar kun bo‘lishi kerak.")
norm("muddat","mk","34-bob","Sudga murojaat qilish muddatlari","Ishga tiklash bo‘yicha: bo‘shatish buyrug‘i ko‘chirmasi berilgan kundan 3 oy. Boshqa mehnat nizolari bo‘yicha: huquq buzilganini bilgan kundan 6 oy. Nizo mediatsiyada ko‘rilayotgan davrda muddat to‘xtab turadi. Xodimlar sud xarajatlaridan ozod.")
norm("sud","mk","34-bob","Bevosita sudda ko‘riladigan nizolar","Ishga tiklash, bo‘shatish sanasi yoki asosini o‘zgartirish, majburiy progul haqi bo‘yicha nizolar, shuningdek ish joyida mehnat nizolari komissiyasi bo‘lmasa, nizo to‘g‘ridan-to‘g‘ri sudda ko‘riladi.")
norm("m9","mk","9-modda","Muddatlarni hisoblash","Muddat boshlanish sanasidan keyingi kundan hisoblanadi. Oylar bilan hisoblanadigan muddat oxirgi oyning tegishli sanasida tugaydi. Oxirgi kun ishlanmaydigan kunga to‘g‘ri kelsa, keyingi birinchi ish kuni muddat tugaydi.")

# ---- Iste’molchi ----
norm("ihq13","ihq","13-modda","Nuqsonli tovar sotilganda iste’molchining huquqlari","Siz o‘zingiz tanlaysiz: tovarni almashtirish, nuqsonni bepul tuzatish, narxni kamaytirish yoki pulni qaytarib, zararni qoplash. Talabni kafolat muddati ichida, kafolat bo‘lmasa xariddan 6 oy ichida qo‘yish mumkin (ko‘chmas mulk uchun 2 yil).")
norm("ihq14","ihq","14-modda","Nuqsonli tovarni almashtirib berish","Sotuvchi tovarni 7 kun ichida, qo‘shimcha tekshiruv kerak bo‘lsa 20 kun ichida almashtiradi. Bir xil tovar bo‘lmasa, 1 oy ichida. Kechiktirilgan har bir kun uchun tovar narxining 1 foizi miqdorida penya to‘lanadi.")
norm("ihq15","ihq","15-modda","Nuqsonni bepul bartaraf etish","Kafolatli tovardagi nuqsonni sotuvchi 20 kun, ishlab chiqaruvchi 10 kun ichida bepul tuzatadi. Uzoq foydalaniladigan tovar ta’mirda bo‘lsa, 3 kun ichida vaqtinchalik o‘xshash tovar beriladi. Kechikkan har kun uchun narxning 1 foizi penya.")
norm("ihq16","ihq","16-modda","Narxni kamaytirish yoki shartnomani bekor qilish","Sotuvchi tovarni almashtirmasa yoki tuzatmasa, narxni kamaytirishni yoki shartnomani bekor qilib, pulni qaytarishni talab qilishingiz mumkin.")
norm("ihq18","ihq","18-modda","Sifatli tovarni almashtirish","O‘lchami, shakli yoki rangi mos kelmagan nooziq-ovqat tovarini xariddan 10 kun ichida almashtirish mumkin; bir xil tovar bo‘lmasa, pul qaytariladi. Tovar ishlatilmagan, yorliq va qadoqlari saqlangan bo‘lishi kerak. Faqat hukumat ro‘yxatidagi tovarlar almashtirilmaydi, kiyim bu ro‘yxatda yo‘q.")
norm("ihq22","ihq","22-modda","Ma’naviy zarar","Iste’molchiga yetkazilgan ma’naviy zarar uchun haq to‘lanadi, uning miqdorini sud belgilaydi.")
norm("ihq23","ihq","23-modda","Davlat himoyasi","Iste’molchilar huquqlarini Raqobatni rivojlantirish va iste’molchilar huquqlarini himoya qilish qo‘mitasi va uning hududiy boshqarmalari himoya qiladi.")
norm("ihq29","ihq","29-modda","Sud orqali himoya","Iste’molchining huquqlari buzilsa, u sudga murojaat qilishga haqli.")

# ---- Oila ----
norm("ok96","ok","96-modda","Ota-onaning ta’minot berish majburiyati","Ota-ona voyaga yetmagan bolalarini ta’minlashi shart. Bu majburiyat ota-onaning ikkalasiga ham tegishli, ular ajrashgan bo‘lsa ham.")
norm("ok99","ok","99-modda","Aliment miqdori","Kelishuv bo‘lmasa, sud ota-onaning daromadidan bir bola uchun to‘rtdan bir, ikki bola uchun uchdan bir, uch va undan ortiq bola uchun yarmi miqdorida aliment undiradi. Sud bu ulushni tomonlarning ahvoliga qarab o‘zgartirishi mumkin. Bir bola uchun eng kam miqdor 2026-yil 1-sentabrdan oyiga 360 400 so‘m.")
norm("ok136","ok","136-modda","Alimentni sud tartibida undirish","Aliment olishga haqli shaxs sudga istalgan vaqtda murojaat qilishi mumkin. Aliment odatda sudga murojaat qilingan kundan boshlab undiriladi, shuning uchun kechiktirmang.")
norm("ok12","ok","12-modda","Da’vo muddati qo‘llanilmaydi","Oilaviy munosabatlardan kelib chiqadigan talablarga, Kodeksda nazarda tutilgan hollardan tashqari, da’vo muddati qo‘llanilmaydi.")
norm("dbq8","dbq","8-modda","Davlat bojidan ozod qilish","Aliment undirish to‘g‘risidagi da’volar bo‘yicha da’vogar davlat bojini to‘lamaydi.")

# ---- Davlat idoralari ----
norm("mq6","mq","6-modda","Murojaatga qo‘yiladigan talablar","Murojaatda F.I.Sh., yashash joyi, qaysi idoraga yuborilayotgani va masalaning mohiyati ko‘rsatiladi. Yozma murojaat imzolanadi.")
norm("mq28","mq","28-modda","Murojaatlarni ko‘rib chiqish muddatlari","Murojaat kelib tushgan kundan 15 kun ichida, qo‘shimcha o‘rganish kerak bo‘lsa 1 oygacha ko‘rib chiqiladi. Alohida hollarda rahbar muddatni ko‘pi bilan yana 1 oyga uzaytirishi va bu haqda sizga xabar berishi mumkin.")
norm("mq36","mq","36-modda","Nizolarni hal etish","Murojaat bo‘yicha qaror yoki javob berilmagani ustidan yuqori turuvchi organga yoki sudga shikoyat qilish mumkin.")
norm("mq38","mq","38-modda","Javobgarlik","Murojaatlar to‘g‘risidagi qonunchilikni buzgan mansabdor shaxslar qonunda belgilangan javobgarlikka tortiladi.")
norm("mq5","mq","5-modda","Murojaat shakllari","Murojaat og‘zaki, yozma yoki elektron shaklda yuborilishi mumkin; barcha shakllar teng kuchga ega. Elektron murojaat organning rasmiy veb-sayti orqali ham yuboriladi.")
norm("msk6","msk",None,"Ma’muriy sudga murojaat muddati va boji","Davlat organi yoki mansabdor shaxsning qarori, harakati yoki harakatsizligi ustidan huquq buzilganini bilgan kunning ertasidan boshlab 6 oy ichida tumanlararo ma’muriy sudga ariza beriladi. Ariza berishda jismoniy shaxslardan davlat boji olinmaydi; ariza rad etilsa, BHMning 70 foizi undiriladi.")
norm("msk_tikla","msk",None,"Muddatni tiklash va ijroni to‘xtatish","Muddat uzrli sabab bilan o‘tkazib yuborilgan bo‘lsa, sud uni tiklashi mumkin. Arizachi nizolashilayotgan hujjat ijrosini vaqtincha to‘xtatishni ham so‘rashi mumkin.")

# ---- Jarima ----
norm("mjtk_shik","mjtk",None,"Jarima qaroriga shikoyat qilish","Ma’muriy huquqbuzarlik to‘g‘risidagi ish bo‘yicha qarorga qaror nusxasi olingan kundan 10 kun ichida shikoyat qilinadi (2024-yildan, O‘RQ-884). Muddat uzrli sabab bilan o‘tgan bo‘lsa, tiklashni so‘rash mumkin.")
norm("yhxx_el","mjtk",None,"YHXX jarimasi ustidan elektron shikoyat","Yo‘l harakati xavfsizligi xizmati jarimasi ustidan my.gov.uz portali orqali elektron shikoyat qilish mumkin. Shikoyat bepul, 5–10 ish kunida ko‘riladi. Ko‘rib chiqish davrida chegirma muddati to‘xtamaydi; shikoyat rad etilsa, jarima chegirmasiz to‘lanadi.")
norm("mjtk332","mjtk","332¹-modda","Jarimani ixtiyoriy to‘lashda imtiyoz","Qaror topshirilgan kundan 15 kun ichida jarimaning 50 foizini yoki 30 kun ichida 70 foizini to‘lasangiz, qolgan qismi kechiriladi. Qaror ustidan shikoyat qilingan bo‘lsa, bu imtiyoz qo‘llanmaydi.")

# ---- Qarz ----
norm("fk732","fk","732-modda","Qarz shartnomasi","Qarz oluvchi olgan pul summasini qaytarishi shart. Qaytarish muddati shartnomada ko‘rsatilmagan bo‘lsa, qarz beruvchi talab qilgan vaqtda qaytariladi.")
norm("fk150","fk","150-modda","Umumiy da’vo muddati","Umumiy da’vo muddati 3 yil. U huquq buzilganini bilgan yoki bilishi kerak bo‘lgan kundan boshlanadi. Muddat o‘tgan bo‘lsa ham sud arizani qabul qiladi, lekin javobgar so‘rasa, da’vo rad etilishi mumkin.")

# ---------- Maydonlar ----------
def F(k, label, ph, type="text", group=None, docs=None, hint=None, options=None, max=None, min=None, calc=False):
    d = {"k":k, "label":label, "ph":ph, "type":type}
    for key, v in (("group",group),("docs",docs),("hint",hint),("options",options),("max",max),("min",min)):
        if v is not None: d[key] = v
    if calc: d["calc"] = True
    return d

LAB_WORK = "Ish joyi"
labor_fields = lambda money: [
  F("employer","Ish beruvchi","tashkilot nomi", group=LAB_WORK, hint="«…» MChJ"),
  F("position","Lavozimingiz","lavozim", group=LAB_WORK, hint="omborchi"),
  *( [F("amount","Qarz summasi, so‘m","summa","money", group=LAB_WORK, calc=True),
      F("months","Necha oylik qarz","oylar soni","int", group=LAB_WORK, min=1, max=60, calc=True)] if money else [] ),
  F("boss","Rahbar F.I.Sh.","rahbar F.I.Sh.", group=LAB_WORK, docs=["employer"], hint="direktor"),
  F("district","Tuman yoki shahar","tuman/shahar", group=LAB_WORK, docs=["inspection","court"], hint="Chilonzor tumani"),
  F("empAddress","Ish beruvchi manzili","ish beruvchi manzili", group=LAB_WORK, docs=["court"])
]

# ---------- Labor hujjat bo‘laklari ----------
EMP_TO = ["{{employer}} rahbari", "{{boss}}ga", "xodim {{applicant}} dan"]
INSP_TO = ["Davlat mehnat inspeksiyasining {{district}} bo‘yicha hududiy bo‘limiga", "fuqaro {{applicant}} dan"]
def COURT_TO(extra=None):
    return ["{{district}} fuqarolik ishlari bo‘yicha tumanlararo sudiga", "Da’vogar: {{applicant}}", "Javobgar: {{employer}}, manzil: {{empAddress}}"] + ([extra] if extra else [])
INTRO_NOW = "Men, {{fio}}, {{employer}}da {{position}} lavozimida ishlayman."
INTRO_PAST = "Men, {{fio}}, {{employer}}da {{position}} lavozimida ishlaganman."
EMP_CLOSE = "Talabim qondirilmagan taqdirda Davlat mehnat inspeksiyasi va sudga murojaat qilishimni ma’lum qilaman."
COURT_FEE = "Mehnat kodeksiga ko‘ra xodimlar yakka tartibdagi mehnat nizolari bo‘yicha sudga murojaat qilganda sud xarajatlaridan ozod qilinadi. Sudga murojaat muddati ({{deadlineTerm}}) {{deadline}}da tugaydi."
def INSP_ASKS(mid): return ["ish beruvchi {{employer}} faoliyatida mehnat qonunchiligiga rioya etilishini tekshirishni;", mid, "aybdor mansabdor shaxslarni qonunda belgilangan javobgarlikka tortish masalasini ko‘rib chiqishni."]
INSP_ATT = ["Ish beruvchiga berilgan talabnoma nusxasi", "Mehnat shartnomasi nusxasi"]
COURT_ATT = ["Da’vo arizasining javobgar uchun nusxasi", "Pasport nusxasi", "Mehnat shartnomasi nusxasi"]

def doc(id, label, to, title, body, asks, attach, sub=None, askLabel="So‘rayman:", closing=None):
    d = {"id":id, "label":label, "to":to, "title":title, "body":body, "askLabel":askLabel, "asks":asks, "attach":attach}
    if sub: d["sub"] = sub
    if closing: d["closing"] = closing
    return d

S = []
def scen(**kw): S.append(kw)

# ===== MEHNAT =====
WAGE_P1 = "{{trigger}}dan boshlab [?months]{{months}} oy davomida [/]menga ish haqi to‘lanmagan. Ish haqi bo‘yicha qarz miqdori {{amount}}ni tashkil etadi."
WAGE_P2 = "O‘zbekiston Respublikasi Mehnat kodeksining 25 va 253-moddalariga ko‘ra ish beruvchi ish haqini har yarim oyda kamida bir marta, belgilangan muddatlarda to‘liq hajmda to‘lashi shart. Kodeksning 333-moddasiga muvofiq to‘lov kechiktirilgan har bir kun uchun ish beruvchi, aybi bor-yo‘qligidan qat’i nazar, pulli kompensatsiya to‘laydi."
scen(id="ish_haqi", domain="mehnat", title="Ish haqi to‘lanmayapti", card="Maosh kechikyapti yoki umuman berilmayapti", short="Ish haqi",
  lead="Ish beruvchi ish haqini oyiga kamida ikki marta to‘lashi shart. Kechiktirilgan har bir kun uchun sizga qo‘shimcha kompensatsiya tegadi.",
  keywords=["maosh","oylik","ish haqi","ish haqqi","zarplata","avans","bo‘nak","ish beruvchi"],
  norms=["m253","m333","m25","muddat","m9"],
  deadline={"months":6, "label":"Sudga murojaat uchun qoldi"}, trigger="Birinchi to‘lanmagan maosh sanasi",
  calc={"type":"labor333"}, partyField="employer", amountField="amount",
  steps=[{"org":"Ish beruvchi","t":"Yozma talabnoma bering","when":"Bugun","body":"2 nusxada; ikkinchisiga qabul belgisi va sana qo‘ydiring."},
         {"org":"Mehnat inspeksiyasi","t":"Javob bo‘lmasa, ariza yozing","when":"1–2 hafta ichida","body":"Inspektor tekshiradi va ish beruvchiga majburiy ko‘rsatma beradi."},
         {"org":"Sud","t":"Qarz va kompensatsiyani undiring","when":"{deadline} gacha","hot":True,"body":"Fuqarolik sudiga da’vo. Xodim sud xarajatlaridan ozod."}],
  evidence=["Mehnat shartnomasi","Bank ko‘chirmasi (oxirgi tushum)","Ish haqi hisob varaqasi","Ish beruvchi bilan yozishmalar","Talabnoma nusxasi (qabul belgisi bilan)","Hamkasblar guvohligi"],
  fields=labor_fields(True),
  docs=[
    doc("employer","Ish beruvchiga", EMP_TO, "TALABNOMA", [INTRO_NOW, WAGE_P1, WAGE_P2],
        ["ish haqi bo‘yicha {{amount}} qarzni to‘lashni;","MK 333-moddasi bo‘yicha kechiktirish kompensatsiyasini hisoblab to‘lashni;","ish haqi hisob varaqasini yozma ravishda taqdim etishni."],
        ["Mehnat shartnomasi nusxasi"], askLabel="Talab qilaman:", closing=EMP_CLOSE),
    doc("inspection","Mehnat inspeksiyasiga", INSP_TO, "ARIZA", [INTRO_NOW, WAGE_P1, WAGE_P2],
        INSP_ASKS("ish haqi qarzini kompensatsiya bilan to‘lash yuzasidan majburiy ko‘rsatma berishni;"), INSP_ATT,
        sub="ish beruvchi tomonidan mehnat qonunchiligi buzilganligi to‘g‘risida"),
    doc("court","Sudga", COURT_TO("[?amount]Da’vo summasi: {{amount}} va kechiktirish kompensatsiyasi[/]"), "DA’VO ARIZASI", [INTRO_NOW, WAGE_P1, WAGE_P2, COURT_FEE],
        ["javobgardan mening foydamga {{amount}} miqdoridagi qarzni undirishni;","javobgardan MK 333-moddasiga muvofiq to‘lov kechiktirilgan har bir kun uchun pulli kompensatsiyani undirishni;"],
        COURT_ATT + ["Bank ko‘chirmasi yoki ish haqi hisob varaqasi"], sub="ish haqi qarzi va kechiktirish kompensatsiyasini undirish to‘g‘risida", askLabel="Yuqoridagilarga asosan, so‘rayman:")
  ])

DISM_P = "{{trigger}}da ish beruvchi tashabbusi bilan men bilan tuzilgan mehnat shartnomasi bekor qilindi. Bo‘shatish qonuniy asossiz va belgilangan tartib buzilgan holda amalga oshirildi: Mehnat kodeksining 161-moddasiga ko‘ra ish beruvchi tashabbusi bilan bekor qilish asoslangan bo‘lishi, 165-moddaga ko‘ra esa xodim oldindan yozma ogohlantirilishi shart."
scen(id="ishdan_boshatish", domain="mehnat", title="Noqonuniy ishdan bo‘shatishdi", card="Ogohlantirmasdan yoki asossiz bo‘shatishdi", short="Ishdan bo‘shatish",
  lead="Ish beruvchi sizni faqat qonunda sanalgan asos bilan va tartibga rioya qilib bo‘shatishi mumkin. Aks holda sud sizni ishga tiklaydi.",
  keywords=["bo‘shat","haydash","haydab","ishdan chiqar","uvol","ozod qil","qisqart","shtat","ishga tikla","ogohlantir"],
  norms=["m161","m165","sud","muddat","m171","m9"],
  deadline={"months":3, "label":"Sudga murojaat uchun qoldi"}, trigger="Bo‘shatish buyrug‘i qo‘lingizga tekkan sana",
  calc=None, partyField="employer",
  steps=[{"org":"Ish beruvchi","t":"Buyruq va daftarchani so‘rang","when":"Darhol","body":"Buyruq nusxasini olgan sanani yozib qo‘ying: muddat shu kundan boshlanadi."},
         {"org":"Sud","t":"Ishga tiklash da’vosini bering","when":"{deadline} gacha","hot":True,"body":"Bevosita sudga. Majburiy progul haqi va ma’naviy zararni ham so‘rang."},
         {"org":"Mehnat inspeksiyasi","t":"Parallel ariza yozing","when":"Sud bilan birga","body":"Inspeksiya xulosasi sudda dalil bo‘ladi, lekin sud muddatini to‘xtatmaydi."}],
  evidence=["Bo‘shatish buyrug‘i nusxasi","Mehnat shartnomasi","Ogohlantirish xati (yoki uning yo‘qligi)","Mehnat daftarchasi / elektron ko‘chirma","Yozishmalar","Guvohlar"],
  fields=labor_fields(False),
  docs=[
    doc("court","Sudga", COURT_TO(), "DA’VO ARIZASI", [INTRO_PAST, DISM_P, COURT_FEE],
        ["meni avvalgi ishimga — {{position}} lavozimiga tiklashni;","javobgardan majburiy progul vaqti uchun o‘rtacha ish haqini undirishni;","javobgardan ma’naviy zarar kompensatsiyasini undirishni."],
        COURT_ATT + ["Bo‘shatish buyrug‘i ko‘chirmasi"], sub="ishga tiklash va majburiy progul vaqti uchun haq undirish to‘g‘risida", askLabel="Yuqoridagilarga asosan, so‘rayman:"),
    doc("inspection","Mehnat inspeksiyasiga", INSP_TO, "ARIZA", [INTRO_PAST, DISM_P],
        INSP_ASKS("bo‘shatish tartibi buzilganligi yuzasidan xulosa berishni;"), ["Mehnat shartnomasi nusxasi","Bo‘shatish buyrug‘i ko‘chirmasi"],
        sub="ish beruvchi tomonidan mehnat qonunchiligi buzilganligi to‘g‘risida")
  ])

LEAVE_EMP = "Mehnat kodeksining 217-moddasiga ko‘ra har bir xodim har yili kamida 21 kalendar kunlik haq to‘lanadigan asosiy ta’tilga haqli. Menga ta’til hozirgacha berilmagan."
LEAVE_INSP = "Mehnat kodeksining 217-moddasiga ko‘ra har bir xodim har yili kamida 21 kalendar kunlik haq to‘lanadigan asosiy ta’tilga haqli. Men ta’til so‘rab ariza berganman, biroq ish beruvchi {{trigger}} holatiga ko‘ra ta’til bermagan."
scen(id="tatil", domain="mehnat", title="Ta’tilga chiqarishmayapti", card="Yillik ta’til berilmayapti yoki qisqartirildi", short="Ta’til",
  lead="Har bir xodim har yili kamida 21 kalendar kunlik haq to‘lanadigan ta’tilga haqli. Ish beruvchi uni bermasligi mumkin emas.",
  keywords=["ta’til","tatil","otpusk","dam ol"],
  norms=["m217","m218","m220","m231","muddat"],
  deadline={"months":6, "label":"Sudga murojaat uchun qoldi"}, trigger="Ta’til rad etilgan sana",
  calc=None, partyField="employer",
  steps=[{"org":"Ish beruvchi","t":"Ta’til so‘rab ariza yozing","when":"Bugun","body":"Kunlar soni va sanani ko‘rsating, ta’tillar grafigini so‘rang."},
         {"org":"Mehnat inspeksiyasi","t":"Rad etilsa, ariza yozing","when":"Rad javobidan keyin","body":"Inspektor ish beruvchiga ta’til berish yuzasidan ko‘rsatma beradi."},
         {"org":"Sud","t":"Ta’til yoki kompensatsiyani talab qiling","when":"{deadline} gacha","hot":True,"body":"Fuqarolik sudiga da’vo. Sud xarajati to‘lanmaydi."}],
  evidence=["Mehnat shartnomasi","Ta’til so‘ralgan ariza nusxasi","Rad javobi yoki yozishma","Ta’tillar grafigi","Ish staji hujjati"],
  fields=labor_fields(False),
  docs=[
    doc("employer","Ish beruvchiga", EMP_TO, "ARIZA", [INTRO_NOW, LEAVE_EMP],
        ["menga yillik asosiy mehnat ta’tilini ____ kalendar kun muddatga ____ sanadan boshlab berishni;","ta’tillar grafigi nusxasini taqdim etishni."],
        ["Mehnat shartnomasi nusxasi"], closing=EMP_CLOSE),
    doc("inspection","Mehnat inspeksiyasiga", INSP_TO, "ARIZA", [INTRO_NOW, LEAVE_INSP],
        INSP_ASKS("menga qonuniy ta’til berish yuzasidan ko‘rsatma berishni;"), INSP_ATT,
        sub="ish beruvchi tomonidan mehnat qonunchiligi buzilganligi to‘g‘risida")
  ])

CALC_P = "{{trigger}}da men bilan mehnat shartnomasi bekor qilingan. Biroq ish beruvchi hozirgacha men bilan to‘liq hisob-kitob qilmagan[?amount] (qarz: {{amount}})[/] va mehnat daftarchasini (elektron ko‘chirmasini) bermagan. Mehnat kodeksiga ko‘ra barcha summalar shartnoma bekor qilingan kuni, xodim ishlamagan bo‘lsa, talabdan keyin 3 kun ichida to‘lanishi, 171-moddaga ko‘ra esa daftarcha va buyruq ko‘chirmasi o‘sha kuni berilishi shart."
scen(id="hisob_kitob", domain="mehnat", title="Bo‘shatganda hisob-kitob qilinmadi", card="Oxirgi pul yoki mehnat daftarcha berilmadi", short="Hisob-kitob",
  lead="Ishdan ketgan kuningiz barcha pul va mehnat daftarchasi berilishi shart. Kechiktirilgan har bir kun uchun kompensatsiya tegadi.",
  keywords=["hisob-kitob","hisob kitob","raschyot","rasschet","daftarcha","trudovoy","ishdan ketdim","ishdan ketganman","bo‘shab ketdim"],
  norms=["hisob","m171","m333","muddat"],
  deadline={"months":6, "label":"Sudga murojaat uchun qoldi"}, trigger="Oxirgi ish kuningiz",
  calc={"type":"labor333"}, partyField="employer", amountField="amount",
  steps=[{"org":"Ish beruvchi","t":"Hisob-kitobni yozma talab qiling","when":"Bugun","body":"Qonun bo‘yicha pul talabdan keyin 3 kun ichida to‘lanishi kerak."},
         {"org":"Mehnat inspeksiyasi","t":"To‘lanmasa, ariza yozing","when":"3 kundan keyin","body":"Daftarcha berilmagani ham alohida qoidabuzarlik sifatida ko‘riladi."},
         {"org":"Sud","t":"Summa va kompensatsiyani undiring","when":"{deadline} gacha","hot":True,"body":"Fuqarolik sudiga da’vo. Xodim sud xarajatlaridan ozod."}],
  evidence=["Ishdan bo‘shash arizasi nusxasi","Bo‘shatish buyrug‘i","Oxirgi hisob varaqasi","Bank ko‘chirmasi","Talabnoma nusxasi","Yozishmalar"],
  fields=labor_fields(True),
  docs=[
    doc("employer","Ish beruvchiga", EMP_TO, "TALABNOMA", [INTRO_PAST, CALC_P],
        ["men bilan 3 kun ichida to‘liq hisob-kitob qilishni[?amount] ({{amount}})[/];","mehnat daftarchasini (elektron ko‘chirmani) va bo‘shatish buyrug‘i ko‘chirmasini berishni;","MK 333-moddasi bo‘yicha kechiktirish kompensatsiyasini to‘lashni."],
        ["Mehnat shartnomasi nusxasi"], askLabel="Talab qilaman:", closing=EMP_CLOSE),
    doc("inspection","Mehnat inspeksiyasiga", INSP_TO, "ARIZA", [INTRO_PAST, CALC_P],
        INSP_ASKS("hisob-kitob va mehnat daftarchasini berish yuzasidan majburiy ko‘rsatma berishni;"), INSP_ATT,
        sub="ish beruvchi tomonidan mehnat qonunchiligi buzilganligi to‘g‘risida"),
    doc("court","Sudga", COURT_TO(), "DA’VO ARIZASI", [INTRO_PAST, CALC_P, COURT_FEE],
        ["javobgardan mening foydamga {{amount}} miqdoridagi qarzni undirishni;","javobgardan MK 333-moddasiga muvofiq to‘lov kechiktirilgan har bir kun uchun pulli kompensatsiyani undirishni;","javobgarni mehnat daftarchasini berishga majburlashni."],
        COURT_ATT + ["Bank ko‘chirmasi yoki ish haqi hisob varaqasi"], sub="bo‘shatishda tegishli to‘lovlar va kompensatsiyani undirish to‘g‘risida", askLabel="Yuqoridagilarga asosan, so‘rayman:")
  ])

# ===== ISTE’MOLCHI =====
SELL = "Sotuvchi va tovar"
cons_fields = lambda extra: [
  F("seller","Sotuvchi (do‘kon, MChJ yoki YaTT)","sotuvchi nomi", group=SELL, hint="«Texnomart» MChJ"),
  F("sellerAddress","Sotuvchi manzili","sotuvchi manzili", group=SELL),
  F("product","Tovar (nomi, modeli)","tovar nomi", group=SELL, hint="Samsung muzlatkich RB-34"),
  F("price","Tovar narxi, so‘m","narxi","money", group=SELL, calc=True),
  *extra,
  F("district","Tuman yoki shahar","tuman/shahar", group=SELL, docs=["agency","court"], hint="Yunusobod tumani")
]
AGENCY_TO = ["Raqobatni rivojlantirish va iste’molchilar huquqlarini himoya qilish qo‘mitasining {{district}} bo‘yicha hududiy boshqarmasiga", "fuqaro {{applicant}} dan"]
DEF_P1 = "{{trigger}}da {{seller}}dan {{product}}ni[?price] {{price}}ga[/] sotib oldim. Tovarda quyidagi nuqson aniqlandi: {{defect}}."
DEF_P2 = "Iste’molchilarning huquqlarini himoya qilish to‘g‘risidagi qonunning 13-moddasiga ko‘ra nuqsonli tovar sotilganda iste’molchi o‘z xohishiga qarab tovarni almashtirib berishni, nuqsonni bepul bartaraf etishni, narxni mutanosib kamaytirishni yoki shartnomani bekor qilib, to‘langan pulni qaytarishni talab qilishga haqli. Qonunning 14 va 15-moddalariga ko‘ra talab bajarilishi kechiktirilgan har bir kun uchun tovar narxining 1 foizi miqdorida penya to‘lanadi."
DEF_P3 = "[?demandDate]{{demandDate}}da sotuvchiga yozma talab qo‘ydim, biroq talabim qonunda belgilangan muddatda bajarilmadi.[/]"
CONS_CLOSE = "Talabim qondirilmagan taqdirda Raqobatni rivojlantirish va iste’molchilar huquqlarini himoya qilish qo‘mitasiga va sudga murojaat qilishimni ma’lum qilaman."
DEMAND_OPTS = [
  {"v":"replace","text":"Almashtirib berish","doc":"tovarni ayni shunday tovarga almashtirib berishni","court":"javobgarni tovarni ayni shunday tovarga almashtirib berishga majburlashni"},
  {"v":"repair","text":"Bepul ta’mirlash","doc":"tovardagi nuqsonni bepul bartaraf etishni","court":"javobgarni tovardagi nuqsonni bepul bartaraf etishga majburlashni"},
  {"v":"discount","text":"Narxni kamaytirish","doc":"tovar narxini mutanosib ravishda kamaytirishni","court":"tovar narxini mutanosib kamaytirib, ortiqcha to‘langan summani javobgardan undirishni"},
  {"v":"refund","text":"Pulni qaytarish","doc":"shartnomani bekor qilib, to‘langan pulni qaytarishni","court":"shartnomani bekor qilib, javobgardan to‘langan pulni undirishni"}
]
scen(id="nuqsonli_tovar", domain="istemol", title="Sifatsiz tovar sotishdi", card="Tovar buzuq chiqdi, sotuvchi almashtirmayapti yoki pulni qaytarmayapti", short="Sifatsiz tovar",
  lead="Nuqsonli tovar uchun almashtirish, bepul ta’mirlash, narxni kamaytirish yoki pulni qaytarishni o‘zingiz tanlaysiz. Almashtirish talabi 7 kunda bajarilishi shart, kechikkan har kun uchun narxning 1 foizi penya to‘lanadi.",
  keywords=["sifatsiz","nuqson","buzuq","buzilib","ishlamay","brak","kafolat","garantiya","ta’mir","remont","servis","do‘kon","sotuvchi","sotib oldim","xarid"],
  norms=["ihq13","ihq14","ihq15","ihq16","ihq22","ihq23","ihq29"],
  deadline={"months":6, "label":"Talab qo‘yish uchun qoldi", "note":"Kafolat muddati bo‘lsa, kafolat davomida; bo‘lmasa xariddan 6 oy."}, trigger="Xarid sanasi",
  calc={"type":"consumerPenalty"}, partyField="seller", amountField="price",
  steps=[{"org":"Sotuvchi","t":"Yozma talabnoma bering","when":"Bugun","body":"Chek yoki boshqa xarid dalilini ilova qiling, nima talab qilishingizni aniq yozing. Chek yo‘qligi rad etish uchun asos emas."},
         {"org":"Iste’molchilar qo‘mitasi","t":"Bajarilmasa, shikoyat qiling","when":"7 kundan keyin","body":"Raqobat va iste’molchilar qo‘mitasining hududiy boshqarmasiga ariza. Tekshiruv bepul."},
         {"org":"Sud","t":"Pul, penya va zararni undiring","when":"Kerak bo‘lsa","body":"Fuqarolik sudiga da’vo; ma’naviy zararni ham so‘rash mumkin (22-modda)."}],
  evidence=["Chek yoki to‘lov kvitansiyasi","Kafolat taloni yoki texnik pasport","Nuqson fotosurati yoki videosi","Sotuvchiga berilgan talabnoma nusxasi","Servis markazi xulosasi","Sotuvchi bilan yozishmalar"],
  fields=cons_fields([
    F("defect","Nuqson nimada","nuqson tavsifi","textarea", group=SELL, hint="2 haftadan keyin sovutmay qoldi"),
    F("demand","Nima talab qilasiz","talab","select", group=SELL, options=DEMAND_OPTS),
    F("demandDate","Sotuvchiga talab qo‘ygan sanangiz","talab sanasi","date", group=SELL, docs=["agency","court"], calc=True, hint="Hali talab qo‘ymagan bo‘lsangiz, bo‘sh qoldiring")
  ]),
  docs=[
    doc("seller","Sotuvchiga", ["{{seller}} rahbariga","manzil: {{sellerAddress}}","xaridor {{applicant}} dan"], "TALABNOMA", [DEF_P1, DEF_P2],
        ["{{demand}};","talabim muddatida bajarilmasa, kechiktirilgan har bir kun uchun tovar narxining 1 foizi miqdorida penya to‘lashni."],
        ["Chek (to‘lov hujjati) nusxasi"], sub="nuqsonli tovar to‘g‘risida", askLabel="Talab qilaman:", closing=CONS_CLOSE),
    doc("agency","Iste’molchilar qo‘mitasiga", AGENCY_TO, "ARIZA", [DEF_P1, DEF_P3, DEF_P2],
        ["sotuvchi {{seller}} faoliyatida iste’molchilar huquqlari to‘g‘risidagi qonunchilikka rioya etilishini tekshirishni;","sotuvchiga mening qonuniy talabimni bajarish yuzasidan ko‘rsatma berishni;","qonunbuzarlik uchun belgilangan choralarni ko‘rishni."],
        ["Chek nusxasi","Sotuvchiga berilgan talabnoma nusxasi"], sub="iste’molchi huquqlari buzilganligi to‘g‘risida"),
    doc("court","Sudga", ["{{district}} fuqarolik ishlari bo‘yicha tumanlararo sudiga","Da’vogar: {{applicant}}","Javobgar: {{seller}}, manzil: {{sellerAddress}}"], "DA’VO ARIZASI",
        [DEF_P1, DEF_P3, DEF_P2, "Qonunning 22-moddasiga ko‘ra iste’molchiga yetkazilgan ma’naviy zarar uchun haq to‘lanadi, uning miqdorini sud belgilaydi."],
        ["{{demandCourt}};","javobgardan talab bajarilmagan har bir kun uchun tovar narxining 1 foizi miqdorida penya undirishni;","javobgardan ma’naviy zarar kompensatsiyasini undirishni."],
        ["Da’vo arizasining javobgar uchun nusxasi","Pasport nusxasi","Chek nusxasi","Sotuvchiga berilgan talabnoma nusxasi"], sub="iste’molchi huquqlarini himoya qilish to‘g‘risida", askLabel="Yuqoridagilarga asosan, so‘rayman:")
  ])

RET_P1 = "{{trigger}}da {{seller}}dan {{product}}ni[?price] {{price}}ga[/] sotib oldim. Tovar menga o‘lchami, shakli, rangi yoki boshqa xususiyati bo‘yicha mos kelmadi. Tovar ishlatilmagan, tashqi ko‘rinishi, yorliqlari va qadog‘i saqlangan."
RET_P2 = "Iste’molchilarning huquqlarini himoya qilish to‘g‘risidagi qonunning 18-moddasiga ko‘ra iste’molchi maqbul sifatli nooziq-ovqat tovarini xarid qilgan kunidan e’tiboran o‘n kun ichida ayni shunday tovarga almashtirishga, bunday tovar bo‘lmaganda esa to‘langan pulni qaytarib olishga haqli. «Almashtirilmaydi» yozuvi bu huquqni cheklamaydi."
scen(id="tovar_qaytarish", domain="istemol", title="Tovarni qaytarib olishmayapti", card="Mos kelmadi (o‘lchami, rangi), lekin do‘kon almashtirmayapti", short="Tovarni qaytarish",
  lead="Sifatli, lekin sizga mos kelmagan nooziq-ovqat tovarini xariddan 10 kun ichida almashtirish mumkin. Bir xil tovar bo‘lmasa, pul qaytariladi. «Qaytarilmaydi» yozuvi bu huquqni bekor qilmaydi.",
  keywords=["qaytarib olmay","qaytarib olishmay","almashtirmay","almashtirib bermay","o‘lcham","razmer","rangi","mos kelmadi","to‘g‘ri kelmadi","qaytarilmaydi","kiyim","poyabzal","oyoq kiyim"],
  norms=["ihq18","ihq23","ihq29"],
  deadline={"days":10, "label":"Almashtirish uchun qoldi"}, trigger="Xarid sanasi",
  calc=None, partyField="seller", amountField="price",
  steps=[{"org":"Sotuvchi","t":"Tovarni chek bilan olib boring","when":"{deadline} gacha","hot":True,"body":"Tovar ishlatilmagan, yorlig‘i va qadog‘i saqlangan bo‘lsin. Rad etishsa, yozma talabnoma bering."},
         {"org":"Iste’molchilar qo‘mitasi","t":"Rad etilsa, shikoyat qiling","when":"Rad javobidan keyin","body":"Raqobat va iste’molchilar qo‘mitasining hududiy boshqarmasiga ariza."},
         {"org":"Sud","t":"Pulni undiring","when":"Kerak bo‘lsa","body":"Fuqarolik sudiga da’vo."}],
  evidence=["Chek","Tovar yorlig‘i va qadog‘i","Rad javobi (yozma yoki video)","Sotuvchi bilan yozishmalar"],
  fields=cons_fields([]),
  docs=[
    doc("seller","Sotuvchiga", ["{{seller}} rahbariga","manzil: {{sellerAddress}}","xaridor {{applicant}} dan"], "TALABNOMA", [RET_P1, RET_P2],
        ["tovarni ayni shunday tovarga almashtirib berishni yoki, bunday tovar bo‘lmasa, to‘langan [?price]{{price}}ni[/][!price]pulni[/] qaytarishni."],
        ["Chek (to‘lov hujjati) nusxasi"], sub="maqbul sifatli tovarni almashtirish to‘g‘risida", askLabel="Talab qilaman:", closing=CONS_CLOSE),
    doc("agency","Iste’molchilar qo‘mitasiga", AGENCY_TO, "ARIZA", [RET_P1, "Sotuvchi tovarni almashtirishni yoki pulni qaytarishni rad etdi.", RET_P2],
        ["sotuvchi {{seller}} faoliyatida iste’molchilar huquqlari to‘g‘risidagi qonunchilikka rioya etilishini tekshirishni;","sotuvchiga tovarni almashtirish yoki pulni qaytarish yuzasidan ko‘rsatma berishni."],
        ["Chek nusxasi"], sub="iste’molchi huquqlari buzilganligi to‘g‘risida")
  ])

# ===== OILA =====
FAM = "Ikkinchi ota-ona va bolalar"
scen(id="aliment", domain="oila", title="Aliment undirish kerak", card="Ikkinchi ota-ona bolaga ta’minot bermayapti", short="Aliment",
  lead="Ota-ona voyaga yetmagan bolasini ta’minlashi shart. Sud daromadning bir bola uchun 1/4, ikki bola uchun 1/3, uch va undan ortiq bola uchun 1/2 qismini undiradi. Ariza uchun davlat boji to‘lanmaydi.",
  keywords=["aliment","alement","bolaga pul","bolalarimga","bolamga","ta’minot","ajrashdik","ajrashgan","sobiq erim","sobiq turmush","otasi pul bermay","farzandim"],
  norms=["ok96","ok99","ok136","ok12","dbq8"],
  deadline={"none":True, "label":"Murojaat muddati", "note":"Aliment uchun da’vo muddati yo‘q, lekin aliment odatda sudga murojaat qilingan kundan undiriladi. Har kechikkan oy — yo‘qotilgan pul."},
  trigger="Ta’minot to‘xtagan sana",
  calc={"type":"alimony"}, partyField="respondent", amountField="income",
  steps=[{"org":"Ixtiyoriy","t":"Kelishuvga urinib ko‘ring","when":"Ixtiyoriy","body":"Notarial tasdiqlangan aliment kelishuvi ijro hujjati kuchiga ega."},
         {"org":"Sud","t":"Sudga ariza bering","when":"Imkon qadar tez","hot":True,"body":"Javobgar yoki o‘zingiz yashaydigan joydagi fuqarolik ishlari sudiga. Davlat boji to‘lanmaydi; elektron topshirish ham mumkin."},
         {"org":"Majburiy ijro byurosi","t":"To‘lanmasa, ijroga bering","when":"Sud qaroridan keyin","body":"Aliment javobgarning ish haqidan ushlab qolinadi."}],
  evidence=["Bolaning tug‘ilganlik guvohnomasi","Nikoh yoki ajrim guvohnomasi","Pasport nusxasi","Javobgarning ish joyi yoki daromadi haqida ma’lumot","Bola siz bilan yashashini tasdiqlovchi ma’lumotnoma"],
  fields=[
    F("respondent","Ikkinchi ota-ona (javobgar) F.I.Sh.","javobgar F.I.Sh.", group=FAM),
    F("respAddress","Javobgar manzili","javobgar manzili", group=FAM),
    F("respWork","Javobgarning ish joyi (bilsangiz)","ish joyi", group=FAM),
    F("children","Bolalar soni","bolalar soni","int", group=FAM, min=1, max=15, calc=True),
    F("childrenNames","Bolalarning ismi va tug‘ilgan sanasi","bolalar ismi va tug‘ilgan sanasi","textarea", group=FAM, hint="Aziza, 12.03.2019; Bobur, 05.07.2021"),
    F("income","Javobgarning oylik daromadi (taxminan), so‘m","daromad","money", group=FAM, calc=True, docs=[]),
    F("district","Tuman yoki shahar","tuman/shahar", group=FAM, hint="Denov tumani")
  ],
  docs=[
    doc("court","Sudga", ["{{district}} fuqarolik ishlari bo‘yicha tumanlararo sudiga","Da’vogar: {{applicant}}","Javobgar: {{respondent}}, manzil: {{respAddress}}[?respWork], ish joyi: {{respWork}}[/]"], "DA’VO ARIZASI",
        ["Men va javobgar {{respondent}} voyaga yetmagan farzand(lar)ning ota-onasimiz: {{childrenNames}}. Farzand(lar) men bilan birga yashaydi va mening qaramog‘imda.",
         "{{trigger}}dan boshlab javobgar farzand(lar)ni moddiy ta’minlashda ishtirok etmayapti, aliment to‘lash to‘g‘risida kelishuv tuzilmagan.",
         "Oila kodeksining 96-moddasiga ko‘ra ota-ona voyaga yetmagan bolalariga ta’minot berishi shart. Kodeksning 99-moddasiga muvofiq aliment ota-onaning ish haqi va boshqa daromadidan bir bola uchun to‘rtdan bir, ikki bola uchun uchdan bir, uch va undan ortiq bola uchun yarmi miqdorida undiriladi.",
         "Aliment undirish to‘g‘risidagi da’volar bo‘yicha da’vogar davlat bojidan ozod qilinadi."],
        ["javobgar {{respondent}}dan {{children}} nafar voyaga yetmagan farzand uchun ish haqi va boshqa daromadining {{share}} miqdorida, farzandlar voyaga yetgunga qadar har oy aliment undirishni;","alimentni da’vo arizasi berilgan kundan boshlab undirishni."],
        ["Da’vo arizasining javobgar uchun nusxasi","Pasport nusxasi","Bola(lar)ning tug‘ilganlik guvohnomasi nusxasi"],
        sub="voyaga yetmagan bolalar uchun aliment undirish to‘g‘risida", askLabel="Yuqoridagilarga asosan, so‘rayman:")
  ])

# ===== DAVLAT IDORALARI =====
GOV = "Murojaat"
APP_P1 = "Men {{trigger}}da {{agency}}ga[?regNumber] (kiruvchi raqam: {{regNumber}})[/] quyidagi masala bo‘yicha murojaat qildim: {{appealSubject}}."
APP_P2 = "«Jismoniy va yuridik shaxslarning murojaatlari to‘g‘risida»gi Qonunning 28-moddasiga ko‘ra murojaatlar kelib tushgan kundan e’tiboran 15 kun ichida, qo‘shimcha o‘rganish talab etilganda esa bir oygacha muddatda ko‘rib chiqilishi kerak. Biroq hozirgacha murojaatim mazmunan ko‘rib chiqilmagan va menga javob berilmagan."
scen(id="murojaat_javobsiz", domain="davlat", title="Davlat idorasi javob bermayapti", card="Murojaatimga muddatida javob berilmadi", short="Javobsiz murojaat",
  lead="Murojaat 15 kunda, qo‘shimcha o‘rganish kerak bo‘lsa 1 oygacha ko‘rib chiqilishi shart. Javob bo‘lmasa, yuqori turuvchi organga yoki ma’muriy sudga shikoyat qilasiz.",
  keywords=["murojaat","javob bermay","javob bermadi","javob kelmadi","hokimlik","hokimiyat","idora","ariza berdim","ariza yozgandim","e’tiborsiz","rasmiyatchilik","qabulxona","ko‘rib chiqmay"],
  norms=["mq28","mq36","mq6","mq5","msk6","mq38"],
  deadline={"months":6, "offsetDays":15, "label":"Ma’muriy sudga murojaat uchun qoldi", "note":"Javob muddati (15 kun) o‘tgan kundan 6 oy."}, trigger="Murojaat topshirilgan sana",
  calc=None, partyField="agency",
  steps=[{"org":"Idora","t":"Javob muddatini kuting","when":"{t+15} gacha","body":"Kiruvchi raqam bo‘yicha murojaat holatini so‘rang. Rahbar muddatni uzaytirsa, sizga xabar berishi shart."},
         {"org":"Yuqori turuvchi organ","t":"Shikoyat yozing","when":"Muddat o‘tgach","body":"Masalan, tuman hokimligi ustidan viloyat hokimligiga. Birinchi murojaat nusxasini ilova qiling."},
         {"org":"Xalq qabulxonasi","t":"Muqobil yo‘l","when":"Istalgan payt","body":"Prezidentning virtual qabulxonasi, 1000 qisqa raqamiga SMS yoki 0-800-210-00-00 telefoni orqali."},
         {"org":"Ma’muriy sud","t":"Harakatsizlik ustidan sudga","when":"{deadline} gacha","hot":True,"body":"Sud idorani murojaatni ko‘rib chiqishga majburlashi mumkin. Jismoniy shaxslar ariza berishda davlat boji to‘lamaydi."}],
  evidence=["Murojaat nusxasi (kiruvchi raqam bilan)","Yuborilganini tasdiqlovchi hujjat (pochta kvitansiyasi yoki elektron tasdiq)","Olingan javob (bo‘lsa)","Idora bilan yozishmalar"],
  fields=[
    F("agency","Murojaat qilgan idora","idora nomi", group=GOV, hint="Denov tumani hokimligi"),
    F("regNumber","Kiruvchi raqam (bo‘lsa)","kiruvchi raqam", group=GOV),
    F("appealSubject","Murojaatingiz nima haqida edi","murojaat mazmuni","textarea", group=GOV, hint="Mahallamizdagi yo‘lni ta’mirlash"),
    F("higherAgency","Yuqori turuvchi organ","yuqori organ", group=GOV, docs=["higher"], hint="Surxondaryo viloyati hokimligi"),
    F("district","Tuman yoki shahar","tuman/shahar", group=GOV, docs=["court"], hint="Denov tumani")
  ],
  docs=[
    doc("higher","Yuqori organga", ["{{higherAgency}}ga","fuqaro {{applicant}} dan"], "SHIKOYAT", [APP_P1, APP_P2],
        ["murojaatim ko‘rib chiqilmaganligi holatini o‘rganishni;","{{agency}}ga murojaatimni qonunda belgilangan muddatda mazmunan ko‘rib chiqish yuzasidan ko‘rsatma berishni;","aybdor mansabdor shaxslarga nisbatan qonunda belgilangan choralarni ko‘rishni."],
        ["Murojaat nusxasi","Murojaat yuborilganini tasdiqlovchi hujjat"], sub="murojaat ko‘rib chiqilmaganligi to‘g‘risida"),
    doc("court","Ma’muriy sudga", ["{{district}} tumanlararo ma’muriy sudiga","Arizachi: {{applicant}}","Javobgar: {{agency}}"], "ARIZA",
        [APP_P1, APP_P2, "Ma’muriy organning harakatsizligi ustidan huquq buzilganligi ma’lum bo‘lgan kundan e’tiboran olti oy ichida ma’muriy sudga murojaat qilish mumkin; bu muddat o‘tkazib yuborilmagan."],
        ["{{agency}}ning murojaatimni ko‘rib chiqmaslik bilan bog‘liq harakatsizligini qonunga xilof deb topishni;","javobgarni murojaatimni mazmunan ko‘rib chiqib, yozma javob berishga majburlashni."],
        ["Ariza nusxasi (javobgar uchun)","Pasport nusxasi","Murojaat nusxasi","Murojaat yuborilganini tasdiqlovchi hujjat"],
        sub="ma’muriy organning harakatsizligini qonunga xilof deb topish to‘g‘risida", askLabel="Yuqoridagilarga asosan, so‘rayman:")
  ])

scen(id="organ_qarori", domain="davlat", title="Davlat organining qarori huquqimni buzdi", card="Hokimlik yoki boshqa organ noqonuniy qaror chiqardi yoki rad etdi", short="Noqonuniy qaror",
  lead="Davlat organi yoki mansabdor shaxsning qarori, harakati yoki harakatsizligi ustidan huquq buzilganini bilgan kundan 6 oy ichida ma’muriy sudga murojaat qilish mumkin. Uzrli sabab bo‘lsa, sud muddatni tiklashi mumkin.",
  keywords=["qaror chiqar","noqonuniy qaror","hokim qarori","rad etdi","rad javobi","ruxsat bermay","ruxsatnoma","litsenziya","bekor qildi","ma’muriy sud","buzib tashla","buzish","snos","yer ajrat","kadastr"],
  norms=["msk6","msk_tikla","mq36"],
  deadline={"months":6, "label":"Ma’muriy sudga murojaat uchun qoldi"}, trigger="Qaror haqida bilgan sanangiz",
  calc=None, partyField="agency",
  steps=[{"org":"Organ","t":"Qaror nusxasini yozma so‘rang","when":"Darhol","body":"Qaror nusxasi sudga ilova qilinadi. Uni olgan sanani yozib qo‘ying."},
         {"org":"Yuqori organ","t":"Shikoyat (ixtiyoriy)","when":"Parallel","body":"Javobni kutib, sud muddatini o‘tkazib yubormang."},
         {"org":"Ma’muriy sud","t":"Qarorni haqiqiy emas deb topishni so‘rang","when":"{deadline} gacha","hot":True,"body":"Zarur bo‘lsa, qaror ijrosini vaqtincha to‘xtatishni ham so‘rang."}],
  evidence=["Nizolashilayotgan qaror nusxasi","Qaror sizga qachon ma’lum bo‘lganini tasdiqlovchi hujjat","Huquqingizni tasdiqlovchi hujjatlar (kadastr, shartnoma va h.k.)","Organ bilan yozishmalar"],
  fields=[
    F("agency","Qaror chiqargan organ","organ nomi", group="Qaror", hint="Denov tumani hokimligi"),
    F("decisionTitle","Qaror (nomi, raqami, sanasi)","qaror nomi va raqami", group="Qaror", hint="2026-yil 10-oktabrdagi 245-son qaror"),
    F("violation","Qaror qanday huquqingizni buzdi","buzilgan huquq","textarea", group="Qaror"),
    F("district","Tuman yoki shahar","tuman/shahar", group="Qaror", hint="Denov tumani")
  ],
  docs=[
    doc("court","Ma’muriy sudga", ["{{district}} tumanlararo ma’muriy sudiga","Arizachi: {{applicant}}","Javobgar: {{agency}}"], "ARIZA",
        ["{{agency}} tomonidan {{decisionTitle}} qabul qilingan. Men bu haqda {{trigger}}da xabar topdim.",
         "Mazkur qaror mening quyidagi huquq va qonuniy manfaatlarimni buzadi: {{violation}}.",
         "Ma’muriy organning qarori ustidan huquq buzilganligi ma’lum bo‘lgan kundan e’tiboran olti oy ichida ma’muriy sudga murojaat qilish mumkin. Mazkur muddat {{deadline}}da tugaydi."],
        ["{{decisionTitle}}ni haqiqiy emas (qonunga xilof) deb topishni;","buzilgan huquqlarimni tiklashni;","zarur bo‘lsa, ish bo‘yicha qaror chiqarilguniga qadar nizolashilayotgan hujjat ijrosini to‘xtatib turishni."],
        ["Ariza nusxasi (javobgar uchun)","Pasport nusxasi","Nizolashilayotgan qaror nusxasi"],
        sub="ma’muriy hujjatni haqiqiy emas deb topish to‘g‘risida", askLabel="Yuqoridagilarga asosan, so‘rayman:")
  ])

# ===== JARIMA =====
FINE = "Jarima"
FINE_P1 = "{{organ}} tomonidan[?decisionNumber] {{decisionNumber}}-son[/] qaror bilan menga nisbatan[?fine] {{fine}} miqdorida[/] ma’muriy jarima qo‘llanilgan. Qaror nusxasini {{trigger}}da oldim."
FINE_P2 = "Men ushbu qarorga quyidagi asoslarga ko‘ra rozi emasman: {{reason}}."
FINE_P3 = "Ma’muriy huquqbuzarlik to‘g‘risidagi ish bo‘yicha qarorga qaror nusxasi olingan kundan e’tiboran o‘n kun ichida shikoyat qilinishi mumkin. Shikoyat muddati o‘tkazib yuborilmagan."
scen(id="jarima", domain="jarima", title="Jarimaga rozi emasman", card="YHXB, inspeksiya yoki boshqa organ noto‘g‘ri jarima soldi", short="Jarima",
  lead="Jarima to‘g‘risidagi qaror ustidan qaror nusxasini olgan kundan 10 kun ichida shikoyat qilish mumkin. Diqqat: shikoyat qilsangiz, tez to‘lash chegirmasi (50 yoki 70 foiz) qo‘llanmaydi.",
  keywords=["jarima","shtraf","yhxb","gai","radar","kamera","bayonnoma","protokol","yo‘l harakati","tezlik","to‘xtash","parkovka"],
  norms=["mjtk_shik","mjtk332","yhxx_el"],
  deadline={"days":10, "label":"Shikoyat berish uchun qoldi"}, trigger="Jarima qarorini olgan sana",
  calc={"type":"fineDiscount"}, partyField="organ", amountField="fine",
  steps=[{"org":"Organ","t":"Qaror nusxasini oling","when":"Darhol","body":"Shikoyat muddati qaror nusxasi olingan kundan boshlanadi."},
         {"org":"Tanlov","t":"Shikoyat yoki chegirma","when":"Hozir hal qiling","body":"Jarima to‘g‘ri bo‘lsa, 15 kun ichida yarmini to‘lab qutulish mumkin. Shikoyat qilinsa, chegirma qo‘llanmaydi."},
         {"org":"Yuqori organ yoki sud","t":"Shikoyat bering","when":"{deadline} gacha","hot":True,"body":"Yuqori turuvchi organga yoki jinoyat ishlari bo‘yicha tuman (shahar) sudiga. YHXX jarimasi bo‘lsa, my.gov.uz orqali elektron shikoyat qilish mumkin."}],
  evidence=["Jarima qarori yoki bayonnoma nusxasi","Foto yoki video (videoregistrator)","Guvohlar","Qoidabuzarlik bo‘lmaganini tasdiqlovchi hujjatlar","Yozishmalar"],
  fields=[
    F("organ","Jarima solgan organ","organ nomi", group=FINE, hint="Toshkent sh. YHXB"),
    F("decisionNumber","Qaror yoki bayonnoma raqami","qaror raqami", group=FINE),
    F("fine","Jarima summasi, so‘m","jarima summasi","money", group=FINE, calc=True),
    F("reason","Nega jarima noto‘g‘ri","shikoyat asosi","textarea", group=FINE, hint="Belgi ko‘rinmas edi, videoda ko‘rinadi"),
    F("higherOrgan","Yuqori turuvchi organ","yuqori organ", group=FINE, docs=["higher"], hint="IIV YHXB bosh boshqarmasi"),
    F("district","Tuman yoki shahar","tuman/shahar", group=FINE, docs=["court"], hint="Mirobod tumani")
  ],
  docs=[
    doc("higher","Yuqori organga", ["{{higherOrgan}}ga","fuqaro {{applicant}} dan"], "SHIKOYAT", [FINE_P1, FINE_P2, FINE_P3],
        ["{{organ}}ning qarorini bekor qilishni va ish yuritishni tugatishni;","ishni to‘liq va xolis qayta o‘rganishni."],
        ["Qaror (bayonnoma) nusxasi","Dalillar (foto, video) nusxasi"], sub="ma’muriy huquqbuzarlik to‘g‘risidagi ish bo‘yicha qarorga"),
    doc("court","Sudga", ["{{district}} jinoyat ishlari bo‘yicha sudiga","Shikoyatchi: {{applicant}}","Qaror chiqargan organ: {{organ}}"], "SHIKOYAT", [FINE_P1, FINE_P2, FINE_P3],
        ["{{organ}}ning qarorini bekor qilishni va ma’muriy huquqbuzarlik to‘g‘risidagi ish yuritishni tugatishni."],
        ["Shikoyat nusxasi","Qaror (bayonnoma) nusxasi","Dalillar (foto, video) nusxasi"], sub="ma’muriy huquqbuzarlik to‘g‘risidagi ish bo‘yicha qarorga", askLabel="Yuqoridagilarga asosan, so‘rayman:")
  ])

# ===== QARZ =====
DEBT = "Qarz"
DEBT_P1 = "{{loanDate}}da men {{debtor}}ga {{amount}} miqdorida qarz berganman. Buni {{proof}} tasdiqlaydi. Qarzni qaytarish muddati {{trigger}}da kelgan, biroq qarz hozirgacha qaytarilmagan."
DEBT_P2 = "Fuqarolik kodeksining 732-moddasiga ko‘ra qarz oluvchi olgan pul summasini qarz beruvchiga qaytarishi shart; qaytarish muddati belgilanmagan bo‘lsa, qarz beruvchi talab qilgan vaqtda qaytarilishi kerak."
scen(id="qarz", domain="fuqarolik", title="Qarzimni qaytarishmayapti", card="Qarzga bergan pulimni qaytarishmayapti", short="Qarz",
  lead="Qarz muddati kelib qaytarilmasa, avval yozma talab qilasiz, keyin sudga murojaat qilasiz. Umumiy da’vo muddati 3 yil.",
  keywords=["qarzga ber","qarzimni","qarzni qaytar","qarzdor","tilxat","raspiska","pulimni qaytar","qarz olgan","qarz bergan","qaytarmayapti","qaytarmay"],
  norms=["fk732","fk150"],
  deadline={"years":3, "label":"Da’vo muddati tugashiga qoldi"}, trigger="Qarz qaytarilishi kerak bo‘lgan sana",
  calc=None, partyField="debtor", amountField="amount",
  steps=[{"org":"Qarzdor","t":"Yozma talabnoma yuboring","when":"Bugun","body":"Pochta orqali xabarnoma bilan. Muddat belgilanmagan bo‘lsa, talab qilingan sana muhim."},
         {"org":"Sud","t":"Qarzni sud orqali undiring","when":"{deadline} gacha","hot":True,"body":"Fuqarolik sudiga da’vo. Davlat boji to‘lanadi, miqdori da’vo summasiga bog‘liq."},
         {"org":"Majburiy ijro byurosi","t":"Qaror ijrosi","when":"Sud qaroridan keyin","body":"To‘lanmasa, sud hujjati majburiy ijroga yuboriladi."}],
  evidence=["Tilxat (raspiska)","Bank o‘tkazmasi ko‘chirmasi","Yozishmalar va ovozli xabarlar","Talabnoma va pochta kvitansiyasi","Guvohlar"],
  fields=[
    F("debtor","Qarzdor F.I.Sh.","qarzdor F.I.Sh.", group=DEBT),
    F("debtorAddress","Qarzdor manzili","qarzdor manzili", group=DEBT),
    F("amount","Qarz summasi, so‘m","qarz summasi","money", group=DEBT),
    F("loanDate","Qarz bergan sanangiz","qarz berilgan sana","date", group=DEBT),
    F("proof","Qarzni nima tasdiqlaydi","dalil", group=DEBT, hint="tilxat, bank o‘tkazmasi, yozishmalar"),
    F("district","Tuman yoki shahar","tuman/shahar", group=DEBT, docs=["court"], hint="Denov tumani")
  ],
  docs=[
    doc("debtor","Qarzdorga", ["{{debtor}}ga","manzil: {{debtorAddress}}","{{applicant}} dan"], "TALABNOMA", [DEBT_P1, DEBT_P2],
        ["{{amount}} miqdoridagi qarzni ushbu talabnoma olingan kundan e’tiboran 10 kun ichida qaytarishni."],
        ["Qarzni tasdiqlovchi hujjat nusxasi"], sub="qarzni qaytarish to‘g‘risida", askLabel="Talab qilaman:",
        closing="Qarz qaytarilmagan taqdirda qarz summasi va sud xarajatlarini undirish uchun sudga murojaat qilishimni ma’lum qilaman."),
    doc("court","Sudga", ["{{district}} fuqarolik ishlari bo‘yicha tumanlararo sudiga","Da’vogar: {{applicant}}","Javobgar: {{debtor}}, manzil: {{debtorAddress}}","Da’vo summasi: {{amount}}"], "DA’VO ARIZASI",
        [DEBT_P1, DEBT_P2, "Fuqarolik kodeksining 150-moddasiga ko‘ra umumiy da’vo muddati uch yil bo‘lib, u o‘tkazib yuborilmagan."],
        ["javobgardan mening foydamga {{amount}} miqdoridagi qarzni undirishni;","javobgardan sud xarajatlarini undirishni."],
        ["Da’vo arizasining javobgar uchun nusxasi","Pasport nusxasi","Qarzni tasdiqlovchi hujjat nusxasi","Davlat boji to‘langanligi to‘g‘risidagi kvitansiya","Talabnoma nusxasi"],
        sub="qarzni undirish to‘g‘risida", askLabel="Yuqoridagilarga asosan, so‘rayman:")
  ])


# ---------- «Qanday topshiriladi» ----------
L_SUD = {"label":"Sudlarning interaktiv xizmatlari — my.sud.uz", "url":"https://my.sud.uz/"}
L_PM = {"label":"Prezidentning virtual qabulxonasi — pm.gov.uz", "url":"https://pm.gov.uz/"}
L_YHXX = {"label":"YHXX jarimasiga elektron shikoyat — my.gov.uz", "url":"https://my.gov.uz/oz/service/1054"}
HOW = {
  "private": {"steps":[
    "Arizani 2 nusxada chop eting va har ikkisini imzolang.",
    "Birinchi nusxani topshiring. Ikkinchisiga qabul qilgan shaxsning imzosi, sana va kiruvchi raqamni qo‘ydiring.",
    "Qabul qilishdan bosh tortsa, buyurtma xat orqali xabarnoma bilan yuboring va pochta kvitansiyasini saqlang.",
    "Topshirgan sanani yozib qo‘ying: keyingi muddatlar shu kundan hisoblanadi."], "links":[]},
  "state": {"steps":[
    "Shaxsan, pochta orqali yoki elektron shaklda yuboring: barcha shakllar teng kuchga ega (Murojaatlar to‘g‘risidagi qonun, 5-modda).",
    "Elektron yo‘l: idoraning rasmiy saytidagi virtual qabulxona yoki Prezidentning virtual qabulxonasi.",
    "Qog‘ozda topshirsangiz, ikkinchi nusxaga kiruvchi raqam va sanani qo‘ydiring.",
    "Javob 15 kun ichida, qo‘shimcha o‘rganish kerak bo‘lsa 1 oygacha berilishi kerak."], "links":[L_PM]},
  "court": {"steps":[
    "Arizani imzolang va ilovalarni qo‘shing. Qog‘ozda topshirilsa, ishda ishtirok etuvchi shaxslar soniga qarab nusxalar ilova qilinadi.",
    "Elektron yo‘l: sudlarning interaktiv xizmatlari portali orqali. Ariza holatini shaxsiy kabinetda kuzatasiz.",
    "Qog‘ozda: tegishli sud devonxonasiga shaxsan yoki pochta orqali."], "links":[L_SUD]},
  "fine": {"steps":[
    "Shikoyatni qaror nusxasi olingan kundan 10 kun ichida topshiring.",
    "YHXX jarimasi bo‘lsa, my.gov.uz orqali elektron shikoyat qilish mumkin: bepul, 5–10 ish kunida ko‘riladi.",
    "Shikoyat ko‘rib chiqilayotganda chegirma muddati to‘xtamaydi. Rad etilsa, jarima chegirmasiz to‘lanadi.",
    "Qog‘ozda topshirsangiz, ikkinchi nusxaga qabul belgisini qo‘ydiring."], "links":[L_YHXX]}
}
FEE = {
  "mehnat": "Mehnat nizolarida xodim sud xarajatlaridan ozod.",
  "aliment": "Aliment da’vosida davlat boji to‘lanmaydi.",
  "admin": "Jismoniy shaxslar ma’muriy sudga ariza berishda davlat boji to‘lamaydi; ariza rad etilsa, BHMning 70 foizi undiriladi.",
  "qarz": "Davlat boji to‘lanadi, miqdori da’vo summasiga bog‘liq. To‘lov kvitansiyasini ilova qiling."
}
for sc in S:
    for d in sc["docs"]:
        if sc["id"] == "jarima": kind = "fine"
        elif d["id"] in ("employer","seller","debtor"): kind = "private"
        elif d["id"] == "court": kind = "court"
        else: kind = "state"
        h = {"steps": list(HOW[kind]["steps"]), "links": list(HOW[kind]["links"])}
        if kind == "court":
            fee = FEE["admin"] if sc["domain"] == "davlat" else FEE["mehnat"] if sc["domain"] == "mehnat" else FEE["aliment"] if sc["id"] == "aliment" else FEE["qarz"] if sc["id"] == "qarz" else None
            if fee: h["steps"].append(fee)
        if sc["id"] == "jarima" and d["id"] == "court": h["links"] = []
        d["howto"] = h

APPLICANT = [F("fio","F.I.Sh.","F.I.Sh.", hint="Karimov Aziz Botirovich"), F("address","Yashash manzili","manzil", hint="Toshkent sh., Chilonzor t., …"), F("phone","Telefon","telefon","phone", hint="+998 90 123 45 67")]

# Tekshiruv: har bir holatdagi norma va shablon kalitlari mavjud
ids = {n["id"] for n in N}
import re
for s in S:
    for nid in s["norms"]: assert nid in ids, (s["id"], nid)
    keys = {f["k"] for f in s["fields"]} | {f["k"] for f in APPLICANT} | {"applicant","trigger","deadline","deadlineTerm","share","today"} | {f["k"] + "Court" for f in s["fields"] if f["type"] == "select"}
    for d in s["docs"]:
        text = json.dumps(d, ensure_ascii=False)
        for k in re.findall(r"\{\{(\w+)\}\}|\[[?!](\w+)\]", text):
            k = k[0] or k[1]
            assert k in keys, (s["id"], d["id"], k)
os.makedirs(OUT, exist_ok=True)
# Ruscha matnlar (kb_ru.py) va ruscha kalit so‘zlar
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kb_ru
for s_ in S: s_["keywords"] = s_["keywords"] + [k for k in kb_ru.KEYWORDS[s_["id"]] if k not in s_["keywords"]]
RU = kb_ru.build_ru(S)
assert set(RU["norms"]) == ids and set(RU["laws"]) == set(LAWS)
for name, data in (("ru", RU), ("laws", LAWS), ("domains", DOMAINS), ("norms", N), ("scenarios", S), ("applicant", APPLICANT)):
    with open(os.path.join(OUT, name + ".json"), "w", encoding="utf-8") as f: json.dump(data, f, ensure_ascii=False, indent=1)
print(len(N), "norma;", len(S), "holat;", len(DOMAINS), "soha")
