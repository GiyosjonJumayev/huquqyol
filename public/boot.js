// «Yozmoqda…» nuqtalari bir brauzer seansida faqat bir marta: keyingi ochilishlarda xabar darhol ko‘rinadi.
// <head>da sinxron yuklanadi — birinchi chizishdan oldin html.typed qo‘yiladi (sakrash bo‘lmaydi).
try { if (sessionStorage.getItem("hy_typed")) document.documentElement.classList.add("typed"); else sessionStorage.setItem("hy_typed", "1"); } catch { /* saqlash yopiq — nuqtalar har safar */ }
