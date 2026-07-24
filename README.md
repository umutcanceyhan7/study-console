# CCAF Study Console

Claude Certified Architect – Foundations (CCA-F) deneme sınavlarında yapılan yanlışlardan türetilmiş, dokümantasyon-öncelikli kişisel çalışma konsolu.

Her yanlış kayıt şu zinciri taşır: **senin cevabın → doğru cevap → neden kaçırdın → resmî Anthropic dokümanı ne diyor → kaynak linkleri**. Kursun cevabı resmî dokümanla çeliştiğinde bu ayrıca işaretlenir.

**Canlı:** https://umutcanceyhan.com/study-console/

## Yapı

Tek dosya. Harici bağımlılık yok, build adımı yok, framework yok.

```
index.html          uygulamanın tamamı (HTML + inline CSS + inline JS)
PRODUCT.md          strateji: kullanıcı, amaç, kişilik, anti-referanslar, ilkeler
DESIGN.md           görsel sistem: OKLCH token'ları, tip ölçeği, bileşen kuralları
scripts/validate.mjs  CI doğrulaması (sıfır bağımlılık, yalnızca Node stdlib)
```

`index.html` çift tıklanarak da açılır. Sunucu gerekmez.

## Veri modeli

Tüm içerik `index.html` içindeki JS nesnelerinde yaşar:

| Nesne | İçerik |
|---|---|
| `TOPICS` | 5 sınav alanı (`pe`, `tool`, `cc`, `agent`, `ctx`) |
| `CONCEPTS` | soruları çapraz bağlayan kavram etiketleri |
| `M_BUILTIN` | doğrulanmış yanlış kayıtları |
| `EXAMS_BUILTIN` | sınav başına skor özeti |
| `NOTES` | dokümantasyondan derlenmiş çalışma notları |

Bir yanlış kaydının şeması:

```js
{
  id: "e2q50", exam: 2, q: 50,
  topic: "pe",                 // TOPICS anahtarı
  diff: 2,                     // 1 | 2 | 3
  concepts: ["structured"],    // CONCEPTS anahtarları
  related: ["e2q54"],          // aynı şeyi test eden kayıt id'leri
  verdict: "ok",               // ok | conflict | dated | authoritative | unverified
  scenario: "…", your: "…", correct: "…",
  why: "…",                    // Türkçe koçluk (HTML izinli)
  official: "…",               // resmî dokümana dayalı açıklama
  docs: [["Tool use", "https://docs.anthropic.com/…"]]
}
```

`verdict` değerleri: `ok` dokümanla uyumlu · `conflict` kurs cevabı dokümanla çelişiyor · `dated` kabaca doğru ama güncel değil · `authoritative` çelişkinin doğrusunu veren referans soru · `unverified` içe aktarıldı, henüz doğrulanmadı.

## Yeni test ekleme

Uygulamadaki **Test ekle** sayfası Udemy sonuç sayfasının düz metnini ayrıştırır ve kayıtları `localStorage`'a yazar (`unverified` rozetiyle). Bu tarayıcıya özeldir, repoya girmez.

Kalıcı hâle getirmek için: aynı sayfadaki kopyala düğmesiyle kayıtları al, koçluk ve resmî doğrulama ekle, `M_BUILTIN` içine işle.

## CI/CD

`main`'e her push `.github/workflows/deploy.yml` çalıştırır:

1. **Doğrula** — `scripts/validate.mjs`
2. **Yayınla** — `index.html` GitHub Pages'a (yalnızca push'ta, PR'da değil)

Pull request'lerde yalnızca doğrulama koşar, deploy edilmez.

### Doğrulama neyi kontrol eder

- Satır-içi JS sözdizimi (`vm.Script` ile ayrıştırma)
- CSS parantez dengesi, kapanmamış yorum, **seçicisi düşmüş kural**
- `<meta charset>`, `<title>`, viewport
- **Kendine yeterlilik**: harici script / stylesheet / font / görsel yok
- Veri bütünlüğü: zorunlu alanlar, yinelenen id, geçersiz `topic` / `verdict` / `diff`, çözülmeyen `related` referansları
- **Kaynak otoritesi**: doğrulanmış kayıtların `docs` linkleri yalnızca Anthropic resmî alan adlarına gidebilir (`docs.anthropic.com`, `platform.claude.com`, `code.claude.com`, `modelcontextprotocol.io`, `anthropic.com`)

Bu kontroller teorik değil. Dosya bir kez sessizce bozuldu: Search bloğundaki kapanmamış bir yorum tüm `<script>` bloğunu `SyntaxError`'a düşürdü ve sayfa boş açıldı; aynı geçiş CSS'te `*` seçicisini ve düzinelerce `:hover` pseudo-class'ını yedi. Hiçbiri gözle fark edilmedi. Validator üçünü de yakalar.

Yerelde çalıştır:

```bash
node scripts/validate.mjs
```

### Barındırma

`umutcanceyhan7.github.io` kullanıcı sitesinde `umutcanceyhan.com` özel alan adı tanımlı olduğu için, aynı hesaptaki proje Pages siteleri otomatik olarak `umutcanceyhan.com/<repo-adı>/` altından yayınlanır. Bu repoya ayrıca `CNAME` dosyası **eklenmemeli** — ana siteyle çakışır.

## İçerik notu

Soru senaryoları ve cevap metinleri üçüncü taraf bir deneme sınavı kursundan türetilmiştir; kişisel çalışma amacıyla özetlenmiş ve resmî dokümantasyona karşı yorumlanmıştır. Resmî teknik iddiaların tamamı Anthropic'in kendi dokümantasyonuna dayanır ve kaynak linkleriyle verilmiştir.
