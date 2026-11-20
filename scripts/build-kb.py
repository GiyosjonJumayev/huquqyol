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
  "dbq":  {"name":"Davlat boji to‘g‘risidagi qonun", "full":"«Davlat boji to‘g‘risida»gi Qonun (O‘RQ-600, 06.01.2020)", "url":"https://lex.uz/docs/4680955"},
  "fk2":  {"name":"Fuqarolik kodeksi (II qism)", "full":"O‘zbekiston Respublikasining Fuqarolik kodeksi, ikkinchi qism (29.08.1996)", "url":"https://lex.uz/docs/180550"},
  "bank": {"name":"Banklar to‘g‘risidagi qonun", "full":"«Banklar va bank faoliyati to‘g‘risida»gi Qonun (O‘RQ-580 tahririda, 05.11.2019)", "url":"https://lex.uz/acts/12011"},
  "mfo":  {"name":"Mikromoliya faoliyati to‘g‘risidagi qonun", "full":"«Nobank kredit tashkilotlari va mikromoliya faoliyati to‘g‘risida»gi Qonun (O‘RQ-765, 20.04.2022)", "url":"https://lex.uz/acts/5972413"},
  "osgo": {"name":"OSGO to‘g‘risidagi qonun", "full":"«Transport vositalari egalarining fuqarolik javobgarligini majburiy sug‘urta qilish to‘g‘risida»gi Qonun (O‘RQ-155, 21.04.2008)", "url":"https://lex.uz/acts/1342476"},
  "pens": {"name":"Pensiya ta’minoti to‘g‘risidagi qonun", "full":"«Fuqarolarning davlat pensiya ta’minoti to‘g‘risida»gi Qonun (938-XII, 03.09.1993)", "url":"https://lex.uz/acts/112312"},
  "med":  {"name":"Mediatsiya to‘g‘risidagi qonun", "full":"«Mediatsiya to‘g‘risida»gi Qonun (O‘RQ-482, 03.07.2018)", "url":"https://lex.uz/docs/3805229"},
  "xab":  {"name":"Xususiy bandlik agentliklari to‘g‘risidagi qonun", "full":"«Xususiy bandlik agentliklari to‘g‘risida»gi Qonun (O‘RQ-501, 16.10.2018)", "url":"https://lex.uz/docs/3992894"}
}

