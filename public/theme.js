// Mavzu: avtomatik (tizim sozlamasi) / yorug‘ / qorong‘i. Tanlov hy_theme cookie’da saqlanadi va server sahifani
// shu mavzuda chizadi (data-theme) — sahifa ochilganda «miltillash» bo‘lmaydi. Barcha sahifalarda ishlaydi (JS modulsiz).
(() => {
  const root = document.documentElement;
  const mq = matchMedia("(prefers-color-scheme: dark)");
  const COLORS = { light: "#F5F6F2", dark: "#0B111C" };
  const mode = () => root.dataset.theme === "light" || root.dataset.theme === "dark" ? root.dataset.theme : "auto";
  const effective = () => mode() === "auto" ? (mq.matches ? "dark" : "light") : mode();

  function sync(){
    const eff = effective(), m = mode();
    document.querySelectorAll('meta[name="theme-color"]').forEach(meta => {
      const media = meta.getAttribute("media") || "";
      meta.content = m === "auto" ? COLORS[/dark/.test(media) ? "dark" : "light"] : COLORS[eff];
    });
    document.querySelectorAll("[data-theme-toggle]").forEach(b => {
      b.setAttribute("aria-pressed", String(eff === "dark"));
      const label = b.dataset[eff === "dark" ? "labelLight" : "labelDark"];
      if (label){ b.title = label; const sr = b.querySelector(".sr"); if (sr) sr.textContent = label; }
    });
    document.querySelectorAll("[data-theme-set]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.themeSet === m)));
  }
  function apply(next){
    // Almashish paytida CSS o‘tishlari o‘chiriladi: ranglar bir zumda almashadi (oraliq, past kontrastli holat bo‘lmaydi)
    root.classList.add("theme-switch");
    if (next === "auto") delete root.dataset.theme; else root.dataset.theme = next;
    void root.offsetWidth;
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove("theme-switch")));
    document.cookie = next === "auto" ? "hy_theme=; path=/; max-age=0; samesite=lax" : `hy_theme=${next}; path=/; max-age=31536000; samesite=lax`;
    sync();
    const live = document.getElementById("live");
    const msg = document.querySelector(`[data-theme-set="${next}"]`)?.dataset.done;
    if (live && msg){ live.textContent = ""; setTimeout(() => { live.textContent = msg; }, 30); }
  }
  document.addEventListener("click", e => {
    const tg = e.target.closest("[data-theme-toggle]");
    if (tg){ apply(effective() === "dark" ? "light" : "dark"); return; }
    const set = e.target.closest("[data-theme-set]");
    if (set) apply(set.dataset.themeSet);
  });
  mq.addEventListener?.("change", sync);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", sync); else sync();
})();
