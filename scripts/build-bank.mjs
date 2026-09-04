#!/usr/bin/env node
/**
 * Soru bankasını normalize eder, sıkıştırır, şifreler ve index.html'e gömer.
 *
 * Neden şifreleme, neden "parola doğru mu" kontrolü değil:
 * site statik ve herkese açık. Bir JS koşulu içeriği gizlemez — kaynağı
 * görüntüle yeter. O yüzden gate yok: payload'ın kendisi AES-256-GCM ile
 * şifrelenir. index.html'e yalnızca ciphertext girer, parola hiçbir yerde
 * durmaz. Yanlış parola GCM auth tag'ini tutturamaz, çözme başarısız olur.
 *
 * Akış:  data/bank-raw.json → normalize → elle task etiketi
 *                             (scripts/bank-subdomains.json)
 *                           → eleme (scripts/bank-excluded.json)
 *                           → data/bank.json
 *                           → gzip → PBKDF2-SHA256 → AES-256-GCM → base64
 *                           → index.html içindeki BANK:BEGIN/END arası
 *
 * Kullanım:
 *   node scripts/build-bank.mjs                  # yeni parola üretir ve yazdırır
 *   BANK_PASSWORD='...' node scripts/build-bank.mjs   # mevcut parolayla yeniden şifreler
 *
 * Sıfır bağımlılık — yalnızca Node stdlib.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { pbkdf2Sync, randomBytes, createCipheriv } from "node:crypto";
import { TASK_STATEMENTS, parseSubdomain } from "./tasks.mjs";

const RAW = "data/bank-raw.json";
const NORM = "data/bank.json";
const HTML = "index.html";
const EXCLUDED = "scripts/bank-excluded.json";
const SUBDOMAINS = "scripts/bank-subdomains.json";

const BEGIN = "/* BANK:BEGIN */";
const END = "/* BANK:END */";

/* Tarayıcı tarafındaki çözücüyle birebir aynı olmak zorunda. */
const KDF_ITER = 210000;
const KDF_HASH = "sha256";

/* Platformun `section` alanı → index.html'deki TOPICS anahtarı.
   Udemy alanı çıplak domain adını, CertSafari "Domain 3: ..." önekli hâlini
   yazıyor; ikisi de burada eşlenir, hiçbiri tahmin edilmez. */
const SECTION_TO_TOPIC = {
  "Agentic Architecture & Orchestration": "agent",
  "Tool Design & MCP Integration": "tool",
  "Claude Code Configuration & Workflows": "cc",
  "Prompt Engineering & Structured Output": "pe",
  "Context Management & Reliability": "ctx",
  "Domain 1: Agentic Architecture & Orchestration": "agent",
  "Domain 2: Tool Design & MCP Integration": "tool",
  "Domain 3: Claude Code Configuration & Workflows": "cc",
  "Domain 4: Prompt Engineering & Structured Output": "pe",
  "Domain 5: Context Management & Reliability": "ctx",
};

const TOPIC_KEYS = new Set(Object.values(SECTION_TO_TOPIC));

const die = m => { console.error(`✗ ${m}`); process.exit(1); };
const warn = m => console.warn(`! ${m}`);

/* ---------- 1. Normalize ---------- */

if (!existsSync(RAW)) die(`${RAW} yok. Önce bankayı tarayıcıdan çıkar.`);

const raw = JSON.parse(readFileSync(RAW, "utf8"));
if (!Array.isArray(raw) || !raw.length) die(`${RAW} boş veya dizi değil.`);

