# INGEST — Sınav bankasına yeni sınav ekleme

Bu dosya, `#/bank` havuzuna dışarıdan sınav çekerken izlenen yolu kayda geçirir.
Amaç: aylar sonra "bunu nasıl yapmıştık" diye tarayıcı konsolunu yeniden keşfetmemek.

Kural değişmez: **kaynağın cevap anahtarı doğruluk kanıtı değildir.** Ne Udemy ne
CertSafari. Bankaya ham hâliyle girer, `.srcline none` bloğuyla "doğrulanmadı"
diye işaretlenir. Doğrulanan bir madde bankaya değil, nota ya da `M_BUILTIN`
kaydına yazılır (bkz. CLAUDE.md).

## Ortak boru hattı

```
<platform>  →  data/<kaynak>/*.json        (ham yakalama, gitignore)
            →  data/bank-raw.json          (birleştirilmiş ham kayıtlar)
            →  scripts/bank-excluded.json  (elenen id'ler, commit'li)
            →  scripts/build-bank.mjs      (normalize → eleme → gzip → AES-256-GCM → index.html)
            →  node scripts/validate.mjs
```

Eleme ham veriyi budamaz, yalnızca çıktıdan düşürür: `bank-excluded.json` içindeki
`ids` dizisinden bir id silinip yeniden derlenirse soru geri gelir. Liste `#/bank`
ekranındaki "Elenenler" bölümünün kopyala butonundan üretilir. Bankada karşılığı
olmayan bir id build'i düşürür — sessizce yutulmaz.

`data/` tamamen gitignore. Depoya yalnızca `index.html` içindeki ciphertext girer.

```bash
BANK_PASSWORD='...' node scripts/build-bank.mjs && node scripts/validate.mjs
```

### `bank-raw.json` kayıt şeması

| alan | zorunlu | not |
|---|---|---|
| `aid` | ✔ | platformun kendi soru id'si. Yoksa sentetik (`x6-61`). Final id `b<aid>`. |
| `exam` | ✔ | sınav numarası. UI'da `E<exam>·S<q>` diye görünür. |
| `q` | ✔ | sınav içi sıra |
| `type` | ✔ | `"multiple-choice"` — başka tip build'i düşürür |
| `section` | ✱ | platformun domain adı; `SECTION_TO_TOPIC` ile eşlenir |
| `topic` | ✱ | domain elle atandıysa. `section` ile **birlikte olamaz** |
| `question`, `answers[]` | ✔ | HTML olarak saklanır, `innerHTML` ile çizilir |
| `correct` | ✔ | tek elemanlı dizi, `["c"]` biçiminde harf |
| `explanation`, `feedbacks[]` | — | platformun açıklaması; doğrulanmamış sayılır |
| `scenario` | — | senaryo adı taşıyan sınavlarda korunur |

## Udemy (exam 1, 2, 3, 5, 6) — yapılan iş

310 soru. Kurs: Udemy CCAF Practice Exams.

1. **Sorular API'den.** Quiz'i tarayıcıda açıkken Udemy'nin `assessments`
   uç noktası soru gövdesini, şıkları, `correct_response`, `section` ve
   `explanation` alanlarını JSON olarak veriyor. `data/exam4/assessments.json`
   bu yanıtın ham hâli.
2. **Doğru/yanlış DOM'dan.** Sonuç sayfası hangi şıkkı işaretlediğini yalnızca
   DOM'da gösteriyor (`Cevabınız` etiketi). `data/exam4/attempt-dom.json` sonuç
   panelinden kazındı.
3. **Eşleştirme metinle.** İki kaynağı `data/exam4/merge.mjs` birleştirir:
   soru metni normalize edilip (etiket sök, entity çöz, küçült, ilk 120 karakter)
   eşleşme kurulur. `merged.json` + yanlışlar için `wrong.json` üretir.
4. **Domain tahmin edilmez.** `section` alanı `SECTION_TO_TOPIC` ile 1:1 eşlenir.
   Tek istisna BONUS Set 2 (exam 6): orada `section` domain değil senaryo adı
   taşıyor, 70 domain elle atandı ve `data/exam6/merge-into-raw.mjs` içindeki
   `TOPIC` tablosunda soru soru yazılı duruyor.
