# «Qayerga murojaat qilish»: idoralar manzili va aloqa ma’lumotlari.
# QOIDA: har bir qiymat faqat idoraning o‘z rasmiy sahifasidan olinadi va `src` da shu sahifa ko‘rsatiladi.
# Tasdiqlab bo‘lmagan maydon (masalan, manzil) bo‘sh qoldiriladi — taxmin yozilmaydi.
# Raqamlarni yangilaganda CHECKED sanasini ham yangilang.

CHECKED = "2026-11-19"

def P(label, text, tel=None):
    return {"label": label, "text": text, "tel": tel or "".join(c for c in text.split("(")[0] if c.isdigit() or c == "+")}
def L(label, url): return {"label": label, "url": url}

OFFICES = {
  "dmi": {
    "name": "Davlat mehnat inspeksiyasi",
    "parent": "Kambag‘allikni qisqartirish va bandlik vazirligi",
    "role": "Ish beruvchi mehnat qonunchiligini buzsa, tekshiradi va majburiy ko‘rsatma beradi.",
    "address": "100100, Toshkent sh., Mirobod tumani, Nukus ko‘chasi, 8-uy (vazirlik)",
    "hours": "Du–Ju 9:00–18:00, tushlik 13:00–14:00",
    "phones": [P("Vazirlik ishonch telefoni", "+998 71 200-06-00"), P("Vazirlik", "+998 71 203-01-30")],
    "links": [L("Davlat mehnat inspeksiyasi — dmi.mehnat.uz", "https://dmi.mehnat.uz/")],
    "local": L("Hududiy bo‘linmalar ro‘yxati", "https://gov.uz/oz/bv/departments/regional"),
    "src": "https://gov.uz/oz/bv/contacts"
  },
  "raqobat": {
    "name": "Raqobatni rivojlantirish va iste’molchilar huquqlarini himoya qilish qo‘mitasi",
    "role": "Sotuvchi yoki xizmat ko‘rsatuvchi (kommunal xizmatlar ham) iste’molchi huquqlarini buzsa, tekshiradi.",
    "address": "100128, Toshkent sh., Labzak ko‘chasi, 3-uy",
    "hours": "Du–Ju 9:00–18:00",
    "phones": [P("Fuqarolar murojaatlari call-markazi", "+998 71 207-48-00 (ichki 1159)"), P("Yagona raqam", "+998 71 207-47-00")],
    "links": [L("Onlayn murojaat — raqobat.gov.uz", "https://raqobat.gov.uz/uz/xizmatlar/jismoniy-va-yuridik-shaxslarni-murojaatlari/")],
    "src": "https://raqobat.gov.uz/"
  },
  "cbu": {
    "name": "Markaziy bank — Bank xizmatlari iste’molchilari huquqlarini himoya qilish xizmati",
    "role": "Bank, mikromoliya tashkiloti yoki lombard ustidan shikoyatlarni ko‘rib chiqadi.",
    "address": "Toshkent sh., Islom Karimov ko‘chasi, 6-uy",
    "phones": [P("Ishonch telefoni", "+998 71 200-00-44")],
    "links": [L("Virtual qabulxona — cbu.uz", "https://cbu.uz/ru/services/online-reception/"), L("Yagona murojaatlar platformasi — murojaat.gov.uz", "https://murojaat.gov.uz/")],
    "src": "https://cbu.uz/ru/consumer-protection/"
  },
  "napp": {
    "name": "Istiqbolli loyihalar milliy agentligi (sug‘urta bozori nazorati)",
    "role": "Sug‘urta kompaniyalari ustidan sug‘urta iste’molchilarining murojaatlarini ko‘rib chiqadi.",
    "address": "100015, Toshkent sh., Mirobod tumani, Nukus ko‘chasi, 22-uy",
    "hours": "Du–Ju 9:00–18:00",
    "phones": [P("Sug‘urta iste’molchilari murojaatlari", "+998 71 231-18-40"), P("Devonxona", "+998 71 231-79-09")],
    "links": [L("Onlayn murojaat — napp.uz", "https://napp.uz/appeal")],
    "src": "https://napp.uz/contact"
  },
  "migration": {
    "name": "Vazirlar Mahkamasi huzuridagi Migratsiya agentligi",
    "role": "Xususiy bandlik agentliklarini litsenziyalaydi va nazorat qiladi, xorijda ishlayotgan fuqarolarga yordam beradi.",
    "address": "Toshkent sh., Olmazor tumani, Qamarniso ko‘chasi, 1-uy",
    "hours": "Du–Ju 9:00–18:00, tushlik 13:00–14:00",
    "phones": [P("Ishonch telefoni", "1282"), P("Qabulxona", "+998 71 202-33-55 (ichki 757)")],
    "abroad": [P("Rossiya, Moskva", "+7 925 045-47-44"), P("Rossiya, Sankt-Peterburg", "+7 951 680-95-97"), P("Rossiya, Yekaterinburg", "+7 936 251-76-21"),
               P("Rossiya, Krasnodar", "+7 980 130-63-07"), P("Rossiya, Novosibirsk", "+7 932 327-00-04"), P("Rossiya, Samara", "+7 925 750-87-57"),
               P("Rossiya, Amur viloyati", "+7 925 657-67-18"), P("Koreya Respublikasi, Seul", "+82 2 2285 1341"),
               P("Turkiya, Istanbul (Telegram, WhatsApp)", "+90 553 541-17-17"), P("Turkiya, Anqara", "+90 312 441-17-46")],
    "links": [L("Agentlikning barcha raqamlari — gov.uz", "https://gov.uz/oz/migration/pages/agentlikning-barcha-raqamlari_")],
    "src": "https://gov.uz/oz/migration/pages/agentlikning-barcha-raqamlari_"
  },
  "pension": {
    "name": "Budjetdan tashqari Pensiya jamg‘armasi",
    "parent": "Iqtisodiyot va moliya vazirligi huzurida",
    "role": "Pensiya tayinlaydi va qayta hisoblaydi; arizalar tuman (shahar) bo‘limlari orqali ko‘riladi.",
    "address": "100035, Toshkent sh., Yunusobod tumani, Niyozbek yo‘li ko‘chasi, 1-uy",
    "hours": "Du–Ju 9:00–18:00, tushlik 13:00–14:00",
    "phones": [P("Ishonch telefoni", "12-71", "1271"), P("Markaziy apparat", "+998 71 202-12-71")],
    "local": L("Hududiy boshqarmalar manzillari", "https://gov.uz/oz/pj/departments/regional"),
    "src": "https://gov.uz/oz/pj/contacts"
  },
  "social": {
    "name": "Prezident huzuridagi Ijtimoiy himoya milliy agentligi",
    "role": "Bolalar nafaqasi, moddiy yordam va ijtimoiy reyestr. Arizalar my.gov.uz orqali beriladi; yashash joyingizdagi «Inson» ijtimoiy xizmatlar markaziga ham murojaat qilish mumkin.",
    "phones": [P("Call-markaz", "1140")],
    "links": [L("Bolalar nafaqasi yoki moddiy yordam — my.gov.uz", "https://my.gov.uz/uz/service/1017"), L("Ijtimoiy reyestrga kiritish yoki chiqarish — my.gov.uz", "https://my.gov.uz/uz/service/587")],
    "src": "https://my.gov.uz/uz/service/1017"
  },
  "mib": {
    "name": "Bosh prokuratura huzuridagi Majburiy ijro byurosi",
    "role": "Sud qarorlarini (qarz, aliment va boshqalar) majburiy ijro etadi.",
    "address": "Toshkent sh., Yunusobod tumani, Xalqobod 3-tor ko‘chasi, 2A-uy",
    "phones": [P("Ishonch telefoni", "1107"), P("Ishonch telefoni (shahar raqami)", "+998 71 231-11-07"), P("Devonxona", "+998 71 207-11-73")],
    "links": [L("Rasmiy sayt — mib.uz", "https://mib.uz/"), L("Ijro hujjati va aliment bo‘yicha qarzdorlikni tekshirish — my.gov.uz", "https://my.gov.uz/uz/service/319")],
    "src": "https://mib.uz/contact"
  },
  "courts": {
    "name": "Sudlar",
    "role": "Da’vo va shikoyatlar tegishli tuman (tumanlararo) sudiga beriladi. Arizani elektron shaklda ham topshirish mumkin.",
    "links": [L("Sudga elektron murojaat — cabinet.sud.uz", "https://cabinet.sud.uz/sign-in"), L("Interaktiv xizmatlar — my.sud.uz", "https://my.sud.uz/")],
    "local": L("Sudlar ro‘yxati va manzillari — sud.uz", "https://sud.uz/"),
    "src": "https://sud.uz/"
  },
  "iiv": {
    "name": "Ichki ishlar organlari (politsiya)",
    "role": "Firibgarlik, tahdid yoki o‘zboshimchalik haqida ariza qabul qiladi. 1102 — ichki ishlar xodimlari ustidan shikoyatlar uchun.",
    "phones": [P("Call-markaz", "102"), P("Ishonch telefoni, 24/7", "1102")],
    "links": [L("Murojaat qilish tartibi — gov.uz", "https://gov.uz/oz/iiv/pages/murojaat-qilish-tartibi")],
    "src": "https://gov.uz/oz/iiv/pages/ishonch-telefoni-reglamenti"
  },
  "egov": {
    "name": "Yagona interaktiv davlat xizmatlari portali (my.gov.uz)",
    "role": "YHXX jarimasiga elektron shikoyat va boshqa davlat xizmatlari.",
    "address": "100164, Toshkent sh., Ibrohim Mo‘minov ko‘chasi, 4-uy",
    "hours": "Call-markaz 24/7",
    "phones": [P("Call-markaz (24/7)", "1242"), P("Shikoyat va takliflar", "1148")],
    "links": [L("YHXX jarimasiga elektron shikoyat — my.gov.uz", "https://my.gov.uz/oz/service/1054")],
    "src": "https://my.gov.uz/uz/contact"
  },
  "pm": {
    "name": "Prezidentning virtual qabulxonasi",
    "role": "Idora javob bermasa yoki masala hal bo‘lmasa, murojaat yuborish mumkin.",
    "phones": [P("Qisqa raqam", "1000"), P("Bepul raqam", "0-800-210-00-00", "080021000000")],
    "links": [L("Murojaat yuborish — pm.gov.uz", "https://pm.gov.uz/"), L("Yagona murojaatlar platformasi — murojaat.gov.uz", "https://murojaat.gov.uz/")],
    "src": "https://pm.gov.uz/"
  },
  "mediators": {
    "name": "Professional mediatorlar reyestri",
    "role": "Adliya vazirligi yuritadigan professional mediatorlar reyestri. Mediatorni nizo tomonlari birgalikda tanlaydi.",
    "links": [L("Professional mediatorlar reyestri — gov.uz/adliya", "https://gov.uz/oz/adliya/sections/professional-mediatorlar-reyestri")],
    "src": "https://gov.uz/oz/adliya/sections/professional-mediatorlar-reyestri"
  },
  "mfa": {
    "name": "O‘zbekistonning xorijdagi elchixona va konsulliklari",
    "role": "Xorijda pasport yo‘qolsa yoki olib qo‘yilsa, konsullik yordami va qaytish hujjati. Aloqa ma’lumotlari davlatga qarab farq qiladi.",
    "links": [L("Konsulliklar ro‘yxati va aloqa — Tashqi ishlar vazirligi", "https://gov.uz/oz/mfa/pages/o-zbekiston-respublikasining-xorijdagi-diplomatik-vakolatxonalari-va-konsullik-muassasalari-konsullik-okruglari-to-g-risida"),
              L("Konsullikka elektron navbat — e-navbat.mfa.uz", "https://e-navbat.mfa.uz/")],
    "src": "https://gov.uz/oz/mfa/pages/o-zbekiston-respublikasining-xorijdagi-diplomatik-vakolatxonalari-va-konsullik-muassasalari-konsullik-okruglari-to-g-risida"
  }
}

