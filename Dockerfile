FROM node:22-alpine
# TZ: sanalar (muddat, «kelajakdagi sana» tekshiruvi) Toshkent vaqti bo‘yicha; Node o‘z ICU tz bazasidan foydalanadi
ENV NODE_ENV=production PORT=3000 TZ=Asia/Tashkent
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
# Kod root egaligida qoladi: ilova o‘z faylini o‘zgartira olmaydi
COPY . .
# Anonim statistika fayli (data/stats.json) uchun yoziladigan papka; doimiy saqlash uchun volume ulang
RUN mkdir -p /app/data && chown node:node /app/data
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "app.cjs"]
