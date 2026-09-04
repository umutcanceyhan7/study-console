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
            →  scripts/bank-subdomains.json (elle alt başlık etiketi, commit'li)
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

### Kayıt şeması

Alan alan tarif `SCHEMA.md`'de — hem `bank-raw.json` hem normalize edilmiş kayıt,
hangi ihlalin build'i düşürdüğüyle birlikte. Burada tekrarlanmıyor: iki kopyadan biri
kod değişince sessizce eskir.

Yeni sınav eklerken oradan iki şeye özellikle bak:

- **`section`/`topic`** — domain tahmin edilmez, platformun kendi alanından gelir.
- **`subdomain`** — blueprint alt başlığı. Biçimi zorunlu (`Subdomain 2.4: <PDF başlığı>`),
  bozuksa build düşer. Alan yoksa soru `#/bank`'ta çalışır ama `#/tasks`
  (alt konu sınavı) havuzunda **görünmez**; sonradan `scripts/bank-subdomains.json`
  ile elle etiketlenebilir.

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

## CertSafari (exam 7 ve 9–18) — yapılan iş

Adres: `https://www.certsafari.com/anthropic/claude-certified-architect-foundations`
Ücretsiz, CCAR-F 1.0 rehberine göre etiketli. On bir deneme çözüldü, 276 soru bankada.

**Yeni denemeyi bulmanın yolu tahmin değil, küme farkı.** `get-quizzes` `user_id` için tüm
denemeleri döndürür (§4); listedeki `id`'ler `data/certsafari/attempts.json` içindekilerle
karşılaştırılır, fark yeni denemedir. Sıra `created_at`'e göre kronolojik verilir. Tarayıcı yalnızca
`user_id` için, o da bir kez gerekir.

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
4. **Denemeleri `get-quizzes` listeler — doğru slug ile.** `POST /api/get-quizzes
   {user_id, vendor, certificate}` tamamlanmış denemeler dâhil hepsini döndürür,
   ama `certificate` alanı URL slug'ı **değil**:
   `claude-certified-architect-foundations-ccar-f`. Slug'ı ya da `CCAR-F`'i
   yollarsan `{"data":[]}` alırsın — 2026-08-25'te "bu uç boş dönüyor" diye
   yazılmasının sebebi buydu, uç çalışıyor. Dönen kayıttaki `id` doğrudan
   `quiz_id` yani `?resume=` token'ı; ayrıca `status`, `total_questions`,
   `correct_answers`, `created_at` gelir.
5. **user_id gerekir ama tarayıcı gerekmez.** `POST /api/get-quiz
   {quiz_id, user_id}` → `data.question_attempts[]`: `question_id`,
   `response.selectedLetters`, `is_correct`. user_id **bir kez** kullanıcının
   tarayıcısından okunur (`localStorage.certsafari_user_id` içinde JSON,
   `{userId, expiresAt, createdAt}`); ondan sonra `get-quiz`, `get-quizzes` ve
   `study-notes/for-quiz` uçlarının hepsi düz curl + tarayıcı UA'sı ile çalışır.
   Yanlış id `403` döner. `data/certsafari/fetch-attempt.sh` bu iki isteği yapar
   ve user_id'yi `CERTSAFARI_USER_ID` ortam değişkeninden okur — hiçbir dosyaya
   yazılmaz.

   ```bash
   CERTSAFARI_USER_ID=<uuid> bash data/certsafari/fetch-attempt.sh <quizId> data/certsafari
   ```
5b. **Kullanıcının kendi notları.** Site soru başına "study note" tutuyor.
   `POST /api/study-notes/for-quiz {user_id, quiz_id}` → `notes[]`:
   `question_id`, `question_number`, `question`, `domain`, `subdomain`, `body`,
   `updated_at`, `is_active`, `successor_question_id`. Uç **deneme başına**
   çalışıyor, "hepsini ver" diye bir uç yok — her `quiz_id` için tek tek çekilir.
   Yazma ucu `POST /api/study-notes/upsert`; bu depo yalnızca okur.
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

9. **Yaşam döngüsü alanları.** Soru yanıtı `is_active` ve `successor_question_id`
   taşıyor: CertSafari soruları emekliye ayırıp yerlerine yenisini koyuyor
   (ör. `65345` → `68251`). Emekli kayıt **elenmez** — denemede görülen metin
   odur — ama `stale: 1` + `successor` ile işaretlenir. 2–6 denemelerinde 99
   sorunun 7'si böyleydi. `source_urls` / `option_urls` alanları da var ama bu
   sertifikada hep boş; alıntı politikası değişmiyor.
10. **Tekrarlar kaçınılmaz.** Havuz rastgele dağıtıyor, denemeler örtüşüyor.
   Tekilleştirme `cs-<questionId>` üzerinden ve "ilk gören sahiplenir"
   kuralıyla — bu yüzden exam numaraları kronolojik verilir, eski deneme küçük
   numara alsın diye. Atlanan kayıtlar rapora basılır, sessizce yutulmaz.
   Soru numarası (`q`) denemedeki gerçek sırayı korur, yani bir sınavın içinde
   boşluklu olabilir: `E13·S9` platformdaki 9. sorudur.

Hangi denemelerin işleneceği `data/certsafari/attempts.json` manifestinde yazar:

```json
[{ "exam": 9,  "quizId": "K61jtZxsjC3BKZK", "n": 10, "label": "…" }, …]
```

Sıra önemli: önce `fetch-attempt.sh` (deneme başına iki istek — yanlışların ve notların hemen
görünür), sonra `scrape.sh` (soru başına bir istek, dakikada ~50 limitine takılır). 2026-09-03'te
eklenen beş deneme 130 satır / 117 yeni soru getirdi; 24 kayıt tekrar olduğu için atlandı.

Birleştirme ve gömme:

```bash
# soru gövdeleri — deneme başına bir kez
bash data/certsafari/scrape.sh <quizId> data/certsafari/q<exam> <n>
# senin cevapların + notların — deneme başına bir kez
CERTSAFARI_USER_ID=<uuid> bash data/certsafari/fetch-attempt.sh <quizId> data/certsafari
# manifestteki tüm sınavları tazeler, tekrarları eler, notları bağlar
node data/certsafari/merge-into-raw.mjs
BANK_PASSWORD="$(head -1 password.txt)" node scripts/build-bank.mjs
node scripts/validate.mjs
```

`merge-into-raw.mjs` ayrıca gözden geçirmek için iki dosya yazar:
`wrong-new.json` (her yanlış: hangi şıkkı işaretledin, doğrusu ne, bankada nerede)
ve `notes-merged.json` (not bağlanan her soru). Bir not bankada karşılık bulamazsa
betik **durur** — sessizce düşmez.

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