let bank = raw.map((a, idx) => {
  const at = `kayıt#${idx} (aid ${a.aid})`;

  /* Domain normalde kursun `section` alanından gelir — tahmin yok. Tek istisna
     BONUS Set 2 (exam 6): o quizde `section` blueprint domain'i değil senaryo
     adını taşıyor, o yüzden domain kayıt başına elle atanmış hâlde `topic`
     alanıyla gelir (bkz. data/exam6/merge-into-raw.mjs). İkisi birden olmaz. */
  const topic = a.topic || SECTION_TO_TOPIC[a.section];
  if (!topic) die(`${at}: bilinmeyen section '${a.section}' ve topic yok.`);
  if (!TOPIC_KEYS.has(topic)) die(`${at}: geçersiz topic '${topic}'.`);
  if (a.topic && a.section) die(`${at}: hem section hem topic var, hangisi geçerli belirsiz.`);

  if (a.type !== "multiple-choice") die(`${at}: beklenmeyen tip '${a.type}'.`);
  if (!Array.isArray(a.answers) || a.answers.length < 2) die(`${at}: şık yok.`);
  if (!Array.isArray(a.correct) || a.correct.length !== 1) {
    die(`${at}: tek doğru cevap bekleniyor, ${a.correct?.length} bulundu.`);
  }

  const correct = a.correct[0].charCodeAt(0) - 97; // "a" → 0
  if (correct < 0 || correct >= a.answers.length) {
    die(`${at}: doğru cevap '${a.correct[0]}' şık aralığı dışında.`);
  }

  /* Metin HTML olarak saklanır ve innerHTML ile çizilir: Udemy içeriği <p> ile
     sarıyor ve kesme işaretini &#x27; olarak kodluyor. Entity'leri burada
     çözmüyoruz — innerHTML zaten doğru çözer, erken çözmek <p> gibi gerçek
     etiketlerle kodlanmış örnekleri birbirine karıştırırdı.

     Tek temizlik: kurs yazarının araç artığı olan `[cite: 449, 195]` işaretleri.
     Hiçbir şeye çözülmüyorlar — bu projede kaynak zaten resmî dokümana bağlanır,
     kursun iç numaralarına değil. */
  const clean = s => String(s || "").replace(/\s*\[cite:[^\]]*\]/g, "");

  /* Blueprint alt başlığı. Biçim zorunlu: alan varsa
     `Subdomain <N.M>: <PDF'teki başlık>` olmak zorunda ve başlık
     scripts/tasks.mjs ile birebir eşleşmeli. Sessiz kabul yok — bozuk bir
     etiket #/tasks havuzunu sessizce yanlış doldururdu.

     Uzun dize çıktıya girmez, yalnızca `task` ("2.4") girer: başlığın tek
     sahibi index.html'deki TASKS tablosu. Ham dosya dizeyi korur. */
  let task;
  if (a.subdomain) {
    task = parseSubdomain(a.subdomain);
    if (!task) die(`${at}: geçersiz subdomain '${a.subdomain}'. Bkz. SCHEMA.md.`);
  }

  return {
    id: `b${a.aid}`,
    exam: a.exam,
    q: a.q,
    topic,
    ...(task ? { task } : {}),
    ...(a.scenario ? { scenario: a.scenario } : {}),
    ...(a.source ? { source: a.source } : {}),
    /* CertSafari'ye özgü alanlar. `note` kullanıcının kendi sözü — kursun
       açıklamasıyla aynı yerde durmaz, arayüzde ayrı çizilir. `stale` sorunun
       upstream'de emekliye ayrıldığını söyler; kayıt yine de kalır çünkü
       denemede görülen metin budur. */
    ...(Array.isArray(a.note) && a.note.length ? { note: a.note } : {}),
    ...(a.stale ? { stale: 1, successor: a.successor ?? null } : {}),
    ...(a.miss ? { miss: 1 } : {}),
    question: clean(a.question),
    answers: a.answers.map(clean),
    correct,
    explanation: clean(a.explanation),
    feedbacks: (Array.isArray(a.feedbacks) ? a.feedbacks : []).map(clean),
  };
});

const ids = new Set(bank.map(b => b.id));
if (ids.size !== bank.length) die("banka içinde yinelenen id var.");

/* ---------- 1b. Eleme ---------- */

/* ---------- 1b. Elle task etiketi ---------- */