5. **Exam 6 kırılganlığı.** Kurs Ağustos 2026'da bankayı baştan yazdı
   (EXAMS v2). Denememiz 70 soruluk eski revizyondan; quiz'in güncel API
   revizyonu 60 soru sunuyor. 1–60 metinle eşleşip gerçek `aid` aldı, 61–70
   upstream'de artık yok → sentetik `x6-<sıra>` id + boş `explanation`.
   Şıklara ait `feedbacks` DOM'dan geldiği için duruyor.

**Sonuç: Udemy id'leri ile `M_BUILTIN` id'leri eşleşmez.** `M_BUILTIN` artık var
olmayan bir revizyondan geliyor; ortak eksen yalnızca `topic`. Eşleme uydurma.

## CertSafari (exam 7) — yapılan iş

Adres: `https://www.certsafari.com/anthropic/claude-certified-architect-foundations`
480 soru, ücretsiz, CCAR-F 1.0 rehberine göre etiketli. Deneme: 60 soru, 53 doğru.

1. **Sorular giriş istemez.** `POST /api/quiz-nth-question {quiz_id, question_index}`
   yalnızca sınav token'ını ister — çerez, oturum, user_id yok. `quiz_id`, sonuç
   linkindeki `?resume=<token>` değeridir. `question_index` **1'den** başlar;
   0 → `400`, aralık dışı → `Question index out of range.` (çekmeyi bu durdurur).
2. **Tek engel tarayıcı UA'sı.** Varsayılan curl UA'sı `42502 Access Forbidden`
   alır; `User-Agent: Mozilla/5.0 ... Chrome/140` ile geçer. Bu yüzden kazıma
   tarayıcıya gerek kalmadan kabuktan yapılabiliyor.
3. **IP başına dakikalık limit ~50 istek.** `data/certsafari/scrape.sh` soruları
   tek tek `data/certsafari/q/<i>.json` içine yazar, var olanı atlar,
   `RATE_LIMIT` görünce 65 sn bekler. Yani kesilirse aynı komut kaldığı yerden
   devam eder.

   ```bash
   bash data/certsafari/scrape.sh <resume-token> data/certsafari/q 90
   ```
4. **Denemeyi nerede bulursun.** `POST /api/get-quizzes` tamamlanmış denemeleri
   döndürmüyor (boş dizi). Tek liste sertifika ana sayfasındaki "Quiz History"
   bölümü; oradaki "View quiz results" linki `?resume=<token>&view=results`
   taşır ve token doğrudan `quiz_id`'dir. İlerleme de aynı sayfada:
   Coverage / Mastery / Performance.
5. **Doğru/yanlış için user_id gerekir.** `POST /api/get-quiz {quiz_id, user_id}`
   → `data.question_attempts[]`: `question_id`, `response.selectedLetters`,
   `is_correct`. user_id kullanıcının kendi tarayıcısındaki
   `localStorage.certsafari_user_id` içinde; yanlış id `403` döner. Bu yüzden bu
   adım Claude-in-Chrome ile kullanıcının Chrome profilinde çalıştırıldı
   (yeni sekme aynı origin'in localStorage'ını görüyor).
6. **Şık harfleri kanoniktir, ekrandaki sıra değil.** Sınav "Random Order"
   çalıştığı için ekranda gördüğün harf ile API'nin harfi tutmaz;
   `selectedLetters` ve `correct_answers` aynı (API) harf uzayındadır.
   `data/certsafari/attempt-*.json` bu eşlemeyi ve yanlışları saklar.
7. **Açıklamalar şık başına geliyor.** `explanations[]` = A-D için ayrı metin.
   Hepsi `feedbacks` dizisine sırayla yazılır, `explanation` doğru şıkkınkidir.
   Arayüz zaten doğru şıkkın ve işaretlediğin şıkkın açıklamasını gösteriyor
   (`index.html`, `optfb`).
8. **Metin markdown.** Udemy HTML gönderiyordu, CertSafari `` `kod` `` ve
   `**kalın**` gönderiyor. Banka `innerHTML` ile çizdiği için merge sırasında
   önce kaçırılır sonra `<code>`/`<b>`'ye çevrilir.

Birleştirme ve gömme:

