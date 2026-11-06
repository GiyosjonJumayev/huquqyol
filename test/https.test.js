// Proxy ortidagi HTTPS: yo‘naltirish, HSTS va upgrade-insecure-requests faqat HTTPS so‘rovda
process.env.TRUST_PROXY = "1";
process.env.FORCE_HTTPS = "1";
import { test, before, after } from "node:test";
import assert from "node:assert/strict";

let server, base;
before(async () => {
  const { app } = await import("../server/index.js");
  await new Promise(r => { server = app.listen(0, () => { base = `http://127.0.0.1:${server.address().port}`; r(); }); });
});
after(() => server.close());

test("FORCE_HTTPS: http → https (308), health check ochiq", async () => {
  const r = await fetch(base + "/?lang=ru", { redirect:"manual" });
  assert.equal(r.status, 308);
  assert.match(r.headers.get("location"), /^https:\/\/127\.0\.0\.1:\d+\/\?lang=ru$/);
  assert.equal((await fetch(base + "/api/health")).status, 200);
  const post = await fetch(base + "/api/plan", { method:"POST", headers:{ "content-type":"application/json" }, body:"{}" });
  assert.equal(post.status, 403);
});

test("HTTPS so‘rovda HSTS va upgrade-insecure-requests, Origin proxy xosti bilan mos", async () => {
  const r = await fetch(base + "/", { headers:{ "x-forwarded-proto":"https" } });
  assert.equal(r.status, 200);
  assert.match(r.headers.get("strict-transport-security"), /max-age=31536000/);
  assert.match(r.headers.get("content-security-policy"), /upgrade-insecure-requests/);
  const p = await fetch(base + "/api/plan", { method:"POST", body:'{"scenario":"qarz"}',
    headers:{ "content-type":"application/json", "x-forwarded-proto":"https", "x-forwarded-host":"huquqyol.uz", origin:"https://huquqyol.uz" } });
  assert.equal(p.status, 200);
});