/* Platform etiketi olmayan sorular (Udemy'nin tamamı) #/tasks modunda
   görünmez. Onları göstermek için kod değil veri gerekir: bu dosyaya bir satır
   eklemek ve yeniden derlemek yeter.

   Elle etiket bir çıkarımdır — CLAUDE.md'nin "domain tahmin edilmez" kuralının
   yanında durabilmesi için gerekçesi (`why`) zorunlu. Platformun kendi verisi
   sessizce ezilmez: çakışma build'i düşürür. Bkz. SCHEMA.md. */
let tagged = 0;
{
  let cfg = {};
  if (existsSync(SUBDOMAINS)) {
    try { cfg = JSON.parse(readFileSync(SUBDOMAINS, "utf8")); }
    catch (e) { die(`${SUBDOMAINS} okunamadı: ${e.message}`); }
  }
  if (cfg === null || typeof cfg !== "object" || Array.isArray(cfg)) {
    die(`${SUBDOMAINS} bir nesne olmalı: { "<id>": { "task": "2.4", "why": "..." } }`);
  }

  const byId = new Map(bank.map(b => [b.id, b]));
  for (const [id, ent] of Object.entries(cfg)) {
    const at = `${SUBDOMAINS}[${id}]`;
    const rec = byId.get(id);
    if (!rec) die(`${at}: bankada böyle bir id yok.`);
    if (!ent || typeof ent !== "object" || Array.isArray(ent)) {
      die(`${at}: { task, why } nesnesi bekleniyor.`);
    }
    if (!TASK_STATEMENTS[ent.task]) die(`${at}: geçersiz task '${ent.task}'.`);
    if (!String(ent.why || "").trim()) die(`${at}: 'why' boş. Elle etiket gerekçesiz yazılmaz.`);

    if (rec.task) {
      if (rec.task !== ent.task) {
        die(`${at}: platform bu soruyu '${rec.task}' diyor, dosya '${ent.task}'. ` +
            `Platform verisi ezilmez — önce hangisinin doğru olduğunu yaz.`);
      }
      warn(`${at}: platform zaten '${rec.task}' etiketini veriyor, girdi gereksiz.`);
      continue;
    }
    rec.task = ent.task;
    tagged++;
  }
}

/* Elenen sorular ham dosyadan silinmez, yalnızca çıktıdan düşer: bir id'yi
   listeden çıkarıp yeniden derlemek soruyu geri getirir. Filtre normalize'dan
   sonra ve NORM yazımından önce — böylece data/bank.json, blob'un `n`/`topics`
   alanları ve validate.mjs'in sızıntı kanaryası hep gönderilen kümeyi anlatır. */
let dropped = 0;
{
  let cfg = { ids: [] };
  if (existsSync(EXCLUDED)) {
    try { cfg = JSON.parse(readFileSync(EXCLUDED, "utf8")); }
    catch (e) { die(`${EXCLUDED} okunamadı: ${e.message}`); }
  }
  const list = Array.isArray(cfg) ? cfg : cfg.ids;
  if (!Array.isArray(list)) die(`${EXCLUDED} içinde \`ids\` dizisi yok.`);

  /* Bankada karşılığı olmayan id sessizce yutulmaz: ya yazım hatasıdır ya da
     ham veriden düşmüş bir kayıttır, ikisi de görülmeli. */
  const unknown = list.filter(id => !ids.has(id));
  if (unknown.length) die(`${EXCLUDED}: bankada olmayan id: ${unknown.join(", ")}`);

  if (list.length) {
    const excluded = new Set(list);
    bank = bank.filter(b => !excluded.has(b.id));
    dropped = excluded.size;
  }
}
if (!bank.length) die("eleme sonrası banka boş kaldı.");

const topics = {};
for (const b of bank) topics[b.topic] = (topics[b.topic] || 0) + 1;

/* Task dağılımı meta'da açıkta durur: #/tasks seçim ekranı banka kilitliyken de
   soru sayılarını gösterebilsin diye. Toplamı `n`'den küçük olabilir —
   etiketsiz sorular sayılmaz. */
const tasks = {};
for (const b of bank) if (b.task) tasks[b.task] = (tasks[b.task] || 0) + 1;

writeFileSync(NORM, JSON.stringify(bank, null, 1));