```bash
node data/certsafari/merge-into-raw.mjs           # exam 7'yi bank-raw.json'a yazar
BANK_PASSWORD="$(head -1 password.txt)" node scripts/build-bank.mjs
node scripts/validate.mjs
```

Diğer uçlar: `/api/questions`, `/api/quiz-question-lifecycle`,
`/api/update-quiz-progress`, `/api/saved-questions`. Site Next.js; uç nokta
gövdeleri `_next/static/chunks/app/[vendor]/quiz/[id]/page-*.js` içinde okunabilir
— tahmin etmekten hızlı.

## İkinci Udemy kursu (exam 8) — "6 Practice Exams"

Kurs: `anthropic-claude-certified-architect-3-full-practice-exams`, quiz 7570481
("Practice Test 1"), 60 soru. Deneme: 55 doğru.

**Burada API işe yaramadı.** `assessments` uç noktası 60 kayıt döndü ve domain dağılımı
denememizle birebir aynıydı (16/12/12/9/11), ama soru metinleri **60/60 tutmadı** —
kurs bankayı yeniden yazmış, denememizdeki sorular upstream'de yok. O yüzden her şey
sonuç sayfasının DOM'undan alındı. Kontrol şu tek satırla yapılır; sıfır çıkıyorsa
DOM yoluna geç:

```bash
node -e 'const A=require("./data/exam8/assessments.json"),D=require("./data/exam8/attempt-dom.json");
const n=s=>String(s).replace(/<[^>]*>/g," ").toLowerCase().replace(/[^a-z0-9 ]/g,"").replace(/\s+/g," ");
const dom=n(D.map(d=>d.question+" "+d.answers.map(a=>a.body).join(" ")).join(" "));
console.log("eşleşen:",A.filter(a=>dom.includes(n(a.prompt.question).slice(-70))).length,"/",A.length)'
```

**DOM'da ne nerede** (sonuç sayfası, `?expanded=<attemptId>`):

| veri | seçici |
|---|---|
| soru panosu | `[data-purpose="question-result-header-status-label"]` → 12 seviyeye kadar yukarı, `answer-body` içeren ilk ata |
| durum | aynı elemanın metni: `Doğru` / `Yanlış` |
| **domain** | `[data-purpose="domain-pane"]` → son satır: `Domain 3: Claude Code Configuration & Workflows` |
| soru gövdesi | panonun ilk `[data-purpose="safely-set-inner-html:rich-text-viewer:html"]` elemanı |
| şık + açıklama | `[class*="result-pane--answer-result-pane"]` sarmalayıcısı: içinde `[data-purpose="answer"]` ve `[class*="answer-feedback"]` |
| doğru şık | `answer` elemanının sınıfında `answer-correct` |
| işaretlediğin şık | `answer` metninin ilk satırı `Cevabınız …` |

Domain DOM'da yazılı olduğu için exam 6'daki gibi elle tablo gerekmedi. Id'ler sentetik:
`x8-<sıra>` → `bx8-1`.

**Büyük JSON'u tarayıcıdan çıkarmanın yolu.** `javascript_tool` dönüşü ~1-2 KB'de kesiliyor,
280 KB'lık yanıt oradan geçmez. Çözüm: yerel bir alıcıya POST etmek. Node ile 4188'de
dinleyen küçük bir sunucu (`Access-Control-Allow-Origin: *`) açılır, sayfadan
`fetch("http://localhost:4188/", {method:"POST", body:JSON.stringify(veri)})` çağrılır,
sunucu gövdeyi dosyaya yazıp kapanır. https sayfasından `http://localhost`'a istek
Chrome'da geçiyor. Betik: `scratchpad/recv.mjs` deseni — depoya girmez, tek kullanımlık.

```bash
node recv.mjs data/exam8/attempt-dom.json   # tek POST bekler, yazar, çıkar
node data/exam8/merge-into-raw.mjs
BANK_PASSWORD="$(head -1 password.txt)" node scripts/build-bank.mjs && node scripts/validate.mjs
```

**Aynı sınavı iki kez ekleme.** Bir sonuç linki elde etmeden önce quiz id'sine bak:
7599280 = BONUS Set 2 = zaten exam 6. Doğrulama ucuz — API'nin 60 `aid`'i ve doğru
harfleri bankadakiyle karşılaştırılır; 60/60 tutuyorsa yeni bir şey yok.