# Ruscha matnlar (raqam va havolalar o‘zbekcha bazadan olinadi)
OFFICES_RU = {
  "dmi": {"name":"Государственная инспекция труда", "parent":"Министерство по сокращению бедности и занятости",
          "role":"Проверяет работодателя при нарушении трудового законодательства и выдаёт обязательные предписания.",
          "address":"100100, г. Ташкент, Мирабадский район, ул. Нукус, 8 (министерство)", "hours":"Пн–Пт 9:00–18:00, обед 13:00–14:00",
          "phones":[{"label":"Телефон доверия министерства"}, {"label":"Министерство"}], "links":[{"label":"Государственная инспекция труда — dmi.mehnat.uz"}],
          "local":{"label":"Список территориальных подразделений"}},
  "raqobat": {"name":"Комитет по развитию конкуренции и защите прав потребителей",
              "role":"Проверяет продавца или поставщика услуг (в том числе коммунальных) при нарушении прав потребителя.",
              "address":"100128, г. Ташкент, ул. Лабзак, 3", "hours":"Пн–Пт 9:00–18:00",
              "phones":[{"label":"Колл-центр обращений граждан"}, {"label":"Единый номер"}], "links":[{"label":"Онлайн-обращение — raqobat.gov.uz"}]},
  "cbu": {"name":"Центральный банк — Служба по защите прав потребителей банковских услуг",
          "role":"Рассматривает жалобы на банки, микрофинансовые организации и ломбарды.",
          "address":"г. Ташкент, ул. Ислама Каримова, 6", "phones":[{"label":"Телефон доверия"}],
          "links":[{"label":"Виртуальная приёмная — cbu.uz"}, {"label":"Единая платформа обращений — murojaat.gov.uz"}]},
  "napp": {"name":"Национальное агентство перспективных проектов (надзор за страховым рынком)",
           "role":"Рассматривает обращения потребителей страховых услуг на страховые компании.",
           "address":"100015, г. Ташкент, Мирабадский район, ул. Нукус, 22", "hours":"Пн–Пт 9:00–18:00",
           "phones":[{"label":"Обращения потребителей страховых услуг"}, {"label":"Канцелярия"}], "links":[{"label":"Онлайн-обращение — napp.uz"}]},
  "migration": {"name":"Агентство миграции при Кабинете Министров",
                "role":"Лицензирует и контролирует частные агентства занятости, помогает гражданам, работающим за рубежом.",
                "address":"г. Ташкент, Алмазарский район, ул. Камарнисо, 1", "hours":"Пн–Пт 9:00–18:00, обед 13:00–14:00",
                "phones":[{"label":"Телефон доверия"}, {"label":"Приёмная"}],
                "abroad":[{"label":"Россия, Москва"}, {"label":"Россия, Санкт-Петербург"}, {"label":"Россия, Екатеринбург"}, {"label":"Россия, Краснодар"},
                          {"label":"Россия, Новосибирск"}, {"label":"Россия, Самара"}, {"label":"Россия, Амурская область"}, {"label":"Республика Корея, Сеул"},
                          {"label":"Турция, Стамбул (Телеграм, Ватсап)"}, {"label":"Турция, Анкара"}],
                "links":[{"label":"Все номера агентства — gov.uz"}]},
  "pension": {"name":"Внебюджетный Пенсионный фонд", "parent":"при Министерстве экономики и финансов",
              "role":"Назначает и пересчитывает пенсии; заявления рассматривают районные (городские) отделы.",
              "address":"100035, г. Ташкент, Юнусабадский район, ул. Ниязбек йули, 1", "hours":"Пн–Пт 9:00–18:00, обед 13:00–14:00",
              "phones":[{"label":"Телефон доверия"}, {"label":"Центральный аппарат"}], "local":{"label":"Адреса территориальных управлений"}},
  "social": {"name":"Национальное агентство социальной защиты при Президенте",
             "role":"Пособия на детей, материальная помощь и социальный реестр. Заявления подаются через my.gov.uz; можно обратиться и в центр социальных услуг «Инсон» по месту жительства.",
             "phones":[{"label":"Колл-центр"}],
             "links":[{"label":"Пособие на детей или материальная помощь — my.gov.uz"}, {"label":"Включение в социальный реестр или исключение — my.gov.uz"}]},
  "mib": {"name":"Бюро принудительного исполнения при Генеральной прокуратуре",
          "role":"Принудительно исполняет решения судов (долги, алименты и другие).",
          "address":"г. Ташкент, Юнусабадский район, 3-й проезд Халкабад, 2А",
          "phones":[{"label":"Телефон доверия"}, {"label":"Телефон доверия (городской номер)"}, {"label":"Канцелярия"}],
          "links":[{"label":"Официальный сайт — mib.uz"}, {"label":"Проверка задолженности по исполнительным документам и алиментам — my.gov.uz"}]},
  "courts": {"name":"Суды", "role":"Иски и жалобы подаются в соответствующий районный (межрайонный) суд. Заявление можно подать и электронно.",
             "links":[{"label":"Электронное обращение в суд — cabinet.sud.uz"}, {"label":"Интерактивные услуги — my.sud.uz"}],
             "local":{"label":"Список и адреса судов — sud.uz"}},
  "iiv": {"name":"Органы внутренних дел (полиция)",
          "role":"Принимают заявления о мошенничестве, угрозах или самоуправстве. 1102 — для жалоб на сотрудников органов внутренних дел.",
          "phones":[{"label":"Колл-центр"}, {"label":"Телефон доверия, 24/7"}], "links":[{"label":"Порядок обращения — gov.uz"}]},
  "egov": {"name":"Единый портал интерактивных государственных услуг (my.gov.uz)",
           "role":"Электронная жалоба на штраф СБДД и другие государственные услуги.",
           "address":"100164, г. Ташкент, ул. Ибрагима Муминова, 4", "hours":"Колл-центр 24/7",
           "phones":[{"label":"Колл-центр (24/7)"}, {"label":"Жалобы и предложения"}], "links":[{"label":"Электронная жалоба на штраф СБДД — my.gov.uz"}]},
  "pm": {"name":"Виртуальная приёмная Президента", "role":"Если орган не отвечает или вопрос не решён, можно направить обращение.",
         "phones":[{"label":"Короткий номер"}, {"label":"Бесплатный номер"}],
         "links":[{"label":"Отправить обращение — pm.gov.uz"}, {"label":"Единая платформа обращений — murojaat.gov.uz"}]},
  "mediators": {"name":"Реестр профессиональных медиаторов", "role":"Реестр профессиональных медиаторов, который ведёт Министерство юстиции. Медиатора стороны спора выбирают совместно.",
                "links":[{"label":"Реестр профессиональных медиаторов — gov.uz/adliya"}]},
  "mfa": {"name":"Посольства и консульства Узбекистана за рубежом",
          "role":"Консульская помощь и документ на возвращение, если паспорт утерян или удерживается за рубежом. Контакты зависят от страны.",
          "links":[{"label":"Список консульств и контакты — Министерство иностранных дел"}, {"label":"Электронная очередь в консульство — e-navbat.mfa.uz"}]}
}

