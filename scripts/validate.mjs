#!/usr/bin/env node
/**
 * index.html bütünlük kontrolü.
 *
 * Bu dosya bir kez sessizce bozuldu: Search bloğunda kapanmamış bir yorum
 * tüm <script> bloğunu SyntaxError'a düşürdü ve sayfa boş açıldı. Aynı geçiş
 * CSS'te `*` seçicisini ve düzinelerce :hover pseudo-class'ını da yedi.
 * Hiçbiri gözle fark edilmedi. Bu betik onu CI'da yakalar.
 *
 * Sıfır bağımlılık — yalnızca Node stdlib.
 */

import { readFileSync, existsSync } from "node:fs";
import { Script, createContext } from "node:vm";
import { TASK_STATEMENTS } from "./tasks.mjs";

const FILE = "index.html";
const SUBDOMAINS = "scripts/bank-subdomains.json";

const ALLOWED_DOC_HOSTS = new Set([
  "docs.anthropic.com",
  "platform.claude.com",
  "code.claude.com",
  "modelcontextprotocol.io",
  "anthropic.com",
  "www.anthropic.com",
  /* Anthropic'in kendi yardım merkezi. Ürün-destek sayfası, geliştirici
     dokümanı değil — bir kaydın iddiası buraya dayanıyorsa `why` bunu söyler. */
  "support.claude.com",
]);

const VALID_VERDICTS = new Set(["ok", "conflict", "dated", "authoritative", "unverified"]);

/* contrast bloğu: çeldiricinin sınıfı ve doğru şıkkın kazandığı eksen. index.html'deki
   CONTRAST_KIND / CONTRAST_AXIS tabloları ile birebir aynı kalmalı. */
const VALID_CONTRAST_KINDS = new Set(["both-work", "wrong-layer", "weaker-guarantee", "invented", "scope"]);
const VALID_CONTRAST_AXES = new Set(["simplicity", "determinism", "cost", "latency", "precision", "official-default"]);

/* Veri bloğundan doldurulur; banka denetimi konu anahtarlarını buradan okur. */
let TOPIC_KEYS = null;

/* Blueprint alt başlıkları. scripts/tasks.mjs tek kaynak; index.html kendi
   kopyasını taşımak zorunda (tek dosya kuralı), o yüzden burada ikisinin
   ayrışmadığı doğrulanır. */
const TASK_IDS = new Set(Object.keys(TASK_STATEMENTS));

const errors = [];
const warnings = [];
const fail = m => errors.push(m);
const warn = m => warnings.push(m);

/* ---------- 1. Dosya ---------- */

if (!existsSync(FILE)) {
  console.error(`✗ ${FILE} yok.`);
  process.exit(1);
}
const html = readFileSync(FILE, "utf8");
if (html.length < 1000) fail(`${FILE} şüpheli derecede küçük (${html.length} bayt).`);

/* ---------- 2. Head ---------- */

