import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

// Toshkentda 2026-11-20 01:30 = UTC bo‘yicha 2026-11-19 20:30. Foydalanuvchi «bugun» (20-noyabr) ni tanlaydi.
const CHILD = `
  const Real = Date, NOW = Real.UTC(2026, 10, 19, 20, 30);
  globalThis.Date = class extends Real { constructor(...a){ super(...(a.length ? a : [NOW])); } static now(){ return NOW; } };
  const { vPlan } = await import(${JSON.stringify(new URL("../server/validate.js", import.meta.url).href)});
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  try { vPlan({ scenario:"ish_haqi", triggerDate:"2026-11-20" }); console.log(tz + "|ok"); }
  catch (e) { console.log(tz + "|" + (e.key || e.message)); }
`;
const run = tz => execFileSync(process.execPath, ["--input-type=module", "-e", CHILD],
  { env: { ...process.env, TZ: tz }, encoding: "utf8" }).trim();

test("Vaqt mintaqasi: UTC serverda tunda bugungi sana «kelajak» bo‘lib qoladi, Asia/Tashkent da — yo‘q", () => {
  assert.match(run("UTC"), /^(UTC|Etc\/UTC)\|future$/);   // muammo: server UTC bo‘yicha hali 19-noyabr
  assert.equal(run("Asia/Tashkent"), "Asia/Tashkent|ok");
});

test("Vaqt mintaqasi: barcha deploy sozlamalarida TZ=Asia/Tashkent, app.cjs da standart qiymat", () => {
  const read = f => readFileSync(new URL("../" + f, import.meta.url), "utf8");
  assert.match(read("Dockerfile"), /TZ=Asia\/Tashkent/);
  assert.match(read("render.yaml"), /key: TZ\s+value: Asia\/Tashkent/);
  assert.match(read(".env.example"), /^TZ=Asia\/Tashkent$/m);
  assert.match(read("deploy/huquqyol.service"), /^Environment=TZ=Asia\/Tashkent$/m);
  assert.match(read("deploy/ecosystem.config.cjs"), /TZ: "Asia\/Tashkent"/);
  assert.match(read("app.cjs"), /if \(!process\.env\.TZ\) process\.env\.TZ = "Asia\/Tashkent"/);
});