# Qadamdagi tashkilot → idora (o‘zbekcha `org` matni bo‘yicha)
ORG_OFFICE = {
  "Mehnat inspeksiyasi": "dmi", "Iste’molchilar qo‘mitasi": "raqobat", "Markaziy bank": "cbu", "Migratsiya agentligi": "migration",
  "Pensiya jamg‘armasi": "pension", "«Inson» markazi": "social", "Majburiy ijro byurosi": "mib", "Sud": "courts", "Ma’muriy sud": "courts",
  "Yuqori organ yoki sud": "courts", "YHXX yoki sud": "courts", "Politsiya": "iiv", "Elektron": "egov", "Xalq qabulxonasi": "pm", "Konsullik": "mfa", "Mediator": "mediators"
}
# Holatga xos qo‘shimchalar: qadamda tilga olinmagan, lekin foydali idora; yoki umumiy «Yuqori organ» ning aniq ma’nosi
EXTRA_OFFICES = {"osgo": ["napp"], "organ_qarori": ["pm"], "murojaat_umumiy": ["pm"]}
STEP_OVERRIDE = {("pensiya", "Yuqori organ"): "pension", ("ijtimoiy_nafaqa", "Yuqori organ"): "social"}

# Ariza qabul qiluvchisi → idora («Qanday topshiriladi» ostida aloqa ma’lumoti)
DOC_OFFICE = {"mediatsiya": "mediators", "boji": "courts", "inspection": "dmi", "agency": "raqobat", "cbu": "cbu", "migration": "migration", "consul": "mfa", "court": "courts"}
DOC_OVERRIDE = {("pensiya", "higher"): "pension", ("ijtimoiy_nafaqa", "higher"): "social"}

def attach(S):
    """Har bir holat qadamiga `office` va holatga `offices` ro‘yxatini (qadamlar tartibida) qo‘shadi."""
    for s in S:
        ids = []
        for st in s["steps"]:
            oid = STEP_OVERRIDE.get((s["id"], st["org"])) or ORG_OFFICE.get(st["org"])
            if oid:
                st["office"] = oid
                if oid not in ids: ids.append(oid)
        for oid in EXTRA_OFFICES.get(s["id"], []):
            if oid not in ids: ids.append(oid)
        assert all(i in OFFICES for i in ids), s["id"]
        s["offices"] = ids
        for d in s["docs"]:
            oid = DOC_OVERRIDE.get((s["id"], d["id"])) or DOC_OFFICE.get(d["id"])
            if oid in ids: d["office"] = oid
