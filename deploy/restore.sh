#!/bin/sh
# Zaxiradan tiklash:  sh deploy/restore.sh backups/huquqyol-YYYYMMDD-HHMMSS.dump
# DIQQAT: joriy baza to‘liq almashtiriladi. Avval joriy holatdan ham nusxa olinadi.
set -eu
[ -f "${1:-}" ] || { echo "Fayl ko‘rsating: sh deploy/restore.sh backups/….dump" >&2; exit 1; }
DC="docker compose -f deploy/compose.yml --env-file .env"
printf 'Joriy baza o‘chirilib, %s dan tiklanadi. Davom etish uchun HA deb yozing: ' "$1"; read -r a; [ "$a" = "HA" ] || exit 1
$DC exec -T backup sh /backup.sh once
$DC stop app
$DC exec -T db dropdb -U huquqyol --force huquqyol
$DC exec -T db createdb -U huquqyol huquqyol
$DC exec -T db pg_restore -U huquqyol -d huquqyol --no-owner --exit-on-error < "$1"
$DC start app
echo "Tiklandi."
