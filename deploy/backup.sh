#!/bin/sh
# Kunlik zaxira: har kuni 03:30 da pg_dump; KEEP_DAYS kundan eskisi o‘chiriladi. Fayl avval .part, tekshirilgach — nomi almashadi.
# Nusxani boshqa serverga ham ko‘chiring (masalan rclone/rsync bilan) — bitta diskdagi zaxira yetarli emas.
set -u
umask 077
run() {
  f="/backups/huquqyol-$(date +%Y%m%d-%H%M%S).dump"
  if pg_dump -Fc -Z 6 -f "$f.part" && pg_restore -l "$f.part" >/dev/null; then
    mv "$f.part" "$f" && echo "zaxira: $f ($(du -h "$f" | cut -f1))"
    find /backups -name 'huquqyol-*.dump' -mtime +"${KEEP_DAYS:-14}" -delete
  else
    rm -f "$f.part"; echo "XATO: zaxira olinmadi" >&2
  fi
}
[ "${1:-}" = "once" ] && { run; exit 0; }
run
while :; do
  now=$(date +%s); next=$(date -d "$(date +%Y-%m-%d) 03:30:00" +%s)
  [ "$next" -le "$now" ] && next=$((next + 86400))
  sleep $((next - now))
  run
done
