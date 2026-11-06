# HuquqYo‘lni hostingga joylashtirish

Ilova — bitta Node.js server. Ma’lumotlar bazasi kerak emas: bilim bazasi, shriftlar va sahifalar loyiha ichida. Talablar:
- **Node.js 18.18+** (tavsiya: 20 yoki 22);
- taxminan 150 MB RAM;
- 60 MB disk.

| Usul | Qachon mos | Vaqt |
|---|---|---|
| [A. cPanel hosting (Node.js App)](#a-cpanel-hosting) | Oddiy pullik hosting (ahost, hostinger, timeweb va h.k.) | 10 daqiqa |
| [B. VPS (Ubuntu + Nginx)](#b-vps-ubuntu--nginx) | O‘z serveringiz, to‘liq nazorat | 20 daqiqa |
| [C. Docker](#c-docker) | Docker bor server | 5 daqiqa |
| [D. Render (bepul)](#d-render-bepul) | Hakaton uchun tezkor demo havola | 5 daqiqa |

> **Muhim:** ilova domen yoki subdomen ildizida ishlaydi (`huquqyol.uz`, `app.sayt.uz`). `sayt.uz/huquqyol` kabi papka manzili qo‘llanmaydi — subdomen oching.

---

## Tayyor arxiv

`huquqyol-hosting.zip` ichida hammasi bor, jumladan `node_modules`. Shuning uchun serverda `npm install` qilish shart emas.

Arxivni o‘zingiz yangidan yasash uchun: `npm run package`. Natija `dist/huquqyol-hosting.zip` fayliga yoziladi.

---

## A. cPanel hosting

1. **Arxivni yuklash.** *File Manager* da uy papkangizda (`public_html` emas!) `huquqyol` papkasini oching. `huquqyol-hosting.zip` ni yuklang va **Extract** qiling. Ichidagi fayllar to‘g‘ridan-to‘g‘ri `~/huquqyol/` ichida bo‘lsin: `app.cjs`, `server/`, `public/`, `node_modules/`…
2. **Ilova yaratish.** cPanel → **Setup Node.js App** → **Create Application**:

   | Maydon | Qiymat |
   |---|---|
   | Node.js version | 20 yoki 22 (eng yangisi) |
   | Application mode | Production |
   | Application root | `huquqyol` |
   | Application URL | domen yoki subdomen (ildiz) |
   | Application startup file | `app.cjs` |

3. **Environment variables.** Shu sahifada qo‘shing:
   - `TRUST_PROXY` = `1` (shart: aks holda barcha foydalanuvchilar bitta IP bo‘lib ko‘rinadi);
   - `ANTHROPIC_API_KEY` = kalitingiz (ixtiyoriy).

   Yoki `~/huquqyol/.env` faylini `.env.example` asosida yarating.
4. **Ishga tushirish.** **Create**, so‘ng **Restart** tugmasini bosing.
5. **SSL.** cPanel → **SSL/TLS Status** → **Run AutoSSL** (Let’s Encrypt, bepul). SSL ishlagach, `FORCE_HTTPS` = `1` qo‘shing va yana **Restart** qiling.
6. **Tekshirish.** `https://domeningiz/api/health` manzili `{"ok":true,...}` qaytarishi kerak.

Arxiv `node_modules` siz yuklangan bo‘lsa, shu sahifadagi **Run NPM Install** tugmasini bosing.

**Yangilash:** yangi arxivni ustiga extract qiling (`.env` saqlanib qoladi) va **Restart** bosing.

---

## B. VPS (Ubuntu + Nginx)

```bash
# 1) Node.js 22 va Nginx
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs nginx unzip

# 2) Alohida foydalanuvchi va fayllar
sudo useradd --system --home /var/www/huquqyol --shell /usr/sbin/nologin huquqyol
sudo mkdir -p /var/www && cd /var/www
sudo unzip ~/huquqyol-hosting.zip            # /var/www/huquqyol paydo bo‘ladi
sudo cp huquqyol/.env.example huquqyol/.env && sudo nano huquqyol/.env   # kalit, HOST=127.0.0.1, TRUST_PROXY=1
sudo chown -R root:huquqyol huquqyol && sudo chmod 640 huquqyol/.env

# 3) Xizmat (avtomatik ishga tushadi va qulasa qayta yonadi)
sudo cp huquqyol/deploy/huquqyol.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now huquqyol
curl -s http://127.0.0.1:3000/api/health

# 4) Nginx + HTTPS
sudo cp huquqyol/deploy/nginx.conf /etc/nginx/sites-available/huquqyol
sudo sed -i 's/huquqyol.uz/SIZNING-DOMEN.uz/g' /etc/nginx/sites-available/huquqyol
sudo ln -s /etc/nginx/sites-available/huquqyol /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo apt install -y certbot python3-certbot-nginx && sudo certbot --nginx -d SIZNING-DOMEN.uz
```

- PM2’ni afzal ko‘rsangiz: `pm2 start deploy/ecosystem.config.cjs && pm2 save && pm2 startup`.
- Loglar: `journalctl -u huquqyol -f`.
- Yangilash: arxivni ustiga oching, so‘ng `sudo systemctl restart huquqyol`.

---

## C. Docker

```bash
docker build -t huquqyol .
docker run -d --name huquqyol --restart unless-stopped -p 127.0.0.1:3000:3000 \
  -e TRUST_PROXY=1 -e ANTHROPIC_API_KEY=... huquqyol
```

Konteyner root bo‘lmagan foydalanuvchida ishlaydi va o‘z health check’iga ega. Tashqariga Nginx (B bo‘limidagi 4-qadam) orqali chiqaring.

---

## D. Render (bepul)

1. Loyihani GitHub’ga yuklang.
2. render.com → **New → Blueprint** → repozitoriyni tanlang. `render.yaml` hamma narsani o‘zi sozlaydi.
3. Kerak bo‘lsa, `ANTHROPIC_API_KEY` ni kiriting.

Bepul tarifda server 15 daqiqa ishlatilmasa uxlaydi va birinchi ochilish 30–50 soniya oladi. Taqdimotdan oldin sahifani bir marta ochib qo‘ying.

---

## Joylashtirgandan keyin tekshiruv ro‘yxati

- [ ] `/api/health` → `"ok":true` (`"ai":true` — kalit ishlayapti).
- [ ] Sayt `https://` da ochiladi, brauzerda qulf belgisi bor.
- [ ] **O‘zb / Ўзб / Рус** tillari almashadi.
- [ ] Biror holat → **Ariza** → **Namuna bilan to‘ldirish** → **PDF** va **Word** yuklanadi.
- [ ] Telefonda ochib ko‘ring. «Bosh ekranga qo‘shish» bosilsa, ilova (PWA) sifatida o‘rnatiladi.

## Muammolar

| Belgi | Sabab va yechim |
|---|---|
| 503 / «Application failed to start» | Node.js versiyasi eski (18.18 dan past) — panelda 20/22 ni tanlang. Xato matni: cPanel’da `~/huquqyol/stderr.log`, VPS’da `journalctl -u huquqyol`. |
| `Cannot find module 'express'` | `node_modules` yuklanmagan — **Run NPM Install** yoki `npm ci --omit=dev`. |
| Sahifa ochiladi, lekin dizayn yo‘q (CSS/JS 404) | Ilova papka manzilida (`sayt.uz/huquqyol`) — subdomenga o‘tkazing. |
| Cheksiz qayta yo‘naltirish | `FORCE_HTTPS=1`, lekin `TRUST_PROXY` berilmagan — `TRUST_PROXY=1` qo‘shing. |
| «So‘rovlar juda ko‘p» hammada birdan | `TRUST_PROXY=1` yo‘q, barcha foydalanuvchilar proxy IP’si ostida. |
| AI ishlamayapti | `/api/health` da `"ai":false` — kalit berilmagan yoki noto‘g‘ri. Ilova baribir qidiruv rejimida to‘liq ishlaydi. |

## Xavfsizlik bo‘yicha eslatma

- `.env` faylini hech qachon `public_html` ga yoki GitHub’ga qo‘ymang. Uni boshqalar o‘qiy olmasin: cPanel’da `chmod 600`, VPS’da `chmod 640` (egasi root, guruh — xizmat foydalanuvchisi).
- Ilova foydalanuvchi matnini saqlamaydi va logga yozmaydi; ma’lumotlar faqat foydalanuvchi brauzerida turadi.
- HTTPS orqali kelgan so‘rovlarga HSTS va `upgrade-insecure-requests` avtomatik qo‘shiladi. SSL hali ulanmagan bo‘lsa, sayt buzilmaydi.
