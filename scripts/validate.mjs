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

const FILE = "index.html";

const ALLOWED_DOC_HOSTS = new Set([
  "docs.anthropic.com",
  "platform.claude.com",
  "code.claude.com",
  "modelcontextprotocol.io",
  "anthropic.com",
  "www.anthropic.com",
]);

const VALID_VERDICTS = new Set(["ok", "conflict", "dated", "authoritative", "unverified"]);

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
        `(() => { ${dataSrc}\n return { TOPICS, CONCEPTS, NOTES, M_BUILTIN, EXAMS_BUILTIN }; })()`,
        { filename: "data" }
      ).runInContext(ctx, { timeout: 5000 });
    } catch (e) {
      fail(`Veri bloğu çalıştırılamadı: ${e.message}`);
    }

    if (D) {
      const { TOPICS, CONCEPTS, NOTES, M_BUILTIN, EXAMS_BUILTIN } = D;
      const topicKeys = new Set(Object.keys(TOPICS));
      const conceptKeys = new Set(Object.keys(CONCEPTS));

      if (!topicKeys.size) fail("TOPICS boş.");
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

        for (const d of m.docs ?? []) {
          if (!Array.isArray(d) || d.length !== 2) { fail(`${at}: docs girdisi [başlık, url] olmalı.`); continue; }
          let host;
          try { host = new URL(d[1]).host; } catch { fail(`${at}: geçersiz doc URL '${d[1]}'.`); continue; }
          // Doğrulanmamış içe-aktarımlar kursun kendi kaynağını taşıyabilir.
          if (m.verdict !== "unverified" && !ALLOWED_DOC_HOSTS.has(host)) {
            fail(`${at}: resmî olmayan kaynak '${host}'. Yalnızca Anthropic alan adları.`);
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
        const counted = M_BUILTIN.filter(m => String(m.exam) === String(num)).length;
        if (counted !== ex.wrong) {
          warn(`${at}: wrong=${ex.wrong} ama ${counted} kayıt var. Kasıtlıysa sorun yok.`);
        }
      }

      for (const n of NOTES) {
        const at = `NOTES[${n.id ?? "?"}]`;
        if (!topicKeys.has(n.topic)) fail(`${at}: bilinmeyen topic '${n.topic}'.`);
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

      console.log(
        `  veri: ${M_BUILTIN.length} yanlış · ${Object.keys(EXAMS_BUILTIN).length} sınav · ` +
        `${topicKeys.size} konu · ${conceptKeys.size} kavram · ${NOTES.length} not`
      );
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
