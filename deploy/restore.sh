#!/bin/sh
# Zaxiradan tiklash:  sh deploy/restore.sh huquqyol-YYYYMMDD-HHMMSS.dump   (fayl backups/ papkasida)
# Xavfsiz tartib: avval yangi bazaga tiklanadi; faqat muvaffaqiyatli bo‘lsa joyi almashtiriladi. Eski baza o‘chirilmaydi (nomi oxirida chiqadi).
set -eu
DC="docker compose -f deploy/compose.yml --env-file .env"
in_backup() { $DC exec -T backup "$@" </dev/null; }
f="/backups/$(basename "${1:?Fayl nomini yozing: sh deploy/restore.sh huquqyol-....dump}")"
in_backup pg_restore -l "$f" >/dev/null || { echo "Fayl topilmadi yoki buzilgan: $f" >&2; exit 1; }
printf 'Baza %s dan tiklanadi. Davom etish uchun HA deb yozing: ' "$f"
read -r a
[ "$a" = "HA" ] || { echo "Bekor qilindi."; exit 1; }
old="huquqyol_old_$(date +%Y%m%d%H%M%S)"
in_backup dropdb --if-exists huquqyol_new
in_backup createdb huquqyol_new
in_backup pg_restore -d huquqyol_new --no-owner --exit-on-error "$f"
$DC stop app </dev/null
in_backup psql -q -d postgres -v ON_ERROR_STOP=1 \
  -c "select pg_terminate_backend(pid) from pg_stat_activity where datname = 'huquqyol'" \
  -c "alter database huquqyol rename to $old" \
  -c "alter database huquqyol_new rename to huquqyol" >/dev/null
$DC start app </dev/null
echo "Tiklandi. Oldingi baza saqlandi: $old (kerak bo‘lmasa: $DC exec backup dropdb $old)"
