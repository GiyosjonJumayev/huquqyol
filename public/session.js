// Sessiya: «Chiqish» tugmasi (navbar menyusi, «Hisobim» va admin sarlavhasi, 403 sahifasi) — barcha sahifalarda bir xil.
// <button data-logout [data-next="/kirish"]> — serverda sessiya o‘chiriladi, keyin bosh sahifaga (yoki data-next ga) o‘tiladi.
document.addEventListener("click", async e => {
  const b = e.target.closest("[data-logout]"); if (!b) return;
  e.preventDefault();
  b.disabled = true;
  // Umumiy kompyuterda keyingi odam mijozlar ma’lumotini ko‘rmasin: kabinet nusxasi brauzerdan o‘chiriladi (serverda saqlangan)
  try { for (const k of Object.keys(localStorage)) if (k.startsWith("huquqyol:pro")) localStorage.removeItem(k); } catch {}
  try { await fetch("/api/auth/logout", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}", credentials: "same-origin" }); } catch {}
  location.assign(b.dataset.next || "/");
});

// Navbar sig‘ishi: bo‘limlar, til va hisob bir qatorga sig‘masa — hammasi ☰ menyuga yig‘iladi (.navbar.compact).
// Kenglik, til, shrift darajasi va ism uzunligidan qat’i nazar hech narsa ustma-ust tushmaydi.
// JavaScript’siz holat uchun CSS dagi zaxira qoida: kirgan foydalanuvchida 1280px gacha ☰.
let lastKey = "";
function fitNav(force = false){
  const key = `${innerWidth}|${document.documentElement.dataset.fs || 0}|${document.querySelector(".navbar")?.hasAttribute("data-auth")}`;
  if (!force && key === lastKey) return;
  lastKey = key;
  for (const nb of document.querySelectorAll(".navbar")){
    nb.classList.remove("compact");
    const links = nb.querySelector(".navlinks"), right = nb.querySelector(".navright"), brand = nb.querySelector(".brand");
    if (!links || getComputedStyle(links).display === "none") continue;         // allaqachon ☰ (CSS qoidasi)
    const l = links.getBoundingClientRect(), r = right.getBoundingClientRect(), b = brand.getBoundingClientRect();
    const overflow = links.scrollWidth > links.clientWidth + 1 || l.right > r.left + 1 || b.right > l.left + 1 || r.right > nb.getBoundingClientRect().right + 1;
    nb.classList.toggle("compact", overflow);
  }
}
addEventListener("resize", () => fitNav());
addEventListener("hy:layout", () => fitNav(true));
document.fonts?.ready.then(() => fitNav(true));
fitNav(true);
