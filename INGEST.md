# INGEST — Sınav bankasına yeni sınav ekleme

Bu dosya, `#/bank` havuzuna dışarıdan sınav çekerken izlenen yolu kayda geçirir.
Amaç: aylar sonra "bunu nasıl yapmıştık" diye tarayıcı konsolunu yeniden keşfetmemek.

Kural değişmez: **kaynağın cevap anahtarı doğruluk kanıtı değildir.** Ne Udemy ne
CertSafari. Bankaya ham hâliyle girer, `.srcline none` bloğuyla "doğrulanmadı"
diye işaretlenir. Doğrulanan bir madde bankaya değil, nota ya da `M_BUILTIN`
kaydına yazılır (bkz. CLAUDE.md).

## Ortak boru hattı

```
<platform>  →  data/<kaynak>/*.json   (ham yakalama, gitignore)
            →  data/bank-raw.json     (birleştirilmiş ham kayıtlar)
            →  scripts/build-bank.mjs (normalize → gzip → AES-256-GCM → index.html)
            →  node scripts/validate.mjs
```

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
4. **Doğru/yanlış için user_id gerekir.** `POST /api/get-quiz {quiz_id, user_id}`
   → `data.question_attempts[]`: `question_id`, `response.selectedLetters`,
   `is_correct`. user_id kullanıcının kendi tarayıcısındaki
   `localStorage.certsafari_user_id` içinde; yanlış id `403` döner. Bu yüzden bu
   adım Claude-in-Chrome ile kullanıcının Chrome profilinde çalıştırıldı
   (yeni sekme aynı origin'in localStorage'ını görüyor).
5. **Şık harfleri kanoniktir, ekrandaki sıra değil.** Sınav "Random Order"
   çalıştığı için ekranda gördüğün harf ile API'nin harfi tutmaz;
   `selectedLetters` ve `correct_answers` aynı (API) harf uzayındadır.
   `data/certsafari/attempt-*.json` bu eşlemeyi ve yanlışları saklar.
6. **Açıklamalar şık başına geliyor.** `explanations[]` = A-D için ayrı metin.
   Hepsi `feedbacks` dizisine sırayla yazılır, `explanation` doğru şıkkınkidir.
   Arayüz zaten doğru şıkkın ve işaretlediğin şıkkın açıklamasını gösteriyor
   (`index.html`, `optfb`).
7. **Metin markdown.** Udemy HTML gönderiyordu, CertSafari `` `kod` `` ve
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