DOMAINS = [
  {"id":"mehnat",    "title":"Mehnat",              "desc":"Ish haqi, ishdan bo‘shatish, ta’til"},
  {"id":"istemol",   "title":"Iste’molchi",         "desc":"Sifatsiz tovar, tovarni qaytarish"},
  {"id":"oila",      "title":"Oila",                "desc":"Bolalar uchun aliment"},
  {"id":"ijara",     "title":"Ijara va uy-joy",     "desc":"Garov puli, uydan chiqarish"},
  {"id":"kommunal",  "title":"Kommunal xizmatlar",  "desc":"Ortiqcha hisob, svet, gaz, suv"},
  {"id":"bank",      "title":"Bank va mikroqarz",   "desc":"Kartadan pul yechildi, ortiqcha foiz"},
  {"id":"transport", "title":"Yo‘l-transport",      "desc":"YHXX jarimasi, OSGO sug‘urtasi"},
  {"id":"nafaqa",    "title":"Pensiya va nafaqa",   "desc":"Pensiya yoki nafaqa rad etildi"},
  {"id":"davlat",    "title":"Davlat idoralari",    "desc":"Ariza va shikoyat, javobsiz murojaat, noqonuniy qaror"},
  {"id":"jarima",    "title":"Boshqa jarimalar",    "desc":"Inspeksiya va boshqa organlar jarimasi"},
  {"id":"migrant",   "title":"Mehnat migrantlari",  "desc":"Agentlik aldovi, xorijdagi muammo"},
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
norm("muddat","mk","560-modda","Sudga murojaat qilish muddatlari","Ishga tiklash bo‘yicha: bo‘shatish buyrug‘i ko‘chirmasi berilgan kundan 3 oy. Boshqa mehnat nizolari bo‘yicha: huquq buzilganini bilgan kundan 6 oy. Nizo mediatsiyada ko‘rilayotgan davrda muddat to‘xtab turadi.")
norm("m562","mk","562-modda","Xodimlarni sud xarajatlaridan ozod qilish","Xodimlar yakka tartibdagi mehnat nizolari bo‘yicha sudga murojaat qilganda sud xarajatlaridan ozod qilinadi.")
norm("sud","mk","558-modda","Bevosita sudda ko‘riladigan nizolar","Ishga tiklash, bo‘shatish sanasi yoki asosini o‘zgartirish, majburiy progul haqi bo‘yicha nizolar, shuningdek ish joyida mehnat nizolari komissiyasi bo‘lmasa, nizo to‘g‘ridan-to‘g‘ri sudda ko‘riladi.")
norm("med7","med","7-modda","Mediatsiyaning ixtiyoriyligi","Mediatsiya tomonlarning o‘zaro ixtiyoriy roziligi bilan qo‘llaniladi. Tomonlar mediatsiyadan uning istalgan bosqichida voz kechishi mumkin. Mediatsiya jarayonida yarashishga majburlash taqiqlanadi.")
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

# ---- Ijara (FK ikkinchi qism) ----
norm("fk540","fk2","540-modda","Muddatsiz ijarani bekor qilish","Ijara muddati ko‘rsatilmagan bo‘lsa, shartnoma muddatsiz tuzilgan hisoblanadi. Har bir tomon uni istalgan vaqtda bekor qilishi mumkin, lekin ikkinchi tomonni yozma ogohlantirishi shart: ko‘char mulk uchun 1 oy, ko‘chmas mulk (uy, kvartira) uchun 3 oy oldin. Qonun yoki shartnomada boshqa muddat belgilanishi mumkin.")
norm("fk551","fk2","551-modda","Ijara beruvchi talabi bilan muddatidan oldin bekor qilish","Ijara beruvchi shartnomani muddatidan oldin faqat sud orqali va qonundagi asoslar bo‘lsa bekor qildira oladi: mulkdan shartnoma yoki maqsadiga jiddiy zid foydalanish, mulkni jiddiy yomonlashtirish, ijara haqini ketma-ket ikki martadan ortiq o‘z vaqtida to‘lamaslik va boshqalar. Bundan oldin ijarachiga yozma ogohlantirish berib, majburiyatni bajarishi uchun imkon berilishi shart.")
norm("fk1023","fk2","1023-modda","Asossiz boyishni qaytarish majburiyati","Qonun yoki shartnomada asos bo‘lmagan holda boshqa shaxs hisobidan mol-mulk (pul) olgan yoki tejagan shaxs uni qaytarishi shart. Ijara tugagach qaytarilmagan garov puli yoki ortiqcha undirilgan to‘lovni shu qoida asosida talab qilish mumkin.")

# ---- Xizmatlar (kommunal) ----
norm("ihq19","ihq","19-modda","Sifatsiz xizmat ko‘rsatilganda iste’molchining huquqlari","Ijrochi xizmatni shartnomada belgilangan muddatda, hajmda va sifatda ko‘rsatishi shart. Xizmatda nuqson bo‘lsa, iste’molchi uni bepul bartaraf etishni, narxni mutanosib kamaytirishni, qayta bajarishni yoki shartnomani bekor qilib, zararni to‘liq qoplashni talab qilishi mumkin. Nuqson odatda talabdan keyin 20 kun ichida tuzatiladi; kechikkan har kun uchun xizmat narxining 1 foizi penya to‘lanadi (jami xizmat narxidan oshmaydi).")

# ---- Bank va mikroqarz ----
norm("bank_jav","bank",None,"Bankning mijoz oldidagi javobgarligi","Banklar mijozlar va omonatchilar mablag‘larining saqlanishi hamda o‘z majburiyatlarini bajarishi uchun javobgar. Banklar mijozlarni depozit va kredit operatsiyalarining muddatlari va shartlari haqida muntazam xabardor qilishi shart.")
norm("bank_sir","bank",None,"Bank siri","Bank mijozlarning operatsiyalari, hisobvaraqlari va omonatlari sirini kafolatlaydi. Jismoniy shaxsning hisobi bo‘yicha ma’lumot mijozning o‘ziga va qonuniy vakiliga, qonunda nazarda tutilgan hollarda sud va tergov organlariga beriladi.")
norm("cbu_shik","bank",None,"Markaziy bankka shikoyat","Bank, mikromoliya tashkiloti yoki lombard huquqingizni buzsa, Markaziy bankning bank xizmatlari iste’molchilari huquqlarini himoya qilish xizmatiga murojaat qilish mumkin: ishonch telefoni (71) 200-00-44, cbu.uz virtual qabulxonasi yoki murojaat.gov.uz.")
norm("mfo32","mfo","32-modda","Mikroqarz bo‘yicha to‘lovlar chegarasi","Mikromoliya tashkilotlari va lombardlar mikroqarz bo‘yicha foiz, komissiya va neustoyka (jarima, penya) ni jami yiliga qarz summasining yarmidan ortiq undira olmaydi. Arizani ko‘rib chiqish va hisobni yuritish uchun komissiya, qarzni muddatidan oldin qaytarganlik uchun jarima olish taqiqlanadi. Foiz stavkalari Markaziy bank belgilagan chegaradan oshmasligi kerak.")
norm("mfo28","mfo","28-modda","Markaziy bank choralari","Mikromoliya tashkilotlari va lombardlar iste’molchilar huquqlarini buzganda Markaziy bank qonunbuzarlikni bartaraf etish to‘g‘risida majburiy ko‘rsatma berishi va jarima qo‘llashi mumkin.")
norm("mfo33","mfo","33-modda","Iste’molchining himoyalanish huquqi","Mikromoliya va lombard xizmatlari iste’molchisi buzilgan huquqlarini himoya qilish uchun sudga va boshqa vakolatli davlat organlariga murojaat qilishga haqli.")

# ---- OSGO ----
norm("osgo19","osgo","19-modda","Jabrlanuvchining arizasi","Sug‘urta to‘lovini olish uchun jabrlanuvchi sug‘urtachiga zararni qoplash talabi bilan yozma ariza beradi va kerakli hujjatlarni ilova qiladi.")
norm("osgo23","osgo","23-modda","Sug‘urta to‘lovi muddatlari","Sug‘urtachi yozma yoki elektron arizadan keyin 15 kundan kechiktirmay sug‘urta to‘lovi yoki rad etish to‘g‘risida qaror qabul qiladi. To‘lov qaror qabul qilingan kundan 5 ish kunidan kechiktirmay amalga oshiriladi.")
norm("osgo25","osgo","25-modda","Kafolat jamg‘armasidan kompensatsiya","Qonunda belgilangan hollarda sug‘urtachi to‘lay olmasa, zarar Kafolat jamg‘armasidan qoplanadi. Kompensatsiya to‘lovi talabi zarar yetkazilgan kundan 3 yil ichida qo‘yilishi mumkin.")

# ---- Pensiya ----
norm("pens45","pens","45-modda","Pensiya arizasini ko‘rib chiqish muddati","Pensiya tayinlash to‘g‘risidagi ariza va anketa kelib tushgan kundan 10 kundan kechiktirmay ko‘rib chiqiladi.")
norm("pens47","pens","47-modda","Pensiya qaysi kundan tayinlanadi","Yosh bo‘yicha pensiyaga ariza huquq paydo bo‘lgan kundan 60 kun ichida berilsa, pensiya pensiya yoshiga yetgan kundan, aks holda ariza berilgan kundan tayinlanadi.")
norm("pens48","pens","48-modda","Pensiya qaroriga shikoyat","Pensiya tayinlash to‘g‘risidagi qaror ustidan sudga shikoyat qilish mumkin.")
norm("pens49","pens","49-modda","Pensiyani qayta hisoblash","Pensioner arizasiga ko‘ra pensiya qayta hisoblanadi, masalan, qo‘shimcha staj yoki ish haqi to‘g‘risidagi hujjatlar taqdim etilganda.")

# ---- Xususiy bandlik agentliklari (mehnat migratsiyasi) ----
norm("xab15","xab","15-modda","Xizmat ko‘rsatish shartnomasi","Xususiy bandlik agentligi izlovchi bilan yozma shartnoma tuzadi va uni «Xorijda ish» tizimida ro‘yxatdan o‘tkazadi. Izlovchi to‘lagan pul maxsus depozitga qo‘yiladi va agentlikka faqat shartnoma bajarilgandan keyin o‘tkaziladi.")
norm("xab15_1","xab","15¹-modda","Agentlik va xorijiy ish beruvchining javobgarligi","Agentlik va xorijiy ish beruvchi izlovchi oldida majburiyatlar bajarilmagani uchun solidar javob beradi. Xorijiy ish beruvchi yoki hamkor bilan shartnomasiz xorijda ishga joylashtirish xizmatini ko‘rsatish taqiqlanadi.")
norm("xab17","xab","17-modda","Xorijga yuborilganlar oldidagi majburiyatlar","Agentlik xorijga yuborilgan shaxslarning mehnat faoliyatini kuzatib boradi. Xorijiy ish beruvchi kerakli sharoitlarni ta’minlamasa, agentlik zudlik bilan boshqa ish beruvchi topishi yoki fuqaroni O‘zbekistonga qaytarishi shart; agentlik buni bajarmasa, fuqaroni Migratsiya agentligi qaytaradi.")
norm("xab20","xab","20-modda","Davlat nazorati","Vazirlar Mahkamasi huzuridagi Migratsiya agentligi xususiy bandlik agentliklari reyestrini yuritadi, ularning qonunchilikka rioya etishini nazorat qiladi va tekshiradi. Xorijda ishga joylashtirish litsenziyasini ham shu agentlik beradi.")

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
COURT_FEE = "Mehnat kodeksining 562-moddasiga ko‘ra xodimlar yakka tartibdagi mehnat nizolari bo‘yicha sudga murojaat qilganda sud xarajatlaridan ozod qilinadi. Sudga murojaat muddati ({{deadlineTerm}}) {{deadline}}da tugaydi."
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
  norms=["m253","m333","m25","muddat","m562","m9"],
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
  norms=["m161","m165","sud","muddat","m562","m171","m9"],
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
  norms=["m217","m218","m220","m231","muddat","m562"],
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
  norms=["hisob","m171","m333","muddat","m562"],
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
scen(id="jarima", domain="jarima", title="Jarimaga rozi emasman", card="Inspeksiya, hokimlik yoki boshqa organ noto‘g‘ri jarima soldi", short="Jarima",
  lead="Jarima to‘g‘risidagi qaror ustidan qaror nusxasini olgan kundan 10 kun ichida shikoyat qilish mumkin. Diqqat: shikoyat qilsangiz, tez to‘lash chegirmasi (50 yoki 70 foiz) qo‘llanmaydi.",
  keywords=["jarima","shtraf","bayonnoma","protokol","ma’muriy javobgarlik","inspeksiya","soliq inspeksiyasi","sanitariya","obodonlashtirish","jarima soldi","jarimaga"],
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



# ===== IJARA VA UY-JOY =====
RENT = "Ijara"
CIVIL_TO = lambda party, addr, extra=None: ["{{district}} fuqarolik ishlari bo‘yicha tumanlararo sudiga", "Da’vogar: {{applicant}}", "Javobgar: {{" + party + "}}, manzil: {{" + addr + "}}"] + ([extra] if extra else [])
CIVIL_ATT = ["Da’vo arizasining javobgar uchun nusxasi", "Pasport nusxasi"]
FK150_P = "Fuqarolik kodeksining 150-moddasiga ko‘ra umumiy da’vo muddati uch yil bo‘lib, u o‘tkazib yuborilmagan."
rent_fields = lambda extra: [
  F("landlord","Uy egasi F.I.Sh.","uy egasi F.I.Sh.", group=RENT),
  F("landlordAddress","Uy egasining manzili","uy egasi manzili", group=RENT),
  F("propAddress","Ijaraga olingan uy manzili","uy manzili", group=RENT, hint="Toshkent sh., Yunusobod t., 4-mavze, 12-uy, 34-xonadon"),
  F("leaseDate","Ijara shartnomasi sanasi","shartnoma sanasi","date", group=RENT),
  *extra,
  F("district","Tuman yoki shahar","tuman/shahar", group=RENT, docs=["court"], hint="Yunusobod tumani")
]
DEP_P1 = "[?leaseDate]{{leaseDate}}dan boshlab [/]{{landlord}}dan {{propAddress}} manzilidagi uyni ijaraga olganman va ijara boshida garov (depozit) sifatida pul to‘laganman. {{trigger}}da ijara tugadi va uyni soz holatda topshirdim. Biroq {{deposit}} hozirgacha qaytarilmagan."
DEP_P2 = "Fuqarolik kodeksining 1023-moddasiga ko‘ra qonun yoki shartnomada asos bo‘lmagan holda boshqa shaxs hisobidan mol-mulk (pul) olgan shaxs uni qaytarishi shart. Ijara tugagan, pulni ushlab qolish uchun shartnomaviy asos yo‘q."
scen(id="ijara_depozit", domain="ijara", title="Uy egasi garov pulini qaytarmayapti", card="Ijaradan chiqdim, depozit yoki oldindan to‘lagan pulim qaytarilmadi", short="Garov puli",
  lead="Ijara tugagach, ushlab qolishga asos bo‘lmasa, garov (depozit) puli va yashalmagan davr uchun to‘langan ijara haqi qaytarilishi kerak. Avval yozma talab qilasiz, keyin sudga murojaat qilasiz. Umumiy da’vo muddati 3 yil.",
  keywords=["depozit","zalog","garov puli","garovni","uy egasi","kvartira egasi","xo‘jayin","ijaradan chiqdim","ijarada turgan","kvartirant","arenda","ijara puli"],
  norms=["fk1023","fk540","fk150"],
  deadline={"years":3, "label":"Da’vo muddati tugashiga qoldi"}, trigger="Uyni topshirgan (chiqib ketgan) sana",
  calc=None, partyField="landlord", amountField="deposit",
  steps=[{"org":"Uy egasi","t":"Yozma talabnoma yuboring","when":"Bugun","body":"Uy soz holatda topshirilganini tasdiqlovchi dalillarni (foto, video, dalolatnoma) ilova qiling. Pochta orqali xabarnoma bilan yuborish ham mumkin."},
         {"org":"Sud","t":"Pulni sud orqali undiring","when":"{deadline} gacha","hot":True,"body":"Fuqarolik sudiga da’vo. Garov to‘langanini tasdiqlovchi tilxat yoki bank o‘tkazmasi asosiy dalil bo‘ladi."},
         {"org":"Majburiy ijro byurosi","t":"Qaror ijrosi","when":"Sud qaroridan keyin","body":"To‘lanmasa, sud hujjati majburiy ijroga yuboriladi."}],
  evidence=["Ijara shartnomasi","Garov to‘langanini tasdiqlovchi hujjat (tilxat, bank o‘tkazmasi)","Uy topshirilgan paytdagi foto yoki video","Kalit topshirish dalolatnomasi","Uy egasi bilan yozishmalar","Guvohlar"],
  fields=rent_fields([F("deposit","Qaytarilmagan summa, so‘m","summa","money", group=RENT)]),
  docs=[
    doc("landlord","Uy egasiga", ["{{landlord}}ga","manzil: {{landlordAddress}}","{{applicant}} dan"], "TALABNOMA", [DEP_P1, DEP_P2],
        ["{{deposit}}ni ushbu talabnoma olingan kundan e’tiboran 10 kun ichida qaytarishni."],
        ["Ijara shartnomasi nusxasi","Garov to‘langanini tasdiqlovchi hujjat nusxasi"], sub="garov pulini qaytarish to‘g‘risida", askLabel="Talab qilaman:",
        closing="Pul qaytarilmagan taqdirda uni sud orqali undirishimni ma’lum qilaman."),
    doc("court","Sudga", CIVIL_TO("landlord","landlordAddress","Da’vo summasi: {{deposit}}"), "DA’VO ARIZASI", [DEP_P1, DEP_P2, FK150_P],
        ["javobgardan mening foydamga {{deposit}}ni undirishni;","javobgardan sud xarajatlarini undirishni."],
        CIVIL_ATT + ["Ijara shartnomasi nusxasi","Garov to‘langanini tasdiqlovchi hujjat nusxasi","Talabnoma nusxasi"],
        sub="asossiz ushlab qolingan pulni undirish to‘g‘risida", askLabel="Yuqoridagilarga asosan, so‘rayman:")
  ])

EV_P1 = "[?leaseDate]{{leaseDate}}da [/]men bilan {{propAddress}} manzilidagi uyni ijaraga berish to‘g‘risida shartnoma tuzilgan, uning muddati: {{leaseEnd}}. Men ijara haqini o‘z vaqtida to‘lab kelyapman. {{trigger}}da uy egasi mendan uyni muddatidan oldin bo‘shatishni talab qildi."
EV_P2 = "Fuqarolik kodeksining 551-moddasiga ko‘ra ijara beruvchi shartnomani muddatidan oldin faqat sud tartibida va qonunda sanab o‘tilgan asoslar mavjud bo‘lganda bekor qildira oladi; bundan oldin ijarachiga yozma ogohlantirish berilishi shart. Bunday asoslar yo‘q. Muddatsiz ijarada ham 540-moddaga ko‘ra uy egasi kamida uch oy oldin yozma ogohlantirishi kerak."
scen(id="ijara_chiqarish", domain="ijara", title="Uy egasi muddatidan oldin chiqaryapti", card="Shartnoma muddati tugamasdan chiqib ketishni talab qilyapti yoki narsalarimni chiqarib tashladi", short="Ijaradan chiqarish",
  lead="Uy egasi ijara shartnomasini muddatidan oldin faqat sud orqali va qonundagi asoslar bo‘lsa bekor qildira oladi. Muddatsiz ijarada ham kamida 3 oy oldin yozma ogohlantirishi shart. Qulfni almashtirish yoki narsalarni chiqarib tashlash — o‘zboshimchalik.",
  keywords=["ijaradan chiqar","uydan chiqar","kvartiradan chiqar","chiqib ketishimni","bo‘shatishni talab","muddatidan oldin","narsalarimni chiqarib","qulfni almashtir","ijara shartnomasi","uy egasi","kvartirant","ijarachi"],
  norms=["fk551","fk540","fk1023"],
  deadline={"none":True, "label":"Murojaat muddati", "note":"Qat’iy muddat yo‘q. Uy egasining talabiga darhol yozma javob bering va barcha yozishmalarni saqlang."},
  trigger="Uy egasi chiqishni talab qilgan sana",
  calc=None, partyField="landlord", amountField="prepaid",
  steps=[{"org":"Uy egasi","t":"Yozma javob yuboring","when":"Bugun","body":"Shartnoma amal qilayotganini va uni faqat sud orqali bekor qilish mumkinligini yozing. Nusxasini saqlang."},
         {"org":"Politsiya","t":"Tahdid yoki kuch ishlatilsa — 102","when":"Darhol, kerak bo‘lsa","body":"Qulfni almashtirish, narsalarni chiqarib tashlash, tahdid qilish — o‘zboshimchalik bo‘lishi mumkin. Voqeani foto va videoga oling."},
         {"org":"Sud","t":"Huquqingizni sud orqali himoya qiling","when":"Kerak bo‘lsa","body":"Uydan foydalanishga to‘sqinlik qilmaslikni, yashalmagan davr uchun to‘langan pul va zararni undirishni so‘rash mumkin."}],
  evidence=["Ijara shartnomasi","Ijara haqi to‘langanini tasdiqlovchi hujjatlar","Uy egasining talabi (yozma, SMS, ovozli xabar)","Foto yoki video","Guvohlar"],
  fields=rent_fields([
    F("leaseEnd","Shartnoma muddati (qachongacha)","shartnoma muddati", group=RENT, hint="2027-yil 1-martgacha"),
    F("prepaid","Oldindan to‘langan, lekin yashalmagan davr uchun summa, so‘m","summa","money", group=RENT, docs=["court"])
  ]),
  docs=[
    doc("landlord","Uy egasiga", ["{{landlord}}ga","manzil: {{landlordAddress}}","ijarachi {{applicant}} dan"], "BILDIRISHNOMA", [EV_P1, EV_P2],
        ["shartnoma amal qilishda davom etayotganini va uni bir tomonlama bekor qilishga rozi emasligimni;","uyga kirishimga to‘sqinlik qilish, narsalarimni chiqarish yoki kommunal xizmatlarni uzish huquqlarimni buzish ekanini va bunday holatda tegishli organlar hamda sudga murojaat qilishimni."],
        ["Ijara shartnomasi nusxasi"], sub="ijara shartnomasini muddatidan oldin bekor qilish talabiga javoban", askLabel="Ma’lum qilaman:"),
    doc("court","Sudga", CIVIL_TO("landlord","landlordAddress"), "DA’VO ARIZASI", [EV_P1, EV_P2, "Javobgar shartnomani sud tartibida bekor qildirmasdan, menga uydan foydalanishda to‘sqinlik qilmoqda."],
        ["javobgarni ijara shartnomasi bo‘yicha majburiyatlarini bajarishga va uydan foydalanishimga to‘sqinlik qilmaslikka majburlashni;","zarur bo‘lsa, javobgardan oldindan to‘langan[?prepaid] {{prepaid}} miqdoridagi[/] ijara haqi va yetkazilgan zararni undirishni;","javobgardan sud xarajatlarini undirishni."],
        CIVIL_ATT + ["Ijara shartnomasi nusxasi","Ijara haqi to‘langanini tasdiqlovchi hujjatlar nusxasi"],
        sub="ijara shartnomasidan kelib chiqadigan huquqlarni himoya qilish to‘g‘risida", askLabel="Yuqoridagilarga asosan, so‘rayman:")
  ])

# ===== KOMMUNAL XIZMATLAR =====
UT = "Xizmat"
util_fields = lambda last: [
  F("provider","Xizmat ko‘rsatuvchi tashkilot","tashkilot nomi", group=UT, hint="«Hududgaztaminot» Chilonzor filiali"),
  F("providerAddress","Tashkilot manzili","tashkilot manzili", group=UT, docs=["court"]),
  F("service","Xizmat turi","xizmat turi", group=UT, hint="tabiiy gaz"),
  F("account","Shaxsiy hisob (abonent) raqami","hisob raqami", group=UT),
  *last,
  F("district","Tuman yoki shahar","tuman/shahar", group=UT, docs=["agency","court"], hint="Chilonzor tumani")
]
UT_INTRO = "Men {{provider}}ning {{service}} xizmatidan foydalanaman[?account] (shaxsiy hisob raqami: {{account}})[/]"
BILL_P1 = UT_INTRO + ". {{trigger}}da menga[?overcharge] {{overcharge}} miqdorida[/] asossiz hisob-kitob qilindi: {{reason}}."
BILL_P2 = "Iste’molchilarning huquqlarini himoya qilish to‘g‘risidagi qonunning 19-moddasiga ko‘ra ijrochi xizmatni shartnomada belgilangan hajm va sifatda ko‘rsatishi shart. Haqiqatda ko‘rsatilmagan xizmat uchun to‘lov olishga asos yo‘q; Fuqarolik kodeksining 1023-moddasiga ko‘ra asossiz olingan pul qaytarilishi kerak."
UT_COURT = ["{{district}} fuqarolik ishlari bo‘yicha tumanlararo sudiga","Da’vogar: {{applicant}}","Javobgar: {{provider}}, manzil: {{providerAddress}}"]
scen(id="kommunal_hisob", domain="kommunal", title="Kommunal to‘lov noto‘g‘ri hisoblandi", card="Elektr, gaz yoki suv uchun ortiqcha hisob yoki asossiz qarz chiqdi", short="Ortiqcha hisob",
  lead="Xizmat haqi haqiqiy iste’mol (hisoblagich ko‘rsatkichi) va tasdiqlangan tarif bo‘yicha olinadi. Asossiz hisoblangan summani qayta hisoblashni va qaytarishni talab qilish mumkin.",
  keywords=["kommunal","hisoblagich","schyotchik","kvitansiya","ortiqcha hisob","ko‘p hisob","qarzdorlik chiqdi","qarz chiqib","tarif","abonent","svetga","gazga","suvga","kvt"],
  norms=["ihq19","fk1023","ihq23","ihq29","fk150"],
  deadline={"years":3, "label":"Da’vo muddati tugashiga qoldi"}, trigger="Noto‘g‘ri hisob kelgan sana",
  calc=None, partyField="provider", amountField="overcharge",
  steps=[{"org":"Xizmat ko‘rsatuvchi","t":"Qayta hisoblashni yozma talab qiling","when":"Bugun","body":"Hisoblagich ko‘rsatkichi fotosini va kvitansiyalarni ilova qiling. Hisob-kitob solishtirmasini (akt-sverka) va hisoblagichni nazorat tekshiruvidan o‘tkazishni so‘rang."},
         {"org":"Iste’molchilar qo‘mitasi","t":"Javob bo‘lmasa, shikoyat qiling","when":"Javob bo‘lmasa","body":"Raqobat va iste’molchilar qo‘mitasining hududiy boshqarmasiga ariza. Tekshiruv bepul."},
         {"org":"Sud","t":"Ortiqcha to‘lovni undiring","when":"{deadline} gacha","hot":True,"body":"Fuqarolik sudiga da’vo: qayta hisoblash va asossiz olingan pulni qaytarish."}],
  evidence=["To‘lov kvitansiyalari","Hisoblagich ko‘rsatkichi fotosurati (sana bilan)","Shaxsiy hisob raqami yoki abonent shartnomasi","Hisob-kitob solishtirmasi (akt-sverka)","Xizmat ko‘rsatuvchi bilan yozishmalar"],
  fields=util_fields([
    F("overcharge","Ortiqcha hisoblangan summa, so‘m","summa","money", group=UT),
    F("reason","Nega hisob noto‘g‘ri","hisob noto‘g‘riligi sababi","textarea", group=UT, hint="Hisoblagich 1250 kVt·soat ko‘rsatyapti, hisobda 2100 kVt·soat")
  ]),
  docs=[
    doc("provider","Xizmat ko‘rsatuvchiga", ["{{provider}} rahbariga","abonent {{applicant}} dan"], "TALABNOMA", [BILL_P1, BILL_P2],
        ["shaxsiy hisobimdagi hisob-kitobni haqiqiy iste’mol bo‘yicha qayta hisoblashni;","asossiz hisoblangan summani hisobdan chiqarishni, to‘langan bo‘lsa, qaytarishni;","hisob-kitob solishtirma dalolatnomasini (akt-sverka) taqdim etishni."],
        ["To‘lov kvitansiyalari nusxasi","Hisoblagich ko‘rsatkichi fotosurati"], sub="hisob-kitobni qayta ko‘rib chiqish to‘g‘risida", askLabel="Talab qilaman:", closing=CONS_CLOSE),
    doc("agency","Iste’molchilar qo‘mitasiga", AGENCY_TO, "ARIZA", [BILL_P1, "Xizmat ko‘rsatuvchiga yozma talab qo‘ydim, biroq u qondirilmadi.", BILL_P2],
        ["{{provider}} faoliyatida iste’molchilar huquqlari to‘g‘risidagi qonunchilikka rioya etilishini tekshirishni;","xizmat ko‘rsatuvchiga hisob-kitobni qayta ko‘rib chiqish yuzasidan ko‘rsatma berishni."],
        ["To‘lov kvitansiyalari nusxasi","Xizmat ko‘rsatuvchiga berilgan talabnoma nusxasi"], sub="iste’molchi huquqlari buzilganligi to‘g‘risida"),
    doc("court","Sudga", UT_COURT, "DA’VO ARIZASI", [BILL_P1, BILL_P2],
        ["javobgarni shaxsiy hisobimdagi hisob-kitobni haqiqiy iste’mol bo‘yicha qayta hisoblashga majburlashni;","javobgardan asossiz undirilgan[?overcharge] {{overcharge}}[/] summani undirishni;","javobgardan sud xarajatlarini undirishni."],
        CIVIL_ATT + ["To‘lov kvitansiyalari nusxasi","Talabnoma nusxasi"], sub="hisob-kitobni qayta ko‘rib chiqish va pulni undirish to‘g‘risida", askLabel="Yuqoridagilarga asosan, so‘rayman:")
  ])

QUAL_P1 = UT_INTRO + " va to‘lovlarni o‘z vaqtida amalga oshiraman. {{trigger}}dan boshlab xizmat ko‘rsatishda quyidagi muammo bor: {{problem}}."
QUAL_P2 = "Iste’molchilarning huquqlarini himoya qilish to‘g‘risidagi qonunning 19-moddasiga ko‘ra ijrochi xizmatni shartnomada belgilangan muddatda, hajmda va sifatda ko‘rsatishi shart. Xizmatda nuqson bo‘lsa, iste’molchi uni bartaraf etishni va narxni mutanosib kamaytirishni talab qilishga haqli; nuqson talabdan keyin 20 kun ichida bartaraf etilmasa, har bir kechikkan kun uchun xizmat narxining 1 foizi miqdorida penya to‘lanadi."
scen(id="kommunal_sifat", domain="kommunal", title="Kommunal xizmat uzildi yoki sifatsiz", card="Svet, gaz yoki suv uzoq vaqt yo‘q, bosim past yoki ogohlantirmasdan uzib qo‘yishdi", short="Sifatsiz xizmat",
  lead="Xizmat ko‘rsatuvchi xizmatni shartnomadagi hajm va sifatda ko‘rsatishi shart. Ko‘rsatilmagan xizmat uchun to‘lov qayta hisoblanadi; nuqson 20 kunda tuzatilmasa, har kun uchun xizmat narxining 1 foizi penya to‘lanadi.",
  keywords=["svet yo‘q","gaz yo‘q","suv yo‘q","tok yo‘q","uzib qo‘y","o‘chirib qo‘y","bosim past","kuchlanish","issiq suv","isitish","otopleniya","radiator","avariya","kommunal xizmat","svet yo‘qligi","gaz yo‘qligi","suv yo‘qligi","tok yo‘qligi"],
  norms=["ihq19","ihq22","ihq23","ihq29"],
  deadline={"months":6, "label":"Talab qo‘yish uchun qoldi", "note":"Xizmatdagi nuqson bo‘yicha talab, kafolat bo‘lmasa, 6 oy ichida qo‘yiladi (19-modda). Kechiktirmang."},
  trigger="Xizmat uzilgan yoki sifatsiz bo‘lgan sana",
  calc=None, partyField="provider",
  steps=[{"org":"Xizmat ko‘rsatuvchi","t":"Avariya xizmatiga qo‘ng‘iroq qiling va yozma talab bering","when":"Bugun","body":"Murojaat raqamini yozib oling. Talabnomada xizmat qachondan yo‘qligini va nima talab qilishingizni yozing. Qo‘shnilar bilan jamoaviy ariza kuchliroq."},
         {"org":"Iste’molchilar qo‘mitasi","t":"Tuzatilmasa, shikoyat qiling","when":"Javob bo‘lmasa","body":"Raqobat va iste’molchilar qo‘mitasining hududiy boshqarmasiga ariza."},
         {"org":"Sud","t":"Qayta hisoblash, penya va zararni undiring","when":"Kerak bo‘lsa","body":"Fuqarolik sudiga da’vo; ma’naviy zararni ham so‘rash mumkin (22-modda)."}],
  evidence=["Avariya xizmatiga murojaat raqami","Foto yoki video (hisoblagich, bosim, harorat)","Qo‘shnilar guvohligi yoki jamoaviy ariza","To‘lov kvitansiyalari","Yozishmalar"],
  fields=util_fields([F("problem","Muammo nimada","muammo tavsifi","textarea", group=UT, hint="3 kundan beri gaz yo‘q, ogohlantirish bo‘lmagan")]),
  docs=[
    doc("provider","Xizmat ko‘rsatuvchiga", ["{{provider}} rahbariga","abonent {{applicant}} dan"], "TALABNOMA", [QUAL_P1, QUAL_P2],
        ["xizmatni zudlik bilan tiklashni va uning sifatini ta’minlashni;","xizmat ko‘rsatilmagan (sifatsiz ko‘rsatilgan) davr uchun to‘lovni qayta hisoblashni;","nuqson 20 kun ichida bartaraf etilmasa, har bir kechikkan kun uchun xizmat narxining 1 foizi miqdorida penya to‘lashni."],
        ["To‘lov kvitansiyalari nusxasi"], sub="xizmatni tiklash va to‘lovni qayta hisoblash to‘g‘risida", askLabel="Talab qilaman:", closing=CONS_CLOSE),
    doc("agency","Iste’molchilar qo‘mitasiga", AGENCY_TO, "ARIZA", [QUAL_P1, "Xizmat ko‘rsatuvchiga murojaat qildim, biroq muammo hal qilinmadi.", QUAL_P2],
        ["{{provider}} faoliyatida iste’molchilar huquqlari to‘g‘risidagi qonunchilikka rioya etilishini tekshirishni;","xizmatni tiklash va to‘lovni qayta hisoblash yuzasidan ko‘rsatma berishni."],
        ["Xizmat ko‘rsatuvchiga berilgan talabnoma nusxasi","Foto yoki video dalillar"], sub="iste’molchi huquqlari buzilganligi to‘g‘risida"),
    doc("court","Sudga", UT_COURT, "DA’VO ARIZASI", [QUAL_P1, QUAL_P2, "Qonunning 22-moddasiga ko‘ra iste’molchiga yetkazilgan ma’naviy zarar uchun haq to‘lanadi, uning miqdorini sud belgilaydi."],
        ["javobgarni xizmat ko‘rsatilmagan davr uchun to‘lovni qayta hisoblashga majburlashni;","javobgardan xizmatdagi nuqson kechiktirilgan har bir kun uchun penya undirishni;","javobgardan ma’naviy zarar kompensatsiyasini undirishni."],
        CIVIL_ATT + ["To‘lov kvitansiyalari nusxasi","Talabnoma nusxasi"], sub="iste’molchi huquqlarini himoya qilish to‘g‘risida", askLabel="Yuqoridagilarga asosan, so‘rayman:")
  ])

# ===== BANK VA MIKROQARZ =====
BNK = "Bank va amaliyot"
CBU_TO = ["O‘zbekiston Respublikasi Markaziy banki","Bank xizmatlari iste’molchilari huquqlarini himoya qilish xizmatiga","fuqaro {{applicant}} dan"]
CARD_P1 = "Men {{bank}} mijoziman. {{trigger}}da kartamdan (hisobimdan)[?card] ({{card}})[/] men bilmagan va rozilik bermagan holda[?amount] {{amount}}[/] pul yechildi: {{details}}."
CARD_P2 = "Ushbu amaliyotni men amalga oshirmaganman va unga ruxsat bermaganman. «Banklar va bank faoliyati to‘g‘risida»gi Qonunga ko‘ra banklar mijozlar mablag‘larining saqlanishi uchun javobgar."
CARD_P3 = "[?bankDate]{{bankDate}}da bankka yozma ariza berdim, biroq [/][!bankDate]Bankka yozma ariza berdim, biroq [/]bank pulni qaytarmadi va asosli javob bermadi."
scen(id="bank_karta", domain="bank", title="Kartamdan pul noqonuniy yechildi", card="Men bilmagan holda kartadan yoki hisobdan pul yechildi", short="Karta",
  lead="Darhol kartani bloklang va bankka yozma ariza bering. Bank mijoz mablag‘larining saqlanishi uchun javobgar; bank rad etsa, Markaziy bankka shikoyat qilasiz. Firibgarlik bo‘lsa, politsiyaga ham murojaat qiling.",
  keywords=["kartamdan","kartadan","plastik","humo","uzcard","visa","pul yechildi","pul yechib","hisobimdan","firibgar","sms kod","tranzaksiya","o‘tkazma","bank ilovasi","bilmagan holda"],
  norms=["bank_jav","cbu_shik","bank_sir","fk150"],
  deadline={"none":True, "label":"Murojaat muddati", "note":"Qonunda qat’iy muddat yo‘q, lekin bankka shu kuni xabar bering: qancha tez bo‘lsa, pulni qaytarish imkoni shuncha yuqori. Sud uchun umumiy da’vo muddati 3 yil."},
  trigger="Pul yechilgan sana",
  calc=None, partyField="bank", amountField="amount",
  steps=[{"org":"Bank","t":"Kartani bloklang va yozma ariza bering","when":"Bugun","hot":True,"body":"Ilovada yoki qo‘ng‘iroq markazi orqali bloklang. So‘ng amaliyotni nizolashtirish (chargeback) haqida yozma ariza bering va qabul raqamini oling."},
         {"org":"Politsiya","t":"Firibgarlik bo‘lsa, ariza bering","when":"Darhol","body":"Tuman IIB yoki 102. Hech kimga SMS kod, karta muddati va CVV ni aytmang."},
         {"org":"Markaziy bank","t":"Bank rad etsa, shikoyat qiling","when":"Bank javobidan keyin","body":"Ishonch telefoni (71) 200-00-44, cbu.uz virtual qabulxonasi yoki murojaat.gov.uz."},
         {"org":"Sud","t":"Pulni bankdan undiring","when":"Kerak bo‘lsa","body":"Fuqarolik sudiga da’vo. Amaliyotni o‘zingiz tasdiqlamaganingiz asosiy dalil."}],
  evidence=["Karta yoki hisob ko‘chirmasi","Yechilgan pul haqidagi SMS yoki ilova skrinshoti","Kartani bloklash vaqti haqida ma’lumot","Bankka ariza nusxasi (qabul raqami bilan)","Politsiyaga ariza va qabul taloni","Firibgar bilan yozishma (bo‘lsa)"],
  fields=[
    F("bank","Bank nomi","bank nomi", group=BNK, hint="«…bank» ATB"),
    F("bankAddress","Bank (filial) manzili","bank manzili", group=BNK, docs=["court"]),
    F("card","Karta yoki hisob raqami (oxirgi 4 raqam)","karta raqami", group=BNK, hint="**** 1234"),
    F("amount","Yechilgan summa, so‘m","summa","money", group=BNK),
    F("details","Nima bo‘ldi","voqea tavsifi","textarea", group=BNK, hint="Kechasi 3 ta o‘tkazma qilingan, men SMS kod bermaganman"),
    F("bankDate","Bankka ariza bergan sanangiz","ariza sanasi","date", group=BNK, docs=["cbu","court"]),
    F("district","Tuman yoki shahar","tuman/shahar", group=BNK, docs=["court"], hint="Mirzo Ulug‘bek tumani")
  ],
  docs=[
    doc("bank","Bankka", ["{{bank}} boshqaruviga","mijoz {{applicant}} dan"], "ARIZA", [CARD_P1, CARD_P2],
        ["amaliyotni nizoli deb ro‘yxatga olib, uni bekor qilish (chargeback) choralarini ko‘rishni;","yechilgan pulni hisobimga qaytarishni;","amaliyot bo‘yicha batafsil yozma ma’lumot (sana, vaqt, qabul qiluvchi) berishni."],
        ["Karta (hisob) ko‘chirmasi","SMS yoki ilova skrinshotlari"], sub="ruxsatsiz amaliyot to‘g‘risida",
        closing="Talabim qondirilmagan taqdirda Markaziy bankka va sudga murojaat qilishimni ma’lum qilaman."),
    doc("cbu","Markaziy bankka", CBU_TO, "SHIKOYAT", [CARD_P1, CARD_P3, CARD_P2],
        ["{{bank}} faoliyatida bank xizmatlari iste’molchilari huquqlariga rioya etilishini tekshirishni;","bankka amaliyotni qayta ko‘rib chiqish va pulni qaytarish yuzasidan choralar ko‘rishni."],
        ["Bankka ariza nusxasi","Karta (hisob) ko‘chirmasi"], sub="bank xizmatlari iste’molchisi huquqlari buzilganligi to‘g‘risida"),
    doc("court","Sudga", ["{{district}} fuqarolik ishlari bo‘yicha tumanlararo sudiga","Da’vogar: {{applicant}}","Javobgar: {{bank}}, manzil: {{bankAddress}}","Da’vo summasi: {{amount}}"], "DA’VO ARIZASI", [CARD_P1, CARD_P3, CARD_P2],
        ["javobgardan mening foydamga hisobimdan ruxsatsiz yechilgan {{amount}}ni undirishni;","javobgardan sud xarajatlarini undirishni."],
        CIVIL_ATT + ["Karta (hisob) ko‘chirmasi","Bankka ariza nusxasi"], sub="ruxsatsiz yechilgan pulni undirish to‘g‘risida", askLabel="Yuqoridagilarga asosan, so‘rayman:")
  ])

LN = "Qarz"
MFO_P1 = "Men {{lender}} bilan {{contract}} mikroqarz shartnomasini tuzganman[?loan], qarz summasi {{loan}}[/]. {{trigger}}da men bilan quyidagicha hisob-kitob qilindi: {{issue}}.[?charged] Bir yil davomida mendan jami {{charged}} foiz, komissiya va jarima undirilgan.[/]"
MFO_P2 = "«Nobank kredit tashkilotlari va mikromoliya faoliyati to‘g‘risida»gi Qonunning 32-moddasiga ko‘ra mikromoliya tashkilotlari va lombardlar mikroqarz bo‘yicha jami yiliga qarz summasining yarmidan ortiq foiz, komissiya va neustoyka undira olmaydi; arizani ko‘rib chiqish va hisobni yuritish uchun komissiya, qarzni muddatidan oldin qaytarganlik uchun jarima olish taqiqlanadi."
scen(id="kredit_mfo", domain="bank", title="Mikroqarz bo‘yicha ortiqcha foiz va jarima", card="Mikromoliya tashkiloti yoki lombard qonundan ortiq foiz, komissiya yoki jarima undiryapti", short="Mikroqarz",
  lead="Mikroqarz bo‘yicha foiz, komissiya va jarimalar jami yiliga qarz summasining yarmidan oshmasligi kerak. Arizani ko‘rib chiqish va muddatidan oldin qaytarish uchun haq olish taqiqlangan. Ortiqcha undirilgan pulni qaytarishni talab qilasiz.",
  keywords=["mikroqarz","mikrozaym","mikrokredit","mikromoliya","lombard","foiz","protsent","penya","kollektor","komissiya","muddatidan oldin to‘la","kredit","nasiya","onlayn qarz"],
  norms=["mfo32","mfo28","mfo33","cbu_shik","fk1023"],
  deadline={"years":3, "label":"Da’vo muddati tugashiga qoldi"}, trigger="Ortiqcha to‘lov undirilgan sana",
  calc={"type":"loanCap"}, partyField="lender", amountField="loan",
  steps=[{"org":"Kreditor","t":"Ko‘chirma so‘rang va yozma e’tiroz bildiring","when":"Bugun","body":"Foiz, komissiya va jarimalar alohida ko‘rsatilgan to‘lov jadvali va ko‘chirmani talab qiling."},
         {"org":"Markaziy bank","t":"Shikoyat qiling","when":"Javob bo‘lmasa","body":"Markaziy bank majburiy ko‘rsatma berishi va tashkilotga jarima qo‘llashi mumkin. Ishonch telefoni (71) 200-00-44."},
         {"org":"Politsiya","t":"Tahdid qilinsa, ariza bering","when":"Kerak bo‘lsa","body":"Kollektor tahdid qilsa, haqorat qilsa yoki qarindoshlaringizga bosim o‘tkazsa, qo‘ng‘iroqlarni yozib oling va 102 ga murojaat qiling."},
         {"org":"Sud","t":"Ortiqcha undirilgan pulni qaytaring","when":"{deadline} gacha","hot":True,"body":"Fuqarolik sudiga da’vo. Shartnoma, jadval va ko‘chirma asosiy dalil."}],
  evidence=["Mikroqarz shartnomasi","To‘lov jadvali","To‘lovlar ko‘chirmasi yoki kvitansiyalar","Undirilgan jarima va komissiyalar haqida ma’lumot","Kollektor qo‘ng‘iroqlari yozuvi yoki xabarlar (bo‘lsa)"],
  fields=[
    F("lender","Mikromoliya tashkiloti yoki lombard","tashkilot nomi", group=LN, hint="«…» mikromoliya tashkiloti"),
    F("lenderAddress","Tashkilot manzili","tashkilot manzili", group=LN, docs=["court"]),
    F("contract","Shartnoma raqami va sanasi","shartnoma raqami", group=LN, hint="№ 12345, 2026-yil 10-mart"),
    F("loan","Qarz summasi, so‘m","qarz summasi","money", group=LN, calc=True),
    F("charged","Bir yilda undirilgan foiz, komissiya va jarimalar, so‘m","undirilgan summa","money", group=LN, calc=True),
    F("issue","Nimadan noroziziz","e’tiroz","textarea", group=LN, hint="Qarzni muddatidan oldin to‘laganim uchun jarima olishdi"),
    F("district","Tuman yoki shahar","tuman/shahar", group=LN, docs=["court"], hint="Shayxontohur tumani")
  ],
  docs=[
    doc("lender","Kreditorga", ["{{lender}} rahbariga","qarz oluvchi {{applicant}} dan"], "TALABNOMA", [MFO_P1, MFO_P2],
        ["shartnoma bo‘yicha foiz, komissiya va jarimalar alohida ko‘rsatilgan to‘liq hisob-kitob ko‘chirmasini berishni;","qonunda belgilangan chegaradan ortiq undirilgan summani qaytarishni yoki qarz summasidan chegirishni;","qonunga zid hisoblangan jarima va komissiyalarni bekor qilishni."],
        ["Shartnoma nusxasi","To‘lovlar ko‘chirmasi"], sub="ortiqcha undirilgan summani qaytarish to‘g‘risida", askLabel="Talab qilaman:",
        closing="Talabim qondirilmagan taqdirda Markaziy bankka va sudga murojaat qilishimni ma’lum qilaman."),
    doc("cbu","Markaziy bankka", CBU_TO, "SHIKOYAT", [MFO_P1, "Tashkilotga yozma e’tiroz bildirdim, biroq u qondirilmadi.", MFO_P2],
        ["{{lender}} faoliyatida mikromoliya xizmatlari iste’molchilari huquqlariga rioya etilishini tekshirishni;","qonunbuzarlikni bartaraf etish yuzasidan majburiy ko‘rsatma berishni va qonunda belgilangan choralarni ko‘rishni."],
        ["Shartnoma nusxasi","To‘lovlar ko‘chirmasi","Tashkilotga yuborilgan talabnoma nusxasi"], sub="mikromoliya xizmatlari iste’molchisi huquqlari buzilganligi to‘g‘risida"),
    doc("court","Sudga", ["{{district}} fuqarolik ishlari bo‘yicha tumanlararo sudiga","Da’vogar: {{applicant}}","Javobgar: {{lender}}, manzil: {{lenderAddress}}"], "DA’VO ARIZASI", [MFO_P1, MFO_P2, FK150_P],
        ["javobgardan qonunda belgilangan chegaradan ortiq undirilgan summani undirishni;","qonunga zid hisoblangan jarima va komissiyalarni qarz summasidan chiqarishni;","javobgardan sud xarajatlarini undirishni."],
        CIVIL_ATT + ["Shartnoma nusxasi","To‘lov jadvali","To‘lovlar ko‘chirmasi"], sub="ortiqcha undirilgan summani undirish to‘g‘risida", askLabel="Yuqoridagilarga asosan, so‘rayman:")
  ])

# ===== YO‘L-TRANSPORT =====
TR = "Jarima va avtomobil"
TFINE_P1 = "{{organ}} tomonidan[?decisionNumber] {{decisionNumber}}-son[/] qaror bilan[?plate] {{plate}} davlat raqamli avtomobil bo‘yicha[/] menga nisbatan[?fine] {{fine}} miqdorida[/] ma’muriy jarima qo‘llanilgan. Qaror nusxasini {{trigger}}da oldim."
scen(id="yhxx_jarima", domain="transport", title="YHXX jarimasiga rozi emasman", card="Radar, kamera yoki inspektor noto‘g‘ri jarima yozdi", short="Yo‘l jarimasi",
  lead="Jarima qaroriga nusxasini olgan kundan 10 kun ichida shikoyat qilinadi; YHXX jarimasiga my.gov.uz orqali elektron shikoyat ham qilish mumkin. Diqqat: shikoyat qilsangiz, tez to‘lash chegirmasi (50 yoki 70 foiz) qo‘llanmaydi.",
  keywords=["yhxb","yhxx","gai","dps","radar","kamera","tezlik","svetofor","qizil chiroq","to‘xtash","parkovka","avtomobil","mashinam","haydovchi","yo‘l harakati","inspektor","davlat raqami"],
  norms=["mjtk_shik","yhxx_el","mjtk332"],
  deadline={"days":10, "label":"Shikoyat berish uchun qoldi"}, trigger="Jarima qarorini olgan sana",
  calc={"type":"fineDiscount"}, partyField="organ", amountField="fine",
  steps=[{"org":"Elektron","t":"Qaror va foto-videoni tekshiring","when":"Darhol","body":"my.gov.uz yoki bank ilovasida qaror raqami bo‘yicha surat va videoni ko‘ring: davlat raqami, vaqt va joy to‘g‘rimi."},
         {"org":"Tanlov","t":"Shikoyat yoki chegirma","when":"Hozir hal qiling","body":"Jarima to‘g‘ri bo‘lsa, 15 kun ichida yarmini to‘lab qutulish mumkin. Shikoyat qilinsa, chegirma qo‘llanmaydi."},
         {"org":"YHXX yoki sud","t":"Shikoyat bering","when":"{deadline} gacha","hot":True,"body":"my.gov.uz orqali elektron, yoki qog‘ozda yuqori turuvchi organga yoxud jinoyat ishlari bo‘yicha tuman (shahar) sudiga."}],
  evidence=["Jarima qarori (raqami bilan)","Kamera surati yoki videosi","Videoregistrator yozuvi","Avtomobil o‘sha vaqtda boshqa joyda bo‘lganini tasdiqlovchi dalil (chek, GPS)","Avtomobil sotilgan yoki boshqa shaxsga ishonchnoma bilan berilgan bo‘lsa — hujjat","Guvohlar"],
  fields=[
    F("organ","Jarima solgan organ","organ nomi", group=TR, hint="Toshkent sh. IIB YHXB"),
    F("decisionNumber","Qaror raqami","qaror raqami", group=TR),
    F("plate","Avtomobil davlat raqami","davlat raqami", group=TR, hint="01 A 123 BC"),
    F("fine","Jarima summasi, so‘m","jarima summasi","money", group=TR, calc=True),
    F("reason","Nega jarima noto‘g‘ri","shikoyat asosi","textarea", group=TR, hint="Avtomobil o‘sha kuni boshqa shaharda edi, raqami soxtalashtirilgan"),
    F("higherOrgan","Yuqori turuvchi organ","yuqori organ", group=TR, docs=["higher"], hint="IIV YHXX bosh boshqarmasi"),
    F("district","Tuman yoki shahar","tuman/shahar", group=TR, docs=["court"], hint="Mirobod tumani")
  ],
  docs=[
    doc("higher","Yuqori organga", ["{{higherOrgan}}ga","fuqaro {{applicant}} dan"], "SHIKOYAT", [TFINE_P1, FINE_P2, FINE_P3],
        ["{{organ}}ning qarorini bekor qilishni va ish yuritishni tugatishni;","ishni, shu jumladan foto va video materiallarni to‘liq va xolis qayta o‘rganishni."],
        ["Qaror nusxasi","Dalillar (foto, video) nusxasi"], sub="ma’muriy huquqbuzarlik to‘g‘risidagi ish bo‘yicha qarorga"),
    doc("court","Sudga", ["{{district}} jinoyat ishlari bo‘yicha sudiga","Shikoyatchi: {{applicant}}","Qaror chiqargan organ: {{organ}}"], "SHIKOYAT", [TFINE_P1, FINE_P2, FINE_P3],
        ["{{organ}}ning qarorini bekor qilishni va ma’muriy huquqbuzarlik to‘g‘risidagi ish yuritishni tugatishni."],
        ["Shikoyat nusxasi","Qaror nusxasi","Dalillar (foto, video) nusxasi"], sub="ma’muriy huquqbuzarlik to‘g‘risidagi ish bo‘yicha qarorga", askLabel="Yuqoridagilarga asosan, so‘rayman:")
  ])

INS = "Sug‘urta va zarar"
OSGO_P1 = "[?accidentDate]{{accidentDate}}da [/]sodir bo‘lgan yo‘l-transport hodisasida mening avtomobilimga zarar yetkazildi. Aybdor haydovchining fuqarolik javobgarligi {{insurer}}da sug‘urtalangan[?policy] (polis: {{policy}})[/]. {{trigger}}da zararni qoplash to‘g‘risida yozma ariza berdim. Zarar miqdori {{damage}}ni tashkil etadi.[?paid] Sug‘urtachi faqat {{paid}} to‘ladi.[/]"
OSGO_P2 = "«Transport vositalari egalarining fuqarolik javobgarligini majburiy sug‘urta qilish to‘g‘risida»gi Qonunning 23-moddasiga ko‘ra sug‘urtachi arizadan keyin 15 kundan kechiktirmay sug‘urta to‘lovi yoki rad etish to‘g‘risida qaror qabul qilishi, to‘lovni esa qaror qabul qilingan kundan 5 ish kunidan kechiktirmay amalga oshirishi shart."
scen(id="osgo", domain="transport", title="Avtohalokatdan keyin sug‘urta to‘lamayapti", card="OSGO bo‘yicha sug‘urta kompaniyasi zararni qoplamayapti yoki kam to‘layapti", short="OSGO",
  lead="Sug‘urtachi arizangizdan keyin 15 kun ichida to‘lash yoki rad etish to‘g‘risida qaror chiqarishi, qarordan keyin 5 ish kunida pulni to‘lashi shart. Rad etish yoki kam to‘lov ustidan sudga murojaat qilasiz.",
  keywords=["osgo","osago","sug‘urta","strahovka","avtohalokat","yth","dtp","avariya bo‘ldi","urib ketdi","mashinamni urdi","mashinamga urildi","baholash","sug‘urta kompaniyasi","polis"],
  norms=["osgo23","osgo19","osgo25","fk150"],
  deadline={"years":3, "label":"Da’vo muddati tugashiga qoldi", "note":"Sug‘urtachi arizadan keyin 15 kun ichida qaror chiqarishi va 5 ish kunida to‘lashi shart (23-modda)."},
  trigger="Sug‘urtachiga ariza bergan sana",
  calc=None, partyField="insurer", amountField="damage",
  steps=[{"org":"Sug‘urtachi","t":"Yozma ariza bering","when":"Imkon qadar tez","body":"YTH ma’lumotnomasi, polis, avtomobil hujjatlari va zarar suratlarini ilova qiling, qabul belgisini oling."},
         {"org":"Sug‘urtachi","t":"Qaror muddati","when":"{t+15} gacha","body":"Shu sanagacha to‘lash yoki asoslangan rad etish to‘g‘risida qaror chiqarilishi kerak; to‘lov qarordan keyin 5 ish kunida."},
         {"org":"Baholovchi","t":"Kam to‘lansa, mustaqil baholating","when":"Qarordan keyin","body":"Litsenziyali baholovchining hisoboti sudda asosiy dalil bo‘ladi."},
         {"org":"Sud","t":"Sug‘urta pulini undiring","when":"{deadline} gacha","hot":True,"body":"Fuqarolik sudiga da’vo: to‘lanmagan sug‘urta to‘lovi, baholash va sud xarajatlari."}],
  evidence=["OSGO polisi (aybdorniki)","YTH sxemasi va YHXX ma’lumotnomasi","Sug‘urtachiga ariza nusxasi (qabul belgisi bilan)","Mustaqil baholash hisoboti","Avtomobil foto va videosi","Ta’mirlash xarajatlari cheklari"],
  fields=[
    F("insurer","Sug‘urta kompaniyasi","sug‘urtachi nomi", group=INS, hint="«…» sug‘urta kompaniyasi AJ"),
    F("insurerAddress","Sug‘urta kompaniyasi manzili","sug‘urtachi manzili", group=INS, docs=["court"]),
    F("policy","Aybdorning OSGO polisi raqami","polis raqami", group=INS),
    F("accidentDate","YTH sanasi","YTH sanasi","date", group=INS),
    F("damage","Zarar summasi (baholash bo‘yicha), so‘m","zarar summasi","money", group=INS),
    F("paid","Sug‘urtachi to‘lagan summa, so‘m (bo‘lsa)","to‘langan summa","money", group=INS),
    F("district","Tuman yoki shahar","tuman/shahar", group=INS, docs=["court"], hint="Olmazor tumani")
  ],
  docs=[
    doc("insurer","Sug‘urtachiga", ["{{insurer}} rahbariga","jabrlanuvchi {{applicant}} dan"], "TALABNOMA", [OSGO_P1, OSGO_P2],
        ["sug‘urta to‘lovini zarar miqdorida to‘liq amalga oshirishni;","to‘lov rad etilgan yoki kamaytirilgan bo‘lsa, asoslarini yozma ravishda bildirishni."],
        ["YTH ma’lumotnomasi nusxasi","Baholash hisoboti nusxasi"], sub="sug‘urta to‘lovini amalga oshirish to‘g‘risida", askLabel="Talab qilaman:",
        closing="Talabim qondirilmagan taqdirda sudga murojaat qilishimni ma’lum qilaman."),
    doc("court","Sudga", ["{{district}} fuqarolik ishlari bo‘yicha tumanlararo sudiga","Da’vogar: {{applicant}}","Javobgar: {{insurer}}, manzil: {{insurerAddress}}"], "DA’VO ARIZASI", [OSGO_P1, OSGO_P2, FK150_P],
        ["javobgardan mening foydamga to‘lanmagan sug‘urta to‘lovini undirishni;","javobgardan mustaqil baholash va sud xarajatlarini undirishni."],
        CIVIL_ATT + ["YTH ma’lumotnomasi nusxasi","Sug‘urtachiga ariza nusxasi","Baholash hisoboti nusxasi"], sub="sug‘urta to‘lovini undirish to‘g‘risida", askLabel="Yuqoridagilarga asosan, so‘rayman:")
  ])

# ===== PENSIYA VA NAFAQA =====
ADM_COURT = ["{{district}} tumanlararo ma’muriy sudiga","Arizachi: {{applicant}}","Javobgar: {{agency}}"]
ADM_P = "Ma’muriy organning qarori ustidan huquq buzilganligi ma’lum bo‘lgan kundan e’tiboran olti oy ichida ma’muriy sudga murojaat qilish mumkin. Mazkur muddat {{deadline}}da tugaydi."
PEN = "Pensiya"
PEN_P1 = "{{trigger}}da {{agency}} tomonidan [?pensionType]{{pensionType}} [/]pensiyam bo‘yicha qaror qabul qilinganini bildim. Qaror quyidagi sababga ko‘ra noto‘g‘ri: {{issue}}."
PEN_P2 = "«Fuqarolarning davlat pensiya ta’minoti to‘g‘risida»gi Qonunning 45-moddasiga ko‘ra pensiya tayinlash to‘g‘risidagi ariza 10 kun ichida ko‘rib chiqiladi, 49-moddasiga ko‘ra pensioner arizasiga binoan pensiya qayta hisoblanadi, 48-moddasiga ko‘ra esa pensiya tayinlash to‘g‘risidagi qaror ustidan sudga shikoyat qilinishi mumkin."
scen(id="pensiya", domain="nafaqa", title="Pensiya tayinlanmadi yoki kam hisoblandi", card="Pensiya rad etildi, kechiktirildi yoki staj to‘liq hisobga olinmadi", short="Pensiya",
  lead="Pensiya arizasi 10 kun ichida ko‘rib chiqilishi kerak. Rad javobi yoki noto‘g‘ri hisob-kitob ustidan yuqori organga va sudga shikoyat qilasiz; qo‘shimcha staj hujjatlari bilan qayta hisoblashni so‘raysiz.",
  keywords=["pensiya","pensiyam","pensioner","nafaqaxo‘r","staj","ish staji","pensiya jamg‘armasi","pensiyani kam","pensiya tayinla","nogironlik pensiyasi","boquvchisini yo‘qotgan","arxiv ma’lumotnoma"],
  norms=["pens45","pens49","pens48","pens47","msk6","mq36"],
  deadline={"months":6, "label":"Ma’muriy sudga murojaat uchun qoldi"}, trigger="Qaror haqida bilgan sanangiz",
  calc=None, partyField="agency",
  steps=[{"org":"Pensiya jamg‘armasi","t":"Qaror va hisob-kitob nusxasini so‘rang","when":"Darhol","body":"Qaysi staj va ish haqi davrlari hisobga olinmaganini aniqlang."},
         {"org":"Pensiya jamg‘armasi","t":"Qayta hisoblash arizasi bering","when":"Hujjatlar to‘plangach","body":"Arxiv ma’lumotnomasi, mehnat daftarchasi va ish haqi ma’lumotnomalarini ilova qiling."},
         {"org":"Yuqori organ","t":"Shikoyat yozing","when":"Rad etilsa","body":"Pensiya jamg‘armasining viloyat (shahar) boshqarmasiga. Javobni kutib, sud muddatini o‘tkazib yubormang."},
         {"org":"Ma’muriy sud","t":"Qarorni qonunga xilof deb topishni so‘rang","when":"{deadline} gacha","hot":True,"body":"Jismoniy shaxslar ma’muriy sudga ariza berishda davlat boji to‘lamaydi."}],
  evidence=["Pensiya bo‘yicha qaror yoki rad javobi","Mehnat daftarchasi","Arxiv ma’lumotnomalari (staj va ish haqi)","Pasport va JShShIR","Pensiya hisob-kitobi"],
  fields=[
    F("agency","Qaror chiqargan organ","organ nomi", group=PEN, hint="Pensiya jamg‘armasining Chilonzor tumani bo‘limi"),
    F("pensionType","Pensiya turi","pensiya turi", group=PEN, hint="yosh bo‘yicha"),
    F("issue","Nima noto‘g‘ri","noto‘g‘ri jihati","textarea", group=PEN, hint="1995–2001-yillardagi kolxozdagi stajim hisobga olinmadi"),
    F("higherAgency","Yuqori turuvchi organ","yuqori organ", group=PEN, docs=["higher"], hint="Pensiya jamg‘armasining Toshkent shahar boshqarmasi"),
    F("district","Tuman yoki shahar","tuman/shahar", group=PEN, docs=["court"], hint="Chilonzor tumani")
  ],
  docs=[
    doc("higher","Yuqori organga", ["{{higherAgency}}ga","fuqaro {{applicant}} dan"], "SHIKOYAT", [PEN_P1, PEN_P2],
        ["qarorni qayta ko‘rib chiqishni;","barcha staj va ish haqi davrlarini hisobga olib, pensiyani qonunga muvofiq tayinlash (qayta hisoblash) yuzasidan ko‘rsatma berishni."],
        ["Qaror nusxasi","Staj va ish haqini tasdiqlovchi hujjatlar nusxasi"], sub="pensiya bo‘yicha qarorga"),
    doc("court","Ma’muriy sudga", ADM_COURT, "ARIZA", [PEN_P1, PEN_P2, ADM_P],
        ["{{agency}}ning pensiya bo‘yicha qarorini qonunga xilof deb topishni;","javobgarni pensiyani qonunga muvofiq tayinlash (qayta hisoblash)ga majburlashni."],
        ["Ariza nusxasi (javobgar uchun)","Pasport nusxasi","Qaror nusxasi","Staj va ish haqini tasdiqlovchi hujjatlar nusxasi"],
        sub="pensiya bo‘yicha qarorni qonunga xilof deb topish to‘g‘risida", askLabel="Yuqoridagilarga asosan, so‘rayman:")
  ])

BEN = "Nafaqa"
BEN_P1 = "Men {{benefitType}} olish uchun ariza bergan edim. {{trigger}}da {{agency}} tomonidan rad javobi berildi[?reasonGiven], sabab sifatida «{{reasonGiven}}» ko‘rsatilgan[/]."
BEN_P2 = "Rad etish asossiz, chunki: {{objection}}."
BEN_P3 = "«Jismoniy va yuridik shaxslarning murojaatlari to‘g‘risida»gi Qonunga ko‘ra murojaat bo‘yicha qaror ustidan yuqori turuvchi organga yoki sudga shikoyat qilish mumkin."
scen(id="ijtimoiy_nafaqa", domain="nafaqa", title="Ijtimoiy nafaqa rad etildi yoki to‘xtatildi", card="Kam ta’minlangan oila, bolalar yoki nogironlik nafaqasi berilmadi", short="Nafaqa",
  lead="Nafaqa bo‘yicha rad javobi — davlat organining qarori. Uning sababini yozma so‘rang, xato ma’lumotni tuzating, yuqori organga shikoyat qiling yoki 6 oy ichida ma’muriy sudga murojaat qiling.",
  keywords=["nafaqa","nafaqam","nafaqani","bolalar nafaqasi","kam ta’minlangan","ijtimoiy yordam","ijtimoiy himoya","temir daftar","nogironlik","inson markazi","moddiy yordam","ijtimoiy reyestr"],
  norms=["msk6","msk_tikla","mq28","mq36","mq5"],
  deadline={"months":6, "label":"Ma’muriy sudga murojaat uchun qoldi"}, trigger="Rad javobini olgan sana",
  calc=None, partyField="agency",
  steps=[{"org":"«Inson» markazi","t":"Rad javobining sababini yozma so‘rang","when":"Darhol","body":"Qaysi mezon bo‘yicha (daromad, mulk, oila tarkibi) rad etilgani ko‘rsatilishi kerak."},
         {"org":"«Inson» markazi","t":"Xato ma’lumotni tuzating","when":"Imkon qadar tez","body":"Daromad yoki oila tarkibi noto‘g‘ri olingan bo‘lsa, tasdiqlovchi ma’lumotnoma bilan qayta ariza bering."},
         {"org":"Yuqori organ","t":"Shikoyat yozing","when":"Rad etilsa","body":"Ijtimoiy himoya milliy agentligining hududiy boshqarmasiga."},
         {"org":"Ma’muriy sud","t":"Rad javobini qonunga xilof deb topishni so‘rang","when":"{deadline} gacha","hot":True,"body":"Jismoniy shaxslar ma’muriy sudga ariza berishda davlat boji to‘lamaydi."}],
  evidence=["Rad javobi yoki to‘xtatish haqidagi xabar","Ariza nusxasi (yoki elektron ariza raqami)","Oila tarkibi haqida ma’lumotnoma","Daromad haqida ma’lumotnomalar","Nogironlik yoki bolalar haqidagi hujjatlar"],
  fields=[
    F("agency","Rad etgan organ","organ nomi", group=BEN, hint="Chilonzor tumani «Inson» ijtimoiy xizmatlar markazi"),
    F("benefitType","Nafaqa turi","nafaqa turi", group=BEN, hint="kam ta’minlangan oilalarga bolalar nafaqasi"),
    F("reasonGiven","Rad etish sababi (qanday yozilgan)","rad etish sababi", group=BEN),
    F("objection","Nega rad etish noto‘g‘ri","e’tiroz","textarea", group=BEN, hint="Oila daromadi noto‘g‘ri hisoblangan: turmush o‘rtog‘im 2026-yil iyuldan ishsiz"),
    F("higherAgency","Yuqori turuvchi organ","yuqori organ", group=BEN, docs=["higher"], hint="Ijtimoiy himoya milliy agentligining Toshkent shahar boshqarmasi"),
    F("district","Tuman yoki shahar","tuman/shahar", group=BEN, docs=["court"], hint="Chilonzor tumani")
  ],
  docs=[
    doc("higher","Yuqori organga", ["{{higherAgency}}ga","fuqaro {{applicant}} dan"], "SHIKOYAT", [BEN_P1, BEN_P2, BEN_P3],
        ["rad javobini qayta ko‘rib chiqishni;","{{agency}}ga nafaqani qonunga muvofiq tayinlash yuzasidan ko‘rsatma berishni."],
        ["Rad javobi nusxasi","Daromad va oila tarkibi haqidagi ma’lumotnomalar"], sub="nafaqa tayinlashni rad etish to‘g‘risidagi qarorga"),
    doc("court","Ma’muriy sudga", ADM_COURT, "ARIZA", [BEN_P1, BEN_P2, ADM_P],
        ["{{agency}}ning nafaqa tayinlashni rad etish to‘g‘risidagi qarorini qonunga xilof deb topishni;","javobgarni nafaqa tayinlash masalasini qonunga muvofiq qayta ko‘rib chiqishga majburlashni."],
        ["Ariza nusxasi (javobgar uchun)","Pasport nusxasi","Rad javobi nusxasi","Daromad va oila tarkibi haqidagi ma’lumotnomalar"],
        sub="nafaqa tayinlashni rad etish to‘g‘risidagi qarorni qonunga xilof deb topish to‘g‘risida", askLabel="Yuqoridagilarga asosan, so‘rayman:")
  ])

# ===== MEHNAT MIGRANTLARI =====
MIG = "Agentlik"
MIG_TO = ["Vazirlar Mahkamasi huzuridagi Migratsiya agentligiga","fuqaro {{applicant}} dan"]
REC_P1 = "{{trigger}}da {{recruiter}} bilan meni {{country}}ga ishga joylashtirish bo‘yicha kelishdim va[?paid] {{paid}}[/] pul to‘ladim. Biroq majburiyat bajarilmadi: {{promise}}."
REC_P2 = "«Xususiy bandlik agentliklari to‘g‘risida»gi Qonunning 15-moddasiga ko‘ra xizmat ko‘rsatish shartnomasi yozma tuziladi, izlovchi to‘lagan pul maxsus depozitga qo‘yiladi va agentlikka faqat shartnoma bajarilgandan keyin o‘tkaziladi. Majburiyat bajarilmagani sababli to‘langan pul qaytarilishi kerak."
scen(id="migrant_agentlik", domain="migrant", title="Xorijga ishga yuborish va’dasi bilan aldashdi", card="Agentlik yoki vositachi pul oldi, lekin ishga yubormadi yoki va’da qilingan ish bo‘lmadi", short="Bandlik agentligi",
  lead="Xorijga ishga yuborish faqat litsenziyali xususiy bandlik agentligi orqali, yozma shartnoma bilan bo‘ladi. To‘langan pul maxsus depozitda saqlanadi va agentlikka faqat shartnoma bajarilgach o‘tkaziladi. Pulni qaytarishni talab qiling va Migratsiya agentligiga shikoyat qiling.",
  keywords=["bandlik agentligi","agentlik","vositachi","posrednik","chet elga ishga","xorijga ishga","koreyaga","rossiyaga","yevropaga","polshaga","viza","ishga yubor","ishga olib ket","aldashdi","pulimni olib"],
  norms=["xab15","xab15_1","xab20","xab17","fk150"],
  deadline={"years":3, "label":"Da’vo muddati tugashiga qoldi"}, trigger="Agentlikka pul to‘lagan sana",
  calc=None, partyField="recruiter", amountField="paid",
  steps=[{"org":"Agentlik","t":"Pulni qaytarishni yozma talab qiling","when":"Bugun","body":"Shartnoma va to‘lov hujjatlarini ilova qiling. Agentlik litsenziyasi raqamini so‘rang."},
         {"org":"Migratsiya agentligi","t":"Shikoyat qiling","when":"Parallel","body":"Vazirlar Mahkamasi huzuridagi Migratsiya agentligi litsenziyani tekshiradi va agentliklar ustidan nazorat qiladi. Litsenziyasiz bo‘lsa, buni albatta yozing."},
         {"org":"Politsiya","t":"Firibgarlik bo‘lsa, ariza bering","when":"Darhol","body":"Litsenziyasiz vositachi pul olib g‘oyib bo‘lsa — firibgarlik alomati. Tuman IIB yoki 102."},
         {"org":"Sud","t":"Pulni undiring","when":"{deadline} gacha","hot":True,"body":"Fuqarolik sudiga da’vo. Shartnoma, to‘lov hujjati va yozishmalar asosiy dalil."}],
  evidence=["Agentlik bilan shartnoma","To‘lov kvitansiyasi yoki bank o‘tkazmasi","Agentlik litsenziyasi (yoki litsenziya yo‘qligi haqida ma’lumot)","Yozishmalar va va’dalar (Telegram, SMS)","Viza yoki ish taklifi hujjatlari"],
  fields=[
    F("recruiter","Agentlik yoki vositachi","agentlik nomi", group=MIG, hint="«…» MChJ xususiy bandlik agentligi"),
    F("recruiterAddress","Agentlik manzili","agentlik manzili", group=MIG, docs=["recruiter","court"]),
    F("country","Qaysi davlatga","davlat", group=MIG, hint="Koreya Respublikasi"),
    F("paid","To‘langan summa, so‘m","summa","money", group=MIG),
    F("promise","Nima va’da qilingan va nima bo‘ldi","holat tavsifi","textarea", group=MIG, hint="3 oyda viza olib berishni va’da qilgan, hech narsa qilmadi va pulni qaytarmayapti"),
    F("district","Tuman yoki shahar","tuman/shahar", group=MIG, docs=["court"], hint="Qarshi shahri")
  ],
  docs=[
    doc("recruiter","Agentlikka", ["{{recruiter}} rahbariga","manzil: {{recruiterAddress}}","{{applicant}} dan"], "TALABNOMA", [REC_P1, REC_P2],
        ["to‘lagan {{paid}}ni ushbu talabnoma olingan kundan e’tiboran 10 kun ichida qaytarishni."],
        ["Shartnoma nusxasi","To‘lov hujjati nusxasi"], sub="to‘langan pulni qaytarish to‘g‘risida", askLabel="Talab qilaman:",
        closing="Pul qaytarilmagan taqdirda Migratsiya agentligiga, huquqni muhofaza qiluvchi organlarga va sudga murojaat qilishimni ma’lum qilaman."),
    doc("migration","Migratsiya agentligiga", MIG_TO, "ARIZA", [REC_P1, REC_P2],
        ["{{recruiter}} faoliyatini, shu jumladan litsenziyasi borligini tekshirishni;","to‘lagan pulimni qaytarish yuzasidan choralar ko‘rishni;","qonunbuzarlik aniqlansa, qonunda belgilangan choralarni ko‘rishni."],
        ["Shartnoma nusxasi","To‘lov hujjati nusxasi","Yozishmalar nusxasi"], sub="xususiy bandlik agentligi faoliyati yuzasidan"),
    doc("court","Sudga", ["{{district}} fuqarolik ishlari bo‘yicha tumanlararo sudiga","Da’vogar: {{applicant}}","Javobgar: {{recruiter}}, manzil: {{recruiterAddress}}","Da’vo summasi: {{paid}}"], "DA’VO ARIZASI", [REC_P1, REC_P2, FK150_P],
        ["javobgardan mening foydamga {{paid}}ni undirishni;","javobgardan sud xarajatlarini undirishni."],
        CIVIL_ATT + ["Shartnoma nusxasi","To‘lov hujjati nusxasi","Talabnoma nusxasi"], sub="to‘langan pulni undirish to‘g‘risida", askLabel="Yuqoridagilarga asosan, so‘rayman:")
  ])

MIGX = "Ish va agentlik"
ABR_P1 = "Men {{country}}da {{employerAbroad}}da ishlayman[?recruiter] (meni {{recruiter}} xususiy bandlik agentligi yuborgan)[/]. {{trigger}}dan boshlab quyidagi muammo yuzaga keldi: {{problem}}.[?wage] To‘lanmagan ish haqi taxminan {{wage}}ni tashkil etadi.[/] Hozir {{whereNow}}da turibman."
ABR_P2 = "«Xususiy bandlik agentliklari to‘g‘risida»gi Qonunning 17-moddasiga ko‘ra agentlik xorijga yuborilgan shaxslarning mehnat faoliyatini kuzatib boradi; xorijiy ish beruvchi kerakli sharoitlarni ta’minlamasa, agentlik zudlik bilan boshqa ish beruvchi topishi yoki fuqaroni O‘zbekistonga qaytarishi shart. Agentlik va xorijiy ish beruvchi izlovchi oldida solidar javobgar (15¹-modda)."
scen(id="migrant_xorij", domain="migrant", title="Xorijda maosh berilmadi yoki pasportimni olib qo‘yishdi", card="Chet eldagi ish beruvchi maosh bermayapti, hujjatni ushlab turibdi yoki sharoit va’dadagidek emas", short="Xorijdagi muammo",
  lead="Agentlik orqali ketgan bo‘lsangiz, agentlik va xorijiy ish beruvchi solidar javobgar: agentlik boshqa ish beruvchi topishi yoki sizni qaytarishi shart. Migratsiya agentligi va O‘zbekiston konsulligidan yozma yordam so‘rang.",
  keywords=["chet elda","xorijda","rossiyada","koreyada","turkiyada","pasportimni olib","pasportni olib","hujjatimni olib","qaytib kelolmay","deportatsiya","konsullik","elchixona","migrant","mehnat migranti","chet ellik ish beruvchi"],
  norms=["xab17","xab15_1","xab20"],
  deadline={"none":True, "label":"Murojaat muddati", "note":"Qat’iy muddat yo‘q — imkon qadar tez yordam so‘rang. Agentlikdan pulni undirish uchun umumiy da’vo muddati 3 yil."},
  trigger="Muammo boshlangan sana",
  calc=None, partyField="employerAbroad", amountField="wage",
  steps=[{"org":"Konsullik","t":"Elchixona yoki konsullikka murojaat qiling","when":"Darhol","hot":True,"body":"Pasport olib qo‘yilgan bo‘lsa, konsullik O‘zbekistonga qaytish uchun guvohnoma rasmiylashtirishi va mahalliy organlarga murojaatda ko‘maklashishi mumkin."},
         {"org":"Migratsiya agentligi","t":"Yordam so‘rang","when":"Darhol","body":"Agentlik orqali ketgan bo‘lsangiz, Migratsiya agentligi agentlikdan boshqa ish beruvchi topishni yoki sizni qaytarishni talab qiladi; bajarilmasa, o‘zi qaytaradi."},
         {"org":"Agentlik","t":"Yozma talab yuboring","when":"Parallel","body":"Agentlik xorijdagi ishingizni kuzatishi va muammoni hal qilishi shart (17-modda)."},
         {"org":"Sud","t":"Zararni undiring","when":"Qaytgandan keyin","body":"Agentlik va xorijiy ish beruvchi solidar javobgar: to‘lanmagan haq va xarajatlarni agentlikdan undirish mumkin."}],
  evidence=["Mehnat shartnomasi yoki ish taklifi","Agentlik bilan shartnoma (bo‘lsa)","Ish haqi to‘lanmaganini tasdiqlovchi dalillar (yozishmalar, ish vaqti yozuvlari)","Pasport nusxasi yoki fotosurati","Ish beruvchining nomi va manzili"],
  fields=[
    F("employerAbroad","Xorijiy ish beruvchi","ish beruvchi nomi", group=MIGX, hint="«…» Co., Ltd"),
    F("country","Qaysi davlatda","davlat", group=MIGX, hint="Koreya Respublikasi"),
    F("recruiter","Sizni yuborgan agentlik (bo‘lsa)","agentlik nomi", group=MIGX, hint="«…» MChJ xususiy bandlik agentligi"),
    F("wage","To‘lanmagan ish haqi (taxminan), so‘m","summa","money", group=MIGX),
    F("problem","Nima bo‘ldi","holat tavsifi","textarea", group=MIGX, hint="2 oydan beri maosh yo‘q, pasportimni ish beruvchi olib qo‘ygan"),
    F("whereNow","Hozirgi manzilingiz va aloqa","hozirgi manzil", group=MIGX, hint="Inchxon shahri, Telegram: @…")
  ],
  docs=[
    doc("migration","Migratsiya agentligiga", MIG_TO, "ARIZA", [ABR_P1, ABR_P2],
        ["huquqlarimni himoya qilish va muammoni hal qilishda ko‘maklashishni;","agentlikdan meni boshqa ish beruvchiga joylashtirish yoki O‘zbekistonga qaytarishni talab qilishni, bu bajarilmasa — qaytishimni ta’minlashni;","to‘lanmagan ish haqini undirish choralarini ko‘rishni."],
        ["Mehnat shartnomasi yoki ish taklifi nusxasi","Agentlik bilan shartnoma nusxasi (bo‘lsa)"], sub="xorijda ishlayotgan fuqaroga yordam ko‘rsatish to‘g‘risida"),
    doc("consul","Konsullikka", ["O‘zbekiston Respublikasining {{country}}dagi elchixonasi (konsulligi)ga","fuqaro {{applicant}} dan"], "ARIZA", [ABR_P1],
        ["huquqlarimni himoya qilishda ko‘maklashishni;","pasportimni qaytarib olishda yoki, zarur bo‘lsa, O‘zbekistonga qaytish uchun guvohnoma rasmiylashtirishda yordam berishni;","ish beruvchiga va mahalliy vakolatli organlarga murojaat qilishda ko‘maklashishni."],
        ["Pasport nusxasi yoki fotosurati (bo‘lsa)","Mehnat shartnomasi yoki ish taklifi nusxasi"], sub="konsullik yordami ko‘rsatish to‘g‘risida"),
    doc("recruiter","Agentlikka", ["{{recruiter}} rahbariga","{{applicant}} dan"], "TALABNOMA", [ABR_P1, ABR_P2],
        ["xorijiy ish beruvchidan to‘lanmagan ish haqini undirish uchun zudlik bilan choralar ko‘rishni;","shartnomada va’da qilingan sharoitlar ta’minlanmagani sababli meni boshqa ish beruvchiga joylashtirishni yoki O‘zbekistonga qaytarishni."],
        ["Agentlik bilan shartnoma nusxasi"], sub="xorijda ishlayotgan fuqaroning huquqlarini himoya qilish to‘g‘risida", askLabel="Talab qilaman:",
        closing="Talabim bajarilmagan taqdirda Migratsiya agentligiga va sudga murojaat qilishimni ma’lum qilaman.")
  ])

# ===== UMUMIY MUROJAAT (oxirida: teng ballda aniq holat ustun bo‘lishi uchun) =====
# Umumiy murojaat: ariza, taklif, shikoyat (Murojaatlar to‘g‘risidagi qonun; 6-modda talablari — F.I.Sh., manzil, idora, mohiyat, imzo)
GEN_TO = ["{{body}}ga", "fuqaro {{applicant}} dan"]
GEN_SUBJ = "Murojaat mavzusi: {{subject}}."
GEN_LAW = "«Jismoniy va yuridik shaxslarning murojaatlari to‘g‘risida»gi Qonunning 28-moddasiga ko‘ra murojaat kelib tushgan kundan e’tiboran 15 kun ichida, qo‘shimcha o‘rganish talab etilganda esa bir oygacha muddatda ko‘rib chiqilishi kerak."
GEN_ATT = ["Holatni tasdiqlovchi hujjatlar nusxalari"]
scen(id="murojaat_umumiy", domain="davlat", title="Davlat idorasiga ariza, taklif yoki shikoyat yozish", card="Hokimlik yoki boshqa idoraga rasmiy murojaat tayyorlash", short="Ariza, taklif, shikoyat",
  lead="Davlat idorasiga ariza, taklif yoki shikoyatni yozma, elektron yoki og‘zaki shaklda yuborish mumkin. Yozma murojaatda F.I.Sh., yashash manzili, idora nomi, masala mohiyati va imzo bo‘lishi shart. Idora 15 kunda, qo‘shimcha o‘rganish kerak bo‘lsa 1 oygacha javob beradi.",
  keywords=["ariza yozmoqchiman","hokimlikka murojaat","taklif bermoqchiman","shikoyat qilmoqchiman","davlat idorasiga"],
  norms=["mq5","mq6","mq28","mq36","mq38"],
  deadline={"none":True, "label":"Murojaat muddati", "note":"Murojaatni topshirganingizdan keyin idora 15 kun ichida, qo‘shimcha o‘rganish kerak bo‘lsa 1 oygacha javob berishi shart (28-modda). Javob bo‘lmasa, «Javobsiz murojaat» holatidan foydalaning."},
  trigger="Murojaat topshirilgan sana",
  calc=None, partyField="body",
  steps=[{"org":"Siz","t":"Murojaat turini tanlang va yozing","when":"Bugun","body":"Ariza — huquqingizni amalga oshirishda yordam so‘rash; taklif — davlat va jamiyat faoliyatini takomillashtirishga doir tavsiyalar bayon etilgan murojaat; shikoyat — buzilgan huquqingizni tiklashni talab qilish. F.I.Sh., yashash manzili, idora nomi, masala mohiyati va imzo bo‘lishi shart (6-modda)."},
         {"org":"Mas’ul idora","t":"Mas’ul idoraga topshiring","when":"Tayyor bo‘lgach","body":"murojaat.gov.uz, idoraning virtual qabulxonasi, shaxsan yoki pochta orqali: barcha shakllar teng kuchga ega (5-modda)."},
         {"org":"Mas’ul idora","t":"Kiruvchi raqamni saqlang","when":"Topshirgan kuni","body":"Qog‘ozda topshirsangiz, ikkinchi nusxaga kiruvchi raqam va sanani qo‘ydiring. Elektron murojaatda uning raqamini yozib oling."},
         {"org":"Mas’ul idora","t":"Javobni kuting","when":"{t+15} gacha","body":"Javob 15 kun ichida, qo‘shimcha o‘rganish kerak bo‘lsa 1 oygacha berilishi kerak (28-modda). Muddat uzaytirilsa, sizga xabar berilishi shart."},
         {"org":"Yuqori organ","t":"Javob bo‘lmasa — shikoyat","when":"Muddat o‘tgach","body":"Yuqori turuvchi organga yoki Prezidentning virtual qabulxonasiga (pm.gov.uz). Shikoyat matni «Javobsiz murojaat» holatida tayyor."},
         {"org":"Ma’muriy sud","t":"Harakatsizlik ustidan sudga","when":"Kerak bo‘lsa","body":"Murojaat ko‘rib chiqilmasa, idoraning harakatsizligi ustidan ma’muriy sudga murojaat qilish mumkin (36-modda). Ariza «Javobsiz murojaat» holatida tayyorlanadi."}],
  evidence=["Holatni tasdiqlovchi hujjatlar nusxalari","Idoradan ilgari olingan javoblar (bo‘lsa)","Fotosuratlar (bo‘lsa)"],
  fields=[
    F("body","Qaysi idoraga","idora nomi", group=GOV, hint="Chilonzor tumani hokimligi"),
    F("subject","Qisqacha mavzu","mavzu", group=GOV, hint="Mahalladagi yo‘lni ta’mirlash"),
    F("facts","Nima bo‘ldi","holat bayoni","textarea", group=GOV, hint="Ko‘chamizdagi yo‘l 2 yildan beri ta’mirlanmagan, yomg‘irdan keyin suv to‘planib qoladi."),
    F("request","Nimani so‘raysiz","so‘rov yoki taklif","textarea", group=GOV, hint="yo‘lni 2027-yil ta’mirlash rejasiga kiritishni")
  ],
  docs=[
    doc("ariza","Ariza", GEN_TO, "ARIZA", [GEN_SUBJ, "{{facts}}", GEN_LAW],
        ["{{request}}","murojaatim ko‘rib chiqilishi natijasi to‘g‘risida menga qonunda belgilangan muddatda yozma javob berishni."], GEN_ATT),
    doc("taklif","Taklif", GEN_TO, "TAKLIF", [GEN_SUBJ, "{{facts}}", GEN_LAW],
        ["{{request}}"], GEN_ATT, askLabel="Taklif qilaman:",
        closing="Taklifim ko‘rib chiqilishi natijasi to‘g‘risida menga qonunda belgilangan muddatda yozma javob berishingizni so‘rayman."),
    doc("shikoyat","Shikoyat", GEN_TO, "SHIKOYAT", [GEN_SUBJ, "{{facts}}", "Ushbu holat bilan huquq va qonuniy manfaatlarim buzilgan deb hisoblayman.", GEN_LAW],
        ["{{request}}","shikoyatim ko‘rib chiqilishi natijasi to‘g‘risida menga qonunda belgilangan muddatda yozma javob berishni."],
        GEN_ATT + ["Avvalgi murojaat va olingan javob nusxalari (bo‘lsa)"])
  ])


# ===== MEDIATSIYA (ixtiyoriy qadam + mediatsiya taklifi xati) =====
# «Mediatsiya to‘g‘risida»gi Qonun (ZRU-482): 7-modda — ixtiyoriylik; 22-modda — mediatorni tomonlar birgalikda tanlaydi.
# Sud muddati to‘xtashi faqat mehnat nizolari uchun aytiladi (MK 560-modda). Boshqa holatlarda bu da’vo qilinmaydi.
MED_LABOR = {"ish_haqi", "hisob_kitob", "tatil"}
MED_DISPUTE = {
  "ish_haqi": "ish haqi to‘lanmagani[?amount] (qarz: {{amount}})[/]",
  "hisob_kitob": "bo‘shatishdagi hisob-kitob[?amount] (qarz: {{amount}})[/]",
  "tatil": "mehnat ta’tili berilmagani",
  "nuqsonli_tovar": "sotib olingan {{product}}dagi nuqson[?price] (narxi: {{price}})[/]",
  "ijara_depozit": "ijara garov puli[?deposit] ({{deposit}})[/] qaytarilmagani",
  "qarz": "qarz[?amount] ({{amount}})[/] qaytarilmagani",
  "kommunal_hisob": "{{service}} xizmati uchun hisob[?overcharge] (ortiqcha hisoblangan summa: {{overcharge}})[/]",
}
MED_VOLUNTARY = "Mediatsiya ixtiyoriy: tomonlar undan istalgan bosqichda voz kechishi mumkin (Mediatsiya to‘g‘risidagi qonun, 7-modda)."
MED_PAUSE = "Nizo mediatsiyada ko‘rilayotgan davrda sudga murojaat qilish muddati to‘xtab turadi (MK 560-modda)."
def med_step(labor):
    body = "Ikkala tomon rozi bo‘lsa, nizoni ular birgalikda tanlagan mediator yordamida sudsiz hal qilish mumkin. " + MED_VOLUNTARY + " "
    body += (MED_PAUSE + " Ish beruvchiga «Mediatsiya taklifi» xatini yuboring.") if labor else \
            "Sudga murojaat muddatini kuzatib boring: kelishuvga erishilmasa, sudga o‘z vaqtida murojaat qiling. Qarshi tomonga «Mediatsiya taklifi» xatini yuboring."
    return {"org":"Mediator", "t":"Mediator orqali kelishib ko‘ring (ixtiyoriy)", "when":"Sudga murojaat qilishdan oldin", "body": body}
def med_doc(sc):
    labor = sc["id"] in MED_LABOR
    body = ["O‘rtamizda " + MED_DISPUTE[sc["id"]] + " bo‘yicha kelishmovchilik mavjud.",
            "Nizoni sudga murojaat qilmasdan, tinch yo‘l bilan hal qilish maqsadida uni mediatsiya orqali — ikkala tomon birgalikda tanlaydigan mustaqil mediator ishtirokida ko‘rib chiqishni taklif qilaman. Mediatsiya ixtiyoriy bo‘lib, tomonlar undan istalgan bosqichda voz kechishi mumkin («Mediatsiya to‘g‘risida»gi Qonun, 7-modda)."]
    if labor: body.append("Mehnat kodeksining 560-moddasiga ko‘ra nizo mediatsiyada ko‘rilayotgan davrda sudga murojaat qilish muddati to‘xtab turadi.")
    body.append("Taklifimga ushbu xatni olgan kundan boshlab 10 kun ichida yozma javob berishingizni so‘rayman. Bu muddat qonunda belgilangan emas — u taklif sifatida ko‘rsatilmoqda.")
    return doc("mediatsiya", "Mediatsiya taklifi", list(sc["docs"][0]["to"]), "TAKLIF", body,
               ["nizoni mediatsiya orqali hal qilishga roziligingizni yozma ravishda bildirishni;",
                "mediator nomzodi, uchrashuv vaqti va joyini birgalikda kelishib olishni."],
               ["Nizoga oid hujjatlar nusxalari (bo‘lsa)"], sub="nizoni mediatsiya orqali hal qilish to‘g‘risida", askLabel="Taklif qilaman:",
               closing="Kelishuvga erishilmasa, huquqlarimni qonunda belgilangan boshqa yo‘llar bilan himoya qilishimni ma’lum qilaman.")
for sc in S:
    if sc["id"] not in MED_DISPUTE: continue
    ci = next(i for i, st in enumerate(sc["steps"]) if st["org"] == "Sud")
    sc["steps"].insert(ci, med_step(sc["id"] in MED_LABOR))
    di = next((i for i, d in enumerate(sc["docs"]) if d["id"] == "court"), len(sc["docs"]))
    first = sc["docs"][0]["id"]
    sc["docs"].insert(di, med_doc(sc))
    for f in sc["fields"]:                       # xat manzilidagi maydonlar (masalan, rahbar F.I.Sh.) shu xatda ham ko‘rinsin
        if f.get("docs") and first in f["docs"]: f["docs"] = f["docs"] + ["mediatsiya"]
    sc["norms"] = sc["norms"] + ["med7"]

# ---------- «Qanday topshiriladi» ----------
L_SUD = {"label":"Sudlarning interaktiv xizmatlari — my.sud.uz", "url":"https://my.sud.uz/"}
L_PM = {"label":"Prezidentning virtual qabulxonasi — pm.gov.uz", "url":"https://pm.gov.uz/"}
L_YHXX = {"label":"YHXX jarimasiga elektron shikoyat — my.gov.uz", "url":"https://my.gov.uz/oz/service/1054"}
L_CBU = {"label":"Markaziy bank — iste’molchilar huquqlarini himoya qilish", "url":"https://cbu.uz/ru/consumer-protection/"}
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
    "Qog‘ozda topshirsangiz, ikkinchi nusxaga qabul belgisini qo‘ydiring."], "links":[L_YHXX]},
  "cbu": {"steps":[
    "Avval bank yoki tashkilotning o‘ziga yozma murojaat qiling va javob oling.",
    "Markaziy bankka: ishonch telefoni (71) 200-00-44, cbu.uz saytidagi virtual qabulxona yoki murojaat.gov.uz orqali.",
    "Tashkilotga yuborgan arizangiz, javob, shartnoma va ko‘chirma nusxalarini ilova qiling."], "links":[L_CBU]}
}
FEE = {
  "mehnat": "Mehnat nizolarida xodim sud xarajatlaridan ozod.",
  "aliment": "Aliment da’vosida davlat boji to‘lanmaydi.",
  "admin": "Jismoniy shaxslar ma’muriy sudga ariza berishda davlat boji to‘lamaydi; ariza rad etilsa, BHMning 70 foizi undiriladi.",
  "qarz": "Davlat boji to‘lanadi, miqdori da’vo summasiga bog‘liq. To‘lov kvitansiyasini ilova qiling.",
  "civil": "Davlat boji to‘lanishi mumkin: miqdori va imtiyozlar bor-yo‘qligini sud devonxonasida yoki my.sud.uz da aniqlang."
}
# Hujjat turi va sud boji turi (ruscha baza ham shu funksiyalardan foydalanadi)
FINE_IDS = {"jarima", "yhxx_jarima"}
PRIVATE_DOCS = {"mediatsiya","employer","seller","debtor","landlord","provider","bank","lender","insurer","recruiter"}
def howto_kind(sc, d):
    if sc["id"] in FINE_IDS: return "fine"
    if d["id"] in PRIVATE_DOCS: return "private"
    if d["id"] == "court": return "court"
    if d["id"] == "cbu": return "cbu"
    return "state"
