// Bepul OCR (Tesseract, WebAssembly): AI kalitisiz ham hujjat rasmidagi matnni o‘qiydi.
// Hammasi serverning o‘zida ishlaydi — tashqi xizmat, internet va pul kerak emas.
// Til fayllari npm paketlaridan (@tesseract.js-data/*) olinadi: rus + o‘zbek lotin + o‘zbek kirill.
// Bitta worker navbat bilan ishlaydi (xotira tejaladi); osilib qolsa — to‘xtatilib, qayta yaratiladi.
import { createRequire } from "node:module";
import { mkdirSync, copyFileSync, existsSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";

const require = createRequire(import.meta.url);
// Tartib muhim: tesseract.js da «uzb+rus» tartibida ikkinchi til yuklanmaydi, «rus+uzb+uzb_cyrl» to‘g‘ri ishlaydi
export const OCR_LANGS = ["rus", "uzb", "uzb_cyrl"];
const TIMEOUT_MS = Number(process.env.OCR_TIMEOUT_MS || 25_000);
const MAX_QUEUE = 4;

export const ocrEnabled = () => !/^(0|false|off)$/i.test(process.env.OCR || "");

// Uchala til fayli bitta papkaga (Tesseract bitta langPath oladi). Bir marta nusxalanadi.
function langDir(){
  const dir = process.env.OCR_DATA_DIR || join(tmpdir(), "huquqyol-tessdata-4.0.0_best_int");
  mkdirSync(join(dir, "cache"), { recursive: true });
  for (const l of OCR_LANGS){
    const src = join(dirname(require.resolve(`@tesseract.js-data/${l}/package.json`)), "4.0.0_best_int", `${l}.traineddata.gz`);
    const dst = join(dir, `${l}.traineddata.gz`);
    if (!existsSync(dst) || statSync(dst).size !== statSync(src).size) copyFileSync(src, dst);
  }
  return dir;
}

let workerP = null;
async function getWorker(){
  if (!workerP){
    workerP = (async () => {
      const { createWorker, OEM } = require("tesseract.js");
      const dir = langDir();
      return createWorker(OCR_LANGS.join("+"), OEM.LSTM_ONLY, {
        langPath: dir, cachePath: join(dir, "cache"), gzip: true,
        errorHandler: () => {}            // xato quyida promise orqali qaytadi; matn logga yozilmaydi
      });
    })();
    workerP.catch(() => { workerP = null; });
  }
  return workerP;
}

async function reset(){
  const p = workerP; workerP = null;
  try { (await p)?.terminate(); } catch {}
}

export class OcrError extends Error {
  constructor(key, status){ super(key); this.key = key; this.status = status; }
}

let chain = Promise.resolve(), pending = 0;

// Rasm (Buffer) → { text, confidence }
export function recognize(buf){
  if (!ocrEnabled()) return Promise.reject(new OcrError("photoNoOcr", 503));
  if (pending >= MAX_QUEUE) return Promise.reject(new OcrError("photoBusy", 429));
  pending++;
  const job = chain.then(async () => {
    const w = await getWorker();
    let timer;
    const timeout = new Promise((_, rej) => { timer = setTimeout(() => rej(new OcrError("photoSlow", 504)), TIMEOUT_MS); });
    try {
      const { data } = await Promise.race([w.recognize(buf), timeout]);
      return { text: String(data.text || ""), confidence: Math.round(Number(data.confidence) || 0) };
    } catch (e) {
      await reset();                                               // osilgan yoki buzilgan worker qayta yaratiladi
      if (e instanceof OcrError) throw e;
      console.warn("[ocr] xato:", e?.name || "error");
      throw new OcrError("photoUnread", 422);
    } finally { clearTimeout(timer); }
  });
  chain = job.catch(() => {}).finally(() => { pending--; });
  return job;
}

// Serverni ishga tushirishda oldindan yuklash: birinchi foydalanuvchi kutmasin
export function warmUp(){ if (ocrEnabled()) getWorker().catch(() => {}); }
export async function shutdown(){ await reset(); }