if (!/<meta\s+charset=/i.test(html)) {
  fail("<meta charset> yok. Türkçe karakterler mojibake olur.");
}
if (!/<title>[^<]+<\/title>/i.test(html)) fail("<title> yok veya boş.");
if (!/<meta\s+name=["']viewport["']/i.test(html)) fail("viewport meta yok.");

/* ---------- 3. Kendine yeterlilik (harici istek yok) ---------- */

const externalPatterns = [
  [/<script[^>]+\bsrc=/i, "<script src=…> — harici betik"],
  [/<link[^>]+rel=["']?stylesheet/i, "<link rel=stylesheet> — harici stil"],
  [/@import\s/i, "@import — harici stil"],
  [/url\(\s*["']?https?:/i, "url(http…) — harici varlık"],
  [/<img[^>]+\bsrc=["']?https?:/i, "<img src=http…> — harici görsel"],
];
for (const [re, label] of externalPatterns) {
  if (re.test(html)) fail(`Harici bağımlılık bulundu: ${label}. Dosya tek parça kalmalı.`);
}

/* ---------- 4. CSS ---------- */

const styleBlocks = [...html.matchAll(/<style>([\s\S]*?)<\/style>/gi)];
if (styleBlocks.length !== 1) {
  fail(`Tam olarak 1 <style> bloğu bekleniyor, ${styleBlocks.length} bulundu.`);
} else {
  const css = styleBlocks[0][1];
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, "");

  if (/\/\*/.test(stripped)) fail("CSS'te kapanmamış /* yorumu var.");

  let depth = 0, minDepth = 0;
  for (const ch of stripped) {
    if (ch === "{") depth++;
    else if (ch === "}") { depth--; if (depth < minDepth) minDepth = depth; }
  }
  if (depth !== 0) fail(`CSS süslü parantezleri dengesiz (net ${depth > 0 ? "+" : ""}${depth}).`);
  if (minDepth < 0) fail("CSS'te fazladan kapanış parantezi var.");

  // Geçmişteki hata: `*` seçicisi düştü ve kural `{` ile başladı.
  if (/(^|\n)\s*\{/.test(stripped)) {
    fail("Seçicisi olmayan CSS kuralı var (satır doğrudan `{` ile başlıyor). Seçici düşmüş olabilir.");
  }

  if (!/:focus-visible/.test(stripped)) warn("CSS'te :focus-visible yok — klavye odağı görünmeyebilir.");
  if (!/prefers-reduced-motion/.test(stripped)) warn("prefers-reduced-motion medya sorgusu yok.");
  if (!/prefers-color-scheme/.test(stripped)) warn("prefers-color-scheme medya sorgusu yok.");
}

/* ---------- 5. JS sözdizimi ---------- */

const scriptBlocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/gi)];
let js = null;
if (scriptBlocks.length !== 1) {
  fail(`Tam olarak 1 satır-içi <script> bloğu bekleniyor, ${scriptBlocks.length} bulundu.`);
} else {
  js = scriptBlocks[0][1];
  try {
    // Klasik <script> semantiği: modül sarmalayıcısı yok.
    new Script(js, { filename: "index.html<script>" });
  } catch (e) {
    fail(`Satır-içi JS ayrıştırılamıyor: ${e.message}`);
  }
}

/* ---------- 6. Veri bütünlüğü ---------- */

if (js && errors.length === 0) {
  const start = js.indexOf("const TOPICS");
  const end = js.indexOf("const LS_KEY");

  if (start < 0 || end < 0 || end <= start) {
    fail("Veri bloğu bulunamadı (const TOPICS … const LS_KEY sınırları).");
  } else {
    const dataSrc = js.slice(start, end);
    let D;
    try {
      const ctx = createContext({});
      D = new Script(
        `(() => { ${dataSrc}\n return { TOPICS, DOMAINS, TASKS, CONCEPTS, NOTES, USAGE, M_BUILTIN, EXAMS_BUILTIN }; })()`,
        { filename: "data" }
      ).runInContext(ctx, { timeout: 5000 });
    } catch (e) {
      fail(`Veri bloğu çalıştırılamadı: ${e.message}`);
    }

    if (D) {
      const { TOPICS, DOMAINS, TASKS, CONCEPTS, NOTES, USAGE, M_BUILTIN, EXAMS_BUILTIN } = D;
      const topicKeys = new Set(Object.keys(TOPICS));
      TOPIC_KEYS = topicKeys;
      const conceptKeys = new Set(Object.keys(CONCEPTS));

      /* TASKS ↔ scripts/tasks.mjs. Kopya sessizce ayrışırsa #/tasks ekranı
         PDF'te olmayan bir başlık gösterir ya da bankadaki `task` alanının
         karşılığı bulunamaz — ikisi de gözle fark edilmez. */
      {
        const seen = new Set(Object.keys(TASKS ?? {}));
        for (const id of TASK_IDS) {
          if (!seen.has(id)) { fail(`TASKS: '${id}' eksik (scripts/tasks.mjs'te var).`); continue; }
          const a = TASKS[id], b = TASK_STATEMENTS[id];
          if (a.title !== b.title) fail(`TASKS[${id}]: başlık scripts/tasks.mjs ile aynı değil.`);
          if (Number(a.domain) !== b.domain) fail(`TASKS[${id}]: domain ${a.domain}, beklenen ${b.domain}.`);
          if (Number(a.pdf) !== b.pdf) fail(`TASKS[${id}]: PDF sayfası ${a.pdf}, beklenen ${b.pdf}.`);
          if (!String(a.short || "").trim()) fail(`TASKS[${id}]: 'short' boş — chip etiketsiz çizilir.`);
          if (id.split(".")[0] !== String(a.domain)) fail(`TASKS[${id}]: id öneki domain ${a.domain} ile uyuşmuyor.`);
        }
        for (const id of seen) {
          if (!TASK_IDS.has(id)) fail(`TASKS: '${id}' scripts/tasks.mjs'te yok — blueprint'te olmayan alt başlık.`);
        }
      }
      const DOMAIN_KEYS = new Set(Object.keys(DOMAINS ?? {}));

      if (!topicKeys.size) fail("TOPICS boş.");
      if (DOMAIN_KEYS.size !== 5) fail(`DOMAINS 5 alan içermeli, ${DOMAIN_KEYS.size} bulundu.`);
      if (!M_BUILTIN.length) fail("M_BUILTIN boş.");

      const ids = new Set();
      for (const m of M_BUILTIN) {
        const at = `M_BUILTIN[${m.id ?? "?"}]`;

        for (const k of ["id", "exam", "q", "topic", "diff", "verdict", "scenario", "your", "correct"]) {
          if (m[k] === undefined || m[k] === null || m[k] === "") fail(`${at}: '${k}' eksik.`);
        }
        if (ids.has(m.id)) fail(`${at}: yinelenen id.`);
        ids.add(m.id);

        if (!topicKeys.has(m.topic)) fail(`${at}: bilinmeyen topic '${m.topic}'.`);
        if (!VALID_VERDICTS.has(m.verdict)) fail(`${at}: geçersiz verdict '${m.verdict}'.`);
        if (![1, 2, 3].includes(m.diff)) fail(`${at}: diff 1-3 olmalı, '${m.diff}' bulundu.`);

        for (const c of m.concepts ?? []) {
          if (!conceptKeys.has(c)) fail(`${at}: bilinmeyen kavram '${c}'.`);
        }

        // m.docs ve contrast.docs aynı sözleşmeye tabi: [başlık, url], Anthropic alan adı.
        const checkDocs = (list, where) => {
          for (const d of list ?? []) {
            if (!Array.isArray(d) || d.length !== 2) { fail(`${at}: ${where} girdisi [başlık, url] olmalı.`); continue; }
            let host;
            try { host = new URL(d[1]).host; } catch { fail(`${at}: geçersiz doc URL '${d[1]}'.`); continue; }
            // Doğrulanmamış içe-aktarımlar kursun kendi kaynağını taşıyabilir.
            if (m.verdict !== "unverified" && !ALLOWED_DOC_HOSTS.has(host)) {
              fail(`${at}: resmî olmayan kaynak '${host}'. Yalnızca Anthropic alan adları.`);
            }
          }
        };
        checkDocs(m.docs, "docs");

        if (m.contrast !== undefined) {
          const c = m.contrast;
          if (typeof c !== "object" || c === null || Array.isArray(c)) {
            fail(`${at}: contrast bir nesne olmalı.`);
          } else {
            if (!VALID_CONTRAST_KINDS.has(c.kind)) fail(`${at}: geçersiz contrast.kind '${c.kind}'.`);
            if (!VALID_CONTRAST_AXES.has(c.axis)) fail(`${at}: geçersiz contrast.axis '${c.axis}'.`);
            for (const k of ["yours", "gap", "when", "rec"]) {
              if (typeof c[k] !== "string" || !c[k].trim()) fail(`${at}: contrast.${k} boş olamaz.`);
            }
            checkDocs(c.docs, "contrast.docs");
            // rec bir olgu iddiasıdır; atıfsız kalmamalı.
            if (!(c.docs ?? []).length && !(m.docs ?? []).length) {
              warn(`${at}: contrast var ama ne contrast.docs ne m.docs — 'rec' iddiası atıfsız.`);
            }
          }
        }
      }

      // İlişkiler ancak tüm id'ler toplandıktan sonra çözülebilir.
      for (const m of M_BUILTIN) {
        for (const r of m.related ?? []) {
          if (!ids.has(r)) fail(`M_BUILTIN[${m.id}]: related '${r}' hiçbir kayda karşılık gelmiyor.`);
        }
      }

      for (const [num, ex] of Object.entries(EXAMS_BUILTIN)) {
        const at = `EXAMS_BUILTIN[${num}]`;
        for (const k of ["name", "total", "correct", "wrong"]) {
          if (ex[k] === undefined) fail(`${at}: '${k}' eksik.`);
        }
        if (ex.correct + ex.wrong > ex.total) {
          fail(`${at}: correct+wrong (${ex.correct + ex.wrong}) > total (${ex.total}).`);
        }
        /* `hit` kayıtları yanlış değil: doğru cevaplanmış ama not düşülmüş
           sorular. Arayüzdeki "yanlış" sayaçları da bunları dışarıda bırakır. */
        const counted = M_BUILTIN.filter(m => String(m.exam) === String(num) && !m.hit).length;
        if (counted !== ex.wrong) {
          warn(`${at}: wrong=${ex.wrong} ama ${counted} kayıt var. Kasıtlıysa sorun yok.`);
        }
      }

      for (const n of NOTES) {
        const at = `NOTES[${n.id ?? "?"}]`;
        if (!topicKeys.has(n.topic)) fail(`${at}: bilinmeyen topic '${n.topic}'.`);
        // Blueprint alanı: filtre ve rozet buna bağlı, eksikse sayfa patlar.
        if (!DOMAIN_KEYS.has(String(n.domain))) fail(`${at}: geçersiz domain '${n.domain}'. 1-5 olmalı.`);
        for (const t of n.tasks ?? []) {
          if (!TASK_IDS.has(t)) fail(`${at}: blueprint'te olmayan task statement '${t}'. Örn. '1.6'.`);
          if (t.split(".")[0] !== String(n.domain)) {
            fail(`${at}: task '${t}' domain ${n.domain} ile uyuşmuyor.`);
          }
        }
        if (!Array.isArray(n.source) || n.source.length !== 2) fail(`${at}: source [başlık, url] olmalı.`);
        for (const s of n.sections ?? []) {
          if (!s.id || !s.h || !s.html) fail(`${at}: bölümde id/h/html eksik.`);
        }
        // Zincirlenmiş sorular: kırık id sessizce kaybolur, kart hiç çizilmez.
        for (const r of n.related ?? []) {
          if (!r || typeof r !== "object" || !r.id || !r.why) {
            fail(`${at}: related girdisi { id, why } olmalı.`);
            continue;
          }
          if (!ids.has(r.id)) fail(`${at}: related '${r.id}' hiçbir kayda karşılık gelmiyor.`);
        }
      }

      /* Kullanım kartları: doğru/yanlış sözdizimi tek yerde. Yanlış blok
         eksikse kart amacını kaybeder — kontrast olmadan ezber yok. */
      const usageIds = new Set();
      for (const u of USAGE ?? []) {
        const at = `USAGE[${u.id ?? "?"}]`;

        for (const k of ["id", "title", "ask"]) {
          if (!u[k]) fail(`${at}: '${k}' eksik.`);
        }
        if (usageIds.has(u.id)) fail(`${at}: yinelenen id.`);
        usageIds.add(u.id);

        if (!DOMAIN_KEYS.has(String(u.domain))) fail(`${at}: geçersiz domain '${u.domain}'. 1-5 olmalı.`);
        // Çapraz domain referansına izin var (tool_choice hem 2.3 hem 4.3),
        // ama en az biri kartın kendi domain'ine ait olmalı.
        const tasks = u.tasks ?? [];
        if (!tasks.length) fail(`${at}: en az bir task statement gerekli.`);
        for (const t of tasks) {
          if (!TASK_IDS.has(t)) fail(`${at}: blueprint'te olmayan task statement '${t}'. Örn. '2.3'.`);
        }
        if (tasks.length && !tasks.some(t => t.split(".")[0] === String(u.domain))) {
          fail(`${at}: hiçbir task domain ${u.domain} ile uyuşmuyor.`);
        }

        if (!Array.isArray(u.good) || !u.good.length) fail(`${at}: en az bir 'good' örnek gerekli.`);
        if (!Array.isArray(u.bad) || !u.bad.length) {
          fail(`${at}: 'bad' örnek yok. Kartın işi doğruyu yanlışın yanına koymak.`);
        }
        for (const [key, list] of [["good", u.good], ["bad", u.bad]]) {
          for (const s of list ?? []) {
            if (!s.label || !s.code) fail(`${at}: '${key}' girdisinde label/code eksik.`);
          }
        }

        // Kaynak zorunlu: iddia varsa tıklanabilir dayanağı da olmalı.
        if (!Array.isArray(u.src) || !u.src.length) {
          if (!u.pdf) fail(`${at}: ne doküman bağlantısı ne PDF atfı var.`);
        }
        for (const d of u.src ?? []) {
          if (!Array.isArray(d) || d.length !== 2) { fail(`${at}: src girdisi [başlık, url] olmalı.`); continue; }
          let host;
          try { host = new URL(d[1]).host; } catch { fail(`${at}: geçersiz src URL '${d[1]}'.`); continue; }
          if (!ALLOWED_DOC_HOSTS.has(host)) {
            fail(`${at}: resmî olmayan kaynak '${host}'. Yalnızca Anthropic/MCP alan adları.`);
          }
        }
      }

      console.log(
        `  veri: ${M_BUILTIN.length} yanlış · ${Object.keys(EXAMS_BUILTIN).length} sınav · ` +
        `${topicKeys.size} konu · ${conceptKeys.size} kavram · ${NOTES.length} not · ` +
        `${(USAGE ?? []).length} kullanım kartı`
      );
    }
  }
}

/* ---------- 7. Soru bankası bloğu ---------- */

/* Banka şifreli gömülür (bkz. scripts/build-bank.mjs). Buradaki denetim
   içeriği çözmez — parola yok. Kontrol edilen şey blob'un şekli ve en
   önemlisi: düz metin bankanın kazara sızmamış olması. */

{
  const BEGIN = "/* BANK:BEGIN */";
  const END = "/* BANK:END */";

  const nBegin = html.split(BEGIN).length - 1;
  const nEnd = html.split(END).length - 1;

  if (nBegin !== 1 || nEnd !== 1) {
    fail(`Banka işaretleri tam olarak birer kez geçmeli (BEGIN=${nBegin}, END=${nEnd}).`);
  } else {
    const body = html.slice(html.indexOf(BEGIN) + BEGIN.length, html.indexOf(END)).trim();

    if (body === "const BANK_BLOB = null;") {
      warn("Banka gömülü değil (placeholder). `node scripts/build-bank.mjs` çalıştırılmamış.");
    } else {
      const m = body.match(/^const BANK_BLOB = (\{[\s\S]*\});$/);
      if (!m) {
        fail("Banka bloğu beklenen `const BANK_BLOB = {…};` şeklinde değil.");
      } else {
        let blob;
        try { blob = JSON.parse(m[1]); } catch (e) { fail(`Banka blob JSON değil: ${e.message}`); }

        if (blob) {
          if (blob.v !== 1) fail(`Banka şema sürümü 1 olmalı, '${blob.v}' bulundu.`);
          if (blob.cipher !== "AES-GCM") fail(`Banka şifresi AES-GCM olmalı, '${blob.cipher}' bulundu.`);
          if (!blob.kdf || blob.kdf.hash !== "SHA-256") fail("Banka KDF hash'i SHA-256 olmalı.");
          if (!blob.kdf || blob.kdf.iter < 100000) fail(`PBKDF2 tur sayısı çok düşük (${blob.kdf?.iter}).`);
          if (!Number.isInteger(blob.n) || blob.n < 1) fail(`Banka soru sayısı geçersiz: '${blob.n}'.`);

          if (!/^[A-Za-z0-9+/]+=*$/.test(blob.d || "")) {
            fail("Banka payload'ı geçerli base64 değil.");
          } else {
            const raw = Buffer.from(blob.d, "base64");
            /* salt(16) + iv(12) + tag(16) = 44 bayt başlık, sonrası ciphertext. */
            if (raw.length < 64) fail(`Banka payload'ı şüpheli derecede kısa (${raw.length} bayt).`);
          }

          const sum = Object.values(blob.topics || {}).reduce((a, b) => a + b, 0);
          if (sum !== blob.n) fail(`Banka konu toplamı ${sum}, beyan edilen soru sayısı ${blob.n}.`);

          if (TOPIC_KEYS) {
            for (const k of Object.keys(blob.topics || {})) {
              if (!TOPIC_KEYS.has(k)) fail(`Banka bilinmeyen konu anahtarı taşıyor: '${k}'.`);
            }
          }

          /* Task dağılımı #/tasks ekranını kilitliyken besliyor. Toplamı `n`'e
             EŞİT olmak zorunda değil — etiketsiz soru sayılmaz — ama aşamaz. */
          if (blob.tasks === undefined) {
            warn("Banka blob'unda `tasks` yok. build-bank.mjs eski sürümle çalıştırılmış; #/tasks kilitliyken sayı gösteremez.");
          } else {
            let tsum = 0;
            for (const [k, v] of Object.entries(blob.tasks || {})) {
              if (!TASK_IDS.has(k)) fail(`Banka bilinmeyen task anahtarı taşıyor: '${k}'.`);
              if (!Number.isInteger(v) || v < 1) fail(`Banka task '${k}' sayısı geçersiz: '${v}'.`);
              else tsum += v;
            }
            if (tsum > blob.n) fail(`Banka task toplamı ${tsum}, soru sayısı ${blob.n} — aşamaz.`);
            console.log(`  task etiketi: ${tsum}/${blob.n} soru · ${Object.keys(blob.tasks).length}/${TASK_IDS.size} alt başlıkta soru var`);
          }

          console.log(`  banka: ${blob.n} soru · ${(Buffer.from(blob.d, "base64").length / 1024).toFixed(1)} KB şifreli · ` +
            `${Object.entries(blob.topics).map(([k, v]) => `${k}=${v}`).join(" ")}`);
        }
      }
    }
  }

  /* Elle task etiketi dosyası. Şekli burada denetlenir çünkü CI'da banka
     çözülmüş hâlde yok; id'nin bankada karşılığı olup olmadığını build-bank.mjs
     bakar (orada banka elinde). Bkz. SCHEMA.md. */
  if (existsSync(SUBDOMAINS)) {
    let cfg = null;
    try { cfg = JSON.parse(readFileSync(SUBDOMAINS, "utf8")); }
    catch (e) { fail(`${SUBDOMAINS} JSON değil: ${e.message}`); }
    if (cfg !== null) {
      if (typeof cfg !== "object" || Array.isArray(cfg)) {
        fail(`${SUBDOMAINS}: { "<id>": { task, why } } nesnesi olmalı.`);
      } else {
        for (const [id, ent] of Object.entries(cfg)) {
          const at = `${SUBDOMAINS}[${id}]`;
          if (!ent || typeof ent !== "object" || Array.isArray(ent)) { fail(`${at}: { task, why } bekleniyor.`); continue; }
          if (!TASK_IDS.has(ent.task)) fail(`${at}: blueprint'te olmayan task '${ent.task}'.`);
          /* `why` zorunlu: elle etiket bir çıkarımdır, gerekçesiz yazılamaz. */
          if (!String(ent.why || "").trim()) fail(`${at}: 'why' boş.`);
        }
      }
    }
  }

  /* Sızıntı kanaryası. data/bank.json yalnızca yerelde var (gitignore'lu);
     varsa gerçek soru metinlerinin index.html'de DÜZ olarak geçmediği
     doğrulanır. CI'da dosya yok, o zaman bu kontrol atlanır — blob şekli
     kontrolleri yine de çalışır. */
  const BANK_JSON = "data/bank.json";
  if (existsSync(BANK_JSON)) {
    let bank = null;
    try { bank = JSON.parse(readFileSync(BANK_JSON, "utf8")); }
    catch (e) { warn(`${BANK_JSON} okunamadı: ${e.message}`); }

    if (Array.isArray(bank) && bank.length) {
      let leaked = 0;
      /* Her sorudan bir imza parçası; hepsini taramak gereksiz, örneklem yeter. */
      const step = Math.max(1, Math.floor(bank.length / 40));
      for (let i = 0; i < bank.length; i += step) {
        const q = bank[i];
        const probe = String(q.question || "").replace(/<[^>]+>/g, "").trim().slice(0, 60);
        if (probe.length >= 30 && html.includes(probe)) leaked++;
      }
      if (leaked) {
        fail(`Düz metin banka sızıntısı: ${leaked} soru metni index.html'de şifresiz geçiyor.`);
      } else {
        console.log(`  sızıntı kontrolü: ${bank.length} sorunun örneklemi düz metin olarak bulunamadı ✓`);
      }
    }
  }
}

/* ---------- Rapor ---------- */

for (const w of warnings) console.warn(`  uyarı: ${w}`);

if (errors.length) {
  console.error(`\n✗ ${FILE} doğrulaması başarısız — ${errors.length} hata:\n`);
  for (const e of errors) console.error(`  · ${e}`);
  console.error("");
  process.exit(1);
}

console.log(`✓ ${FILE} geçti (${(html.length / 1024).toFixed(1)} KB, tek dosya, harici bağımlılık yok)`);