def fee_key(sc):
    if sc["domain"] in ("davlat", "nafaqa"): return "admin"
    if sc["domain"] == "mehnat": return "mehnat"
    if sc["id"] in ("aliment", "qarz"): return sc["id"]
    if sc["domain"] in ("ijara", "kommunal", "bank", "transport", "migrant"): return "civil"
    return None
for sc in S:
    for d in sc["docs"]:
        kind = howto_kind(sc, d)
        h = {"steps": list(HOW[kind]["steps"]), "links": list(HOW[kind]["links"])}
        if kind == "court":
            fk = fee_key(sc)
            if fk: h["steps"].append(FEE[fk])
        if sc["id"] in FINE_IDS and d["id"] == "court": h["links"] = []
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
RU = kb_ru.build_ru(S, howto_kind, fee_key)
# Dalillar yo‘riqnomasi va idoralar (ikki tilda bitta manbadan)
import kb_evidence, kb_offices
for s_ in S:
    ev = kb_evidence.EVID[s_["id"]]
    assert len(ev) == len(s_["evidence"]), ("evidenceInfo", s_["id"])
    assert all(n in ("m", "f") for n, _, _ in ev)
    s_["evidenceInfo"] = [{"need": n, "how": uz} for n, uz, _ in ev]
    RU["scenarios"][s_["id"]]["evidenceInfo"] = [{"how": ru} for _, _, ru in ev]
kb_offices.attach(S)
OFFICES = [{"id": k, **v} for k, v in kb_offices.OFFICES.items()]
assert set(kb_offices.OFFICES_RU) == set(kb_offices.OFFICES)
for k, r in kb_offices.OFFICES_RU.items():
    u = kb_offices.OFFICES[k]
    for key in ("phones", "abroad", "links"):
        assert len(r.get(key, [])) == len(u.get(key, [])), (k, key)
    assert set(r) <= set(u), (k, set(r) - set(u))
RU["offices"] = kb_offices.OFFICES_RU
RU["officesChecked"] = kb_offices.CHECKED
assert set(RU["norms"]) == ids and set(RU["laws"]) == set(LAWS)
for name, data in (("ru", RU), ("laws", LAWS), ("domains", DOMAINS), ("norms", N), ("scenarios", S), ("applicant", APPLICANT), ("offices", {"checked": kb_offices.CHECKED, "list": OFFICES})):
    with open(os.path.join(OUT, name + ".json"), "w", encoding="utf-8") as f: json.dump(data, f, ensure_ascii=False, indent=1)
print(len(N), "norma;", len(S), "holat;", len(DOMAINS), "soha")
