# SCHEMA.md — bankaya soru eklemenin zorunlu şeması

Bu dosya **soru kaydının** şeklini tarif eder: `data/bank-raw.json` içine ne yazılır,
`scripts/build-bank.mjs` bunu neye çevirir, ve hangi ihlal build'i düşürür.

*Nasıl* kazınacağı burada değil — o `INGEST.md`. Burası *ne* yazılacağı.

Kural: **şema build'de zorunludur.** Aşağıdaki her "✗" satırı `build-bank.mjs`'i
`process.exit(1)` ile düşürür. Uyarı verip geçen bir alan yok; sessizce kabul edilen
bozuk kayıt, sonradan yanlış konuda çalışmak demek.

---

## 1. Ham kayıt — `data/bank-raw.json`

Dizinin her elemanı bir soru. `data/` gitignore'lu; bu dosya depoya girmez.

| alan | zorunlu | not |
|---|---|---|
| `aid` | ✔ | platformun kendi soru id'si. Yoksa sentetik (`x6-61`, `cs-65768`). Final id `b<aid>`. |
| `exam` | ✔ | sınav numarası. UI'da `E<exam>·S<q>` diye görünür. |
| `q` | ✔ | sınav içi sıra |
| `type` | ✔ | `"multiple-choice"` — başka tip build'i düşürür |
| `section` | ✱ | platformun domain adı; `SECTION_TO_TOPIC` ile eşlenir |
| `topic` | ✱ | domain elle atandıysa. `section` ile **birlikte olamaz** |
| `subdomain` | — | blueprint alt başlığı. Biçimi zorunlu — bkz. §3 |
| `question`, `answers[]` | ✔ | HTML olarak saklanır, `innerHTML` ile çizilir |
| `correct` | ✔ | tek elemanlı dizi, `["c"]` biçiminde harf |
| `explanation`, `feedbacks[]` | — | platformun açıklaması; **doğrulanmamış** sayılır |
| `scenario` | — | senaryo adı taşıyan sınavlarda korunur |
| `source` | — | platform etiketi (`certsafari`, `udemy-6exams`) |
| `note` | — | `[{ body, at }]` — kullanıcının platformda yazdığı not |
| `stale`, `successor` | — | upstream'de emekliye ayrılmış soru; kayıt yine de kalır |
| `miss` | — | platformda herhangi bir denemede yanlışlanmış |

✱ = `section` ya da `topic`, biri olmak zorunda, ikisi birden olamaz.

Domain **tahmin edilmez**: `section`/`topic` platformun kendi alanından gelir.
Tek istisna ve gerekçesi `CLAUDE.md`'de yazılı (BONUS Set 2, exam 6).

## 2. Normalize kayıt — `data/bank.json` ve çözülmüş `BANK`

`build-bank.mjs` ham kaydı buna çevirir; ciphertext'e giren ve tarayıcının gördüğü şey budur.

| alan | her kayıtta | not |
|---|---|---|
| `id` | ✔ | `b<aid>` |
| `exam`, `q` | ✔ | |
| `topic` | ✔ | `TOPICS` anahtarı: `agent` · `tool` · `cc` · `pe` · `ctx` |
| `task` | — | `"2.4"` — `subdomain`'den türetilir. **`#/tasks` modunun tek dayanağı** |
| `question`, `answers[]`, `correct` | ✔ | `correct` tamsayı indeks (`"a"` → `0`) |
| `explanation`, `feedbacks[]` | ✔ | boş dize / boş dizi olabilir |
| `scenario`, `source`, `note`, `stale`, `successor`, `miss` | — | varsa taşınır |

Uzun `subdomain` dizesi **normalize çıktıda yoktur**. Başlığın tek sahibi
`index.html`'deki `TASKS` tablosu; kayıt yalnızca `"2.4"` taşır. Aynı başlığın iki
kopyası olsaydı biri doküman değişince sessizce eskirdi.

## 3. `subdomain` sözleşmesi

**Biçim, harfi harfine:**

```
Subdomain <N.M>: <PDF'teki task statement başlığı>
```

Örnek:

```
Subdomain 2.4: Integrate MCP servers into Claude Code and agent workflows
```

Kurallar:

- `<N.M>` `scripts/tasks.mjs`'teki 30 alt başlıktan biri olmak zorunda. ✗ değilse build düşer.
- Başlık `TASK_STATEMENTS[<N.M>].title` ile **birebir** eşleşmeli — tek karakter fark ✗.
  Başlıklar `ClaudeCertifiedArchitectFoundationsGuide.pdf` (CCAR-F v1.0, pp.5-23)
  metninden alındı; değiştirmek isteyen önce PDF'e bakar.
- Alan **isteğe bağlıdır**. Yoksa kayıt normal çalışır, yalnızca `#/tasks` havuzuna girmez.

Bugünkü kapsam: 276/646 soru etiketli, hepsi CertSafari'den. Udemy kayıtlarında
platform alt başlık vermiyor.

### Neden zorunlu

`#/tasks` "2.4'te zorlanıyorum" diyen birine 2.4 sorusu vaat ediyor. Tahmin edilmiş ya da
yazımı kaymış bir etiket bu vaadi sessizce bozar: ekran yine 12 soru gösterir, sorular
yanlış konudandır. O yüzden biçim build'de kontrol edilir, çalışma zamanında değil.

## 4. Etiketi olmayan soruyu elle etiketlemek

Platform etiketi vermiyorsa etiket `scripts/bank-subdomains.json` üzerinden verilir.
Bu dosya depoya girer ve **kod değişikliği gerektirmez**: satır ekle, yeniden derle,
soru `#/tasks` havuzuna girer.

```json
{
  "bx8-12": {
    "task": "2.4",
    "why": "Soru .mcp.json'daki server scope önceliğini soruyor; TS 2.4 Skills bullet'ı 'Configuring MCP servers at project, user, and local scopes'. PDF s.11."
  }
}
```

Kurallar (hepsi build'i düşürür):

- anahtar bankada var olan bir id olmalı ✗
- `task` 30 alt başlıktan biri olmalı ✗
- `why` boş olamaz ✗
- kayıtta zaten platform etiketi varsa ve **farklıysa** ✗ — platform verisi ezilmez.
  Aynıysa gereksiz girdi uyarısı verilir.

### `why` neden zorunlu

`CLAUDE.md`'nin kuralı domain'in tahmin edilmemesi. Elle etiket tanımı gereği bir
**çıkarım**dır — o kuralın yanında durabilmesi için gerekçesiyle yazılır. Gerekçe
sorunun kendi içeriğini PDF'teki task statement'ın Knowledge/Skills madde işaretlerine
bağlamalı; "MCP geçiyor, 2.4 olsun" gerekçe değildir. Emin olamıyorsan etiketleme:
etiketsiz soru `#/bank`'ta çalışmaya devam eder, yanlış etiketli soru çalışmaz.

## 5. Alt başlık tablosunun tek kaynağı

`scripts/tasks.mjs` → `TASK_STATEMENTS`. 30 kayıt: `{ domain, pdf, title }`.

`index.html` kendi literal kopyasını taşır (`const TASKS`), çünkü tek dosya olmak
zorunda ve derleme adımı yok. İkisinin ayrışmasını `validate.mjs` hata sayar:
id kümesi, `title`, `domain` ve `pdf` birebir eşleşmeli. `index.html` kopyasındaki
`short` alanı yalnızca arayüz etiketidir, doğrulama dışı.

`NOTES[].tasks` ve `USAGE[].tasks` da bu tabloya karşı kontrol edilir — blueprint'te
olmayan bir alt başlık numarası (`"3.99"`) artık geçmez.

## 6. Bilinen boşluk

`CARDS[].task` (`index.html`, `#/cards`) doğrulanmıyor: `validate.mjs`'in VM'de
çalıştırdığı veri dilimi `const TOPICS` ile `const LS_KEY` arasında, `CARDS` ise
onun dışında kalıyor. Dilim uzatılırsa bu kontrol de eklenmeli. `CARDS` alanının adı
tekil (`task`), `NOTES`/`USAGE`'ta ise çoğul (`tasks`) — bu da tutarsız.

## 7. Kontrol listesi

Yeni soru ya da yeni sınav eklemeden önce:

```bash
BANK_PASSWORD='...' node scripts/build-bank.mjs && node scripts/validate.mjs
```

Build çıktısındaki `task dağılımı` satırı kaç sorunun etiketlendiğini söyler.
`CLAUDE.md`'deki sayımlar aynı commit'te güncellenir.
