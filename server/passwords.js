// Keng tarqalgan parollar (NIST SP 800-63B, 3.1.1.2: ma’lum buzilgan/oddiy parollar ro‘yxati bilan solishtirish).
// Kichik harfga o‘tkazib solishtiriladi. Ro‘yxat ochiq manbalardagi eng ko‘p uchraydigan parollar va mahalliy variantlardan.
const LIST = `12345678 123456789 1234567890 12341234 11111111 00000000 88888888 87654321 12121212 11223344 123123123 1q2w3e4r 1q2w3e4r5t
qwerty12 qwerty123 qwerty1234 qwertyui qwertyuiop asdfghjk asdf1234 zxcvbnm1 1qaz2wsx qazwsx123 password password1 password12 password123
passw0rd p@ssw0rd admin123 admin1234 administrator welcome1 welcome123 letmein1 iloveyou1 abc12345 abcd1234 abcdef12 a1b2c3d4 aa123456
monkey12 dragon12 football1 baseball1 superman1 batman123 sunshine1 princess1 shadow12 master12 michael1 jennifer1 trustno1 starwars1
parol123 parol1234 parolim1 parolim123 uzbekistan1 uzbekistan123 toshkent1 tashkent1 tashkent123 samarqand1 qwerty7777 77777777 99999999
55555555 12345qwe qwe12345 zaq12wsx 1234qwer q1w2e3r4 q1w2e3r4t5 pass1234 test1234 user1234 login123 hello123 love1234 secret12
changeme1 default1 huquqyol1 huquqyol123 sevgi123 salom123 salom1234 parol2024 parol2025 parol2026 password2024 password2025 password2026`.split(/\s+/);
const SET = new Set(LIST);
export const isCommonPassword = pw => SET.has(String(pw || "").toLowerCase()) || /^(.)\1{7,}$/.test(String(pw || "")) || /^(?:0123456789|9876543210|abcdefgh)/i.test(String(pw || ""));