/* ---------- 2. Parola ---------- */

/* Karıştırılabilir karakterler (0/O, 1/l/I) alfabede yok. */
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
function makePassword() {
  const groups = [];
  for (let g = 0; g < 4; g++) {
    const bytes = randomBytes(5);
    groups.push([...bytes].map(b => ALPHABET[b % ALPHABET.length]).join(""));
  }
  return groups.join("-");
}

const password = process.env.BANK_PASSWORD || makePassword();
const generated = !process.env.BANK_PASSWORD;

/* ---------- 3. Sıkıştır + şifrele ---------- */

const plain = Buffer.from(JSON.stringify(bank), "utf8");
const packed = gzipSync(plain, { level: 9 });

const salt = randomBytes(16);
const iv = randomBytes(12);
const key = pbkdf2Sync(password, salt, KDF_ITER, 32, KDF_HASH);

const cipher = createCipheriv("aes-256-gcm", key, iv);
const ct = Buffer.concat([cipher.update(packed), cipher.final()]);
const tag = cipher.getAuthTag();

/* salt(16) | iv(12) | tag(16) | ciphertext */
const payload = Buffer.concat([salt, iv, tag, ct]).toString("base64");

/* Meta gizli değil: kilitli ekranda "240 soru var" diyebilmek ve validate.mjs'in
   blob'u içeriği çözmeden denetleyebilmesi için açıkta duruyor. */
const blob = {
  v: 1,
  n: bank.length,
  topics,
  tasks,
  kdf: { hash: "SHA-256", iter: KDF_ITER, keyLen: 256 },
  cipher: "AES-GCM",
  built: new Date().toISOString().slice(0, 10),
  d: payload,
};

/* ---------- 4. index.html'e göm ---------- */

if (!existsSync(HTML)) die(`${HTML} yok.`);
let html = readFileSync(HTML, "utf8");

const i = html.indexOf(BEGIN);
const j = html.indexOf(END);
if (i < 0 || j < 0 || j <= i) die(`${HTML} içinde ${BEGIN} … ${END} işaretleri bulunamadı.`);
if (html.indexOf(BEGIN, i + 1) >= 0 || html.indexOf(END, j + 1) >= 0) {
  die("işaretler birden çok kez geçiyor.");
}

const line = `${BEGIN}\nconst BANK_BLOB = ${JSON.stringify(blob)};\n${END}`;
html = html.slice(0, i) + line + html.slice(j + END.length);
writeFileSync(HTML, html);

/* ---------- Rapor ---------- */

const kb = n => (n / 1024).toFixed(1) + " KB";
console.log(`✓ ${bank.length} soru gömüldü${dropped ? ` (${dropped} elendi, bkz. ${EXCLUDED})` : ""}`);
console.log(`  konu dağılımı: ${Object.entries(topics).map(([k, v]) => `${k}=${v}`).join(" · ")}`);
const taskTotal = Object.values(tasks).reduce((a, b) => a + b, 0);
console.log(`  task dağılımı (${taskTotal}/${bank.length} etiketli${tagged ? `, ${tagged} elle` : ""}): ` +
  Object.keys(TASK_STATEMENTS).filter(t => tasks[t]).map(t => `${t}=${tasks[t]}`).join(" · "));
const untagged = Object.keys(TASK_STATEMENTS).filter(t => !tasks[t]);
if (untagged.length) console.log(`  sorusu olmayan task: ${untagged.join(", ")}`);
console.log(`  düz metin ${kb(plain.length)} → gzip ${kb(packed.length)} → base64 ${kb(payload.length)}`);
console.log(`  ${HTML}: ${kb(html.length)}`);

if (generated) {
  console.log(`\n  PAROLA: ${password}`);
  console.log(`  Bunu kaydet. Hiçbir yere yazılmadı ve tekrar gösterilemez.`);
  console.log(`  Aynı parolayla yeniden derlemek için: BANK_PASSWORD='${password}' node scripts/build-bank.mjs`);
} else {
  console.log(`\n  Mevcut parola (BANK_PASSWORD) kullanıldı.`);
}
