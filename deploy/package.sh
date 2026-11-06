#!/usr/bin/env bash
# Hostingga yuklash uchun tayyor arxiv: dist/huquqyol-hosting.zip
# Ichida production node_modules bor — hostingda «npm install» qilish shart emas.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/dist"; APP="$OUT/huquqyol"
rm -rf "$OUT"; mkdir -p "$APP"
cd "$ROOT"
cp -r app.cjs package.json package-lock.json server public scripts deploy README.md DEPLOY.md DEMO.md Dockerfile .dockerignore render.yaml .env.example "$APP"/
rm -f "$APP/deploy/package.sh"
cd "$APP"
npm ci --omit=dev --no-audit --no-fund --ignore-scripts >/dev/null
# Ishlatilmaydigan fayllarni olib tashlash (turlar, source map, brauzer build’lari, keraksiz shriftlar)
NM=node_modules
find "$NM" -type f \( -name "*.map" -o -name "*.d.ts" -o -name "*.d.cts" -o -name "*.d.mts" -o -name "*.tsbuildinfo" \) -delete
find "$NM" -type f \( -iname "CHANGELOG*" -o -iname "HISTORY*" \) -delete
rm -rf "$NM/@types"
find "$NM/docx/dist" -name "*.iife.js" -delete
rm -f "$NM"/pdfkit/js/pdfkit.browser* "$NM"/pdfkit/js/pdfkit.standalone.js
find "$NM/dejavu-fonts-ttf/ttf" -type f ! -name "DejaVuSerif*.ttf" -delete
find "$NM" -type d -empty -delete
# Tutun testi: server yuklanadi, PDF va DOCX yasaladi
node --input-type=module -e '
  const { documentModel, toPdf, toDocx } = await import("./server/documents.js");
  await import("./server/index.js");
  const m = documentModel({ scenario:"ish_haqi", recipient:"court", lang:"ru", form:{ fio:"Test" } });
  const [pdf, docx] = await Promise.all([toPdf(m), toDocx(m)]);
  if (pdf.subarray(0,4).toString() !== "%PDF" || docx.length < 5000) throw new Error("hujjat yasalmadi");
  console.log("tekshiruv: server, PDF va DOCX ishlaydi");'
cd "$OUT"
zip -qr huquqyol-hosting.zip huquqyol
echo "Tayyor: $OUT/huquqyol-hosting.zip ($(du -h huquqyol-hosting.zip | cut -f1))"
