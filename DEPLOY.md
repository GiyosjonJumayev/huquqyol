# HuquqYo‘lni hostingga joylashtirish

Ilova — bitta Node.js server. Fuqaro oqimi bazasiz ham ishlaydi; **hisoblar, obuna va to‘lovlar uchun PostgreSQL kerak**. Pullik ishchi tizim uchun — pastdagi «Ishchi tizim (tavsiya)» bo‘limi. Talablar:
- **Node.js 18.18+** (tavsiya: 20 yoki 22);
- taxminan 150 MB RAM;
- 60 MB disk.

| Usul | Qachon mos | Vaqt |
|---|---|---|
| [**Ishchi tizim: VPS + Docker Compose**](#ishchi-tizim-tavsiya) | **Pul qabul qiladigan haqiqiy sayt** (baza, HTTPS, zaxira bilan) | 30 daqiqa |
| [A. cPanel hosting (Node.js App)](#a-cpanel-hosting) | Oddiy pullik hosting (ahost, hostinger, timeweb va h.k.) | 10 daqiqa |
| [B. VPS (Ubuntu + Nginx)](#b-vps-ubuntu--nginx) | O‘z serveringiz, to‘liq nazorat | 20 daqiqa |
| [C. Docker](#c-docker) | Docker bor server | 5 daqiqa |
| [D. Render (bepul)](#d-render-bepul) | Hakaton uchun tezkor demo havola | 5 daqiqa |

> **Muhim:** ilova domen yoki subdomen ildizida ishlaydi (`huquqyol.uz`, `app.sayt.uz`). `sayt.uz/huquqyol` kabi papka manzili qo‘llanmaydi — subdomen oching.

---

## Ishchi tizim (tavsiya)

O‘zbekistondagi VPS (2 vCPU, 2 GB RAM, 20 GB disk, Ubuntu 24.04) va domen kerak. Server joyi muhim: shaxsiy ma’lumotlar qonunchiligi fuqarolar ma’lumotini O‘zbekistonda saqlashni talab qiladi — mahalliy data-markazni tanlang.

```bash
# 1) Domen DNS: A yozuv → server IP (www ham). Serverda Docker:
curl -fsSL https://get.docker.com | sudo sh
sudo ufw allow OpenSSH && sudo ufw allow 80,443/tcp && sudo ufw allow 443/udp && sudo ufw enable

# 2) Kod va sozlama
git clone https://github.com/GiyosjonJumayev/huquqyol.git && cd huquqyol
cp .env.example .env && chmod 600 .env && nano .env     # quyidagi jadval

# 3) Tekshiruv va ishga tushirish
alias dc='docker compose -f deploy/compose.yml --env-file .env'
dc run --rm app node scripts/check-prod.mjs
dc up -d --build
curl -s https://DOMEN/api/ready                          # {"ok":true,"db":true}

# 4) Birinchi admin: saytda ro‘yxatdan o‘ting, so‘ng
dc exec app node scripts/make-admin.mjs siz@domen.uz     # keyin /xavfsizlik da 2FA ni yoqing
```

| `.env` da majburiy | Qiymat |
|---|---|
| `NODE_ENV` | `production` |
| `PUBLIC_HOST` | domen, masalan `huquqyol.uz` (https:// siz) |
| `FORCE_HTTPS`, `TRUST_PROXY` | `1` |
| `POSTGRES_PASSWORD` | `openssl rand -hex 24` |
| `APP_SECRET` | `openssl rand -hex 32` |
| `DATABASE_URL` | `postgres://huquqyol:PAROL@db:5432/huquqyol` (Compose o‘zi qo‘yadi) |

To‘lov kalitlari — [docs/PAYMENTS.md](docs/PAYMENTS.md). Xat yuborish — `SMTP_URL`.

- **Yangilash:** `git pull && dc up -d --build` (migratsiyalar o‘zi qo‘llanadi).
- **Zaxira:** har kuni 03:30 da `backups/` ga, 14 kun saqlanadi; qo‘lda: `dc exec backup sh /backup.sh once`. Nusxani boshqa serverga ham ko‘chiring.
- **Tiklash:** `sh deploy/restore.sh backups/….dump` — oyda bir marta sinab ko‘ring.
- **Monitoring:** UptimeRobot kabi xizmatga `https://DOMEN/api/ready` ni qo‘ying (baza ham tekshiriladi). Loglar: `dc logs -f app`.
- **Telegram bot:** `dc --profile bot up -d`.

### Ochishdan oldin (sizning zimmangizda)

- [ ] Yuridik shaxs / YaTT, Payme va Click shartnomalari, bank rekvizitlari `.env` da.
- [ ] `/oferta`, `/maxfiylik` va hujjat shablonlarini yurist ko‘rib chiqqan.
- [ ] IKPU va soliq rejimi buxgalter bilan kelishilgan.
- [ ] Shaxsiy ma’lumotlar bazasini ro‘yxatdan o‘tkazish zarurligi tekshirilgan.
- [ ] Katalogda haqiqiy yuristlar bor (namuna profillar production’da yashirin).
- [ ] Kichik summa bilan haqiqiy to‘lov va qaytarish sinovdan o‘tgan.

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
   - `ANTHROPIC_API_KEY` = kalitingiz (ixtiyoriy);
   - `TZ` = `Asia/Tashkent` (berilmasa ham `app.cjs` shuni o‘rnatadi; server UTC da bo‘lsa, tunda sanalar bir kun farq qilmasligi uchun).

   Yoki `~/huquqyol/.env` faylini `.env.example` asosida yarating.
4. **Ishga tushirish.** **Create**, so‘ng **Restart** tugmasini bosing.
5. **SSL.** cPanel → **SSL/TLS Status** → **Run AutoSSL** (Let’s Encrypt, bepul). SSL ishlagach, `FORCE_HTTPS` = `1` va `PUBLIC_HOST` = domeningiz (masalan `huquqyol.uz`) qo‘shing va yana **Restart** qiling.
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
  -e TRUST_PROXY=1 -e ANTHROPIC_API_KEY=... -v huquqyol-data:/app/data huquqyol
```

`-v huquqyol-data:/app/data` — anonim statistika konteyner yangilanganda ham saqlanib qolishi uchun.

Konteyner root bo‘lmagan foydalanuvchida ishlaydi va o‘z health check’iga ega. Tashqariga Nginx (B bo‘limidagi 4-qadam) orqali chiqaring.

---

## D. Render (bepul)

1. Loyihani GitHub’ga yuklang.
2. render.com → **New → Blueprint** → repozitoriyni tanlang. `render.yaml` hamma narsani o‘zi sozlaydi.
3. Kerak bo‘lsa, `ANTHROPIC_API_KEY` ni kiriting.

Bepul tarifda server 15 daqiqa ishlatilmasa uxlaydi va birinchi ochilish 30–50 soniya oladi. Taqdimotdan oldin sahifani bir marta ochib qo‘ying.

Bepul tarifda disk doimiy emas: qayta joylashtirilganda anonim statistika noldan boshlanadi. Saqlab qolish uchun pullik tarifda Persistent Disk ulang va `STATS_FILE` ni shu diskdagi faylga yo‘naltiring (masalan `/var/data/stats.json`).

---

## Joylashtirgandan keyin tekshiruv ro‘yxati

- [ ] `/api/health` → `"ok":true` (`"ai":true` — kalit ishlayapti).
- [ ] Sayt `https://` da ochiladi, brauzerda qulf belgisi bor.
- [ ] **O‘zb / Ўзб / Рус** tillari almashadi.
- [ ] Biror holat → **Ariza** → **Namuna bilan to‘ldirish** → **PDF** va **Word** yuklanadi.
- [ ] Telefonda ochib ko‘ring. «Bosh ekranga qo‘shish» bosilsa, ilova (PWA) sifatida o‘rnatiladi.
- [ ] `/statistika` ochiladi; biror holatni ochgandan keyin «Murojaatlar» soni oshadi. Ilova papkasida `data/` ga yozish huquqi bo‘lishi kerak (cPanel va VPS’da odatda bor). Statistika 30 soniyada bir va to‘xtatilganda diskka yoziladi.

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
