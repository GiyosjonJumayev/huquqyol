# Sinov rasmlarini yasash (soxta ma’lumotlar): python test/fixtures/make-fixtures.py test/fixtures
import sys, random
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance
OUT = sys.argv[1]
F = "C:/Windows/Fonts/times.ttf"; FB = "C:/Windows/Fonts/timesbd.ttf"; FA = "C:/Windows/Fonts/arial.ttf"
def doc(lines, w=1240, h=1754):
    im = Image.new("RGB", (w, h), "white"); d = ImageDraw.Draw(im); y = 110
    for txt, size, bold, center in lines:
        f = ImageFont.truetype(FB if bold else F, size)
        if txt:
            x = (w - d.textlength(txt, font=f)) / 2 if center else 110
            d.text((x, y), txt, font=f, fill=(20, 20, 25))
        y += int(size * 1.55)
    return im
def photo(im, angle=2.2, seed=1):
    random.seed(seed)
    bg = Image.new("RGB", (im.width + 260, im.height + 260), (120, 110, 95))
    im = im.rotate(angle, expand=True, fillcolor=(120, 110, 95), resample=Image.BICUBIC)
    bg.paste(im, (120, 100))
    bg = ImageEnhance.Brightness(bg).enhance(0.86).filter(ImageFilter.GaussianBlur(1.1))
    # notekis yorug'lik
    sh = Image.linear_gradient("L").resize(bg.size).rotate(90)
    bg = Image.composite(bg, ImageEnhance.Brightness(bg).enhance(0.72), sh)
    return bg
yhxx = [
 ("O‘ZBEKISTON RESPUBLIKASI ICHKI ISHLAR VAZIRLIGI", 30, True, True),
 ("Toshkent shahar IIBB Yo‘l harakati xavfsizligi boshqarmasi", 30, False, True),
 ("", 20, False, False),
 ("MA’MURIY HUQUQBUZARLIK TO‘G‘RISIDAGI ISH BO‘YICHA", 34, True, True),
 ("QAROR № AB 1234567", 34, True, True),
 ("", 20, False, False),
 ("Sana: 14.11.2026                          Toshkent shahri", 30, False, False),
 ("", 16, False, False),
 ("Fuqaro Karimov Aziz Botirovich, 1988-yilda tug‘ilgan,", 30, False, False),
 ("transport vositasi Chevrolet Cobalt, davlat raqami 01 A 123 BC,", 30, False, False),
 ("belgilangan tezlikni 20 km/soatdan ortiq oshirgani uchun", 30, False, False),
 ("MJtK 128³-moddasi 1-qismiga asosan", 30, False, False),
 ("", 16, False, False),
 ("QAROR QILDI:", 32, True, False),
 ("Karimov A.B.ga 375 000 (uch yuz yetmish besh ming) so‘m", 30, False, False),
 ("miqdorida jarima solinsin.", 30, False, False),
 ("", 16, False, False),
 ("Qaror ustidan 10 kun ichida yuqori turuvchi organga yoki", 28, False, False),
 ("sudga shikoyat qilish mumkin.", 28, False, False),
 ("", 30, False, False),
 ("Inspektor: kapitan R. Toshmatov            ____________", 28, False, False),
]
chek = [
 ("«TEXNOMART» MChJ", 34, True, True), ("Toshkent sh., Chilonzor tumani, Bunyodkor ko‘chasi 7", 26, False, True),
 ("STIR: 301234567", 26, False, True), ("", 16, False, False),
 ("SAVDO CHEKI № 004512", 30, True, True), ("Sana: 03.11.2026  14:25", 28, False, False), ("", 12, False, False),
 ("Televizor Samsung UE43           1 x 4 850 000", 28, False, False),
 ("Kafolat: 12 oy", 26, False, False), ("", 12, False, False),
 ("JAMI:                           4 850 000 so‘m", 32, True, False),
 ("To‘lov: Humo karta", 26, False, False), ("QQS 12%: 519 643", 26, False, False),
 ("", 12, False, False), ("Xaridingiz uchun rahmat!", 26, False, True),
]
ru = [
 ("ПОСТАНОВЛЕНИЕ № АБ 7654321", 34, True, True),
 ("по делу об административном правонарушении", 30, False, True), ("", 16, False, False),
 ("Дата: 12.11.2026                               г. Самарканд", 30, False, False),
 ("Управление безопасности дорожного движения", 30, False, False),
 ("ГУВД Самаркандской области", 30, False, False), ("", 16, False, False),
 ("Водитель автомобиля с госномером 30 B 456 CA нарушил", 30, False, False),
 ("правила остановки транспортного средства.", 30, False, False),
 ("Назначить штраф в размере 412 000 сум.", 30, False, False),
]
img = doc(yhxx)
img.save(f"{OUT}/yhxx-qaror.jpg", quality=88)
photo(img).save(f"{OUT}/yhxx-qaror-foto.jpg", quality=80)
doc(chek, 900, 1200).save(f"{OUT}/chek.jpg", quality=85)
photo(doc(ru), -1.6, 2).save(f"{OUT}/ru-postanovlenie-foto.jpg", quality=80)
print("ok")
