# Product

## Register

product

## Users

Tek kullanıcı: Umutcan. Claude Certified Architect – Foundations (CCA-F) sınavına hazırlanan, deneme sınavlarında yaptığı yanlışları resmî Anthropic dokümantasyonuyla karşılaştırarak çalışan bir mühendis.

Kullanım bağlamı: masaüstü, uzun ve odaklı okuma seansları, sınav öncesi baskı. Ekranda geçirilen süre saatlerle ölçülür; oturum boyunca yüzlerce satır Türkçe koçluk metni ve İngilizce teknik cevap yan yana okunur.

Yapılmak istenen iş: "hangi konuda, hangi düşünce hatası yüzünden kaybettim, doğrusu resmî dokümanda ne diyor, sırada ne çalışmalıyım" sorusunu tek oturumda cevaplamak. Ek olarak: yeni deneme sınavı sonucunu yapıştırıp platforma katmak.

## Product Purpose

Deneme sınavı yanlışlarını, resmî kaynakla doğrulanmış ve birbirine bağlanmış kişisel bir bilgi tabanına dönüştüren tek dosyalık çalışma konsolu.

Ne yapar: yanlışları konuya, kavrama ve zorluğa göre indeksler; her yanlış için "senin cevabın / doğru cevap / neden kaçırdın / resmî açıklama / kaynak linkleri" zincirini kurar; kurs cevabı ile resmî dokümanın çeliştiği yerleri ayrıca işaretler; yanlış yoğunluğundan bir çalışma sırası türetir.

Başarı ölçüsü: sınava girmeden önce her `conflict` ve `dated` kaydın çözülmüş olması, zayıf konudaki yanlış yoğunluğunun düşmesi, ve yeni bir deneme sonucunun kod yazmadan platforma girebilmesi.

Sınırlar: harici bağımlılık yok, backend yok, tek `index.html` dosyası. Kalıcılık `localStorage`. Bu bir kısıt değil, ürünün tanımı.

## Brand Personality

Sıcak, koyucu, motive edici.

Ses tonu: iyi bir özel dersin hocası gibi. Yanlışı yumuşatmaz ama suçlamaz; "burada olasılığa güvendin, oysa determinizm kurabilirdin" der. Türkçe koçluk metni ikinci tekil şahıs, doğrudan, kısa cümlelerle konuşur. Teknik terimler ve cevap metinleri İngilizce kalır — sınavdaki haliyle.

Duygusal hedef: oturmaya davet. Açıldığında panik değil yön hissi vermeli; "39 yanlışın var" değil, "bugün şuradan başla" duygusu.

Hata çerçevesi: yanlış bir kusur değil sinyaldir. Arayüz yanlışları kırmızı bir ceza listesi gibi değil, üzerinde çalışılacak malzeme gibi sunar.

## Anti-references

- **Anthropic Docs kopyası.** Mevcut hali tam olarak bu: krem zemin, turuncu vurgu, docs sidebar'ı. Anthropic içeriği çalışan bir araç, Anthropic markası taşımamalı. Ödünç kimlik = kimliksizlik.
- **Jenerik SaaS dashboard.** Eşit boyutlu kart ızgarası, dev metrik + küçük etiket bloğu, gradient vurgu, her şeyin bir kutuya sarılması.
- **Udemy / LMS estetiği.** Mor-mavi, rozet ve konfeti, ders kartı ızgarası, ilerleme çubuğu kutlaması. Kaynak veri Udemy'den geliyor; görünüş oradan gelmemeli.
- **Notion / Obsidian nötrlüğü.** Karaktersiz gri, emoji ikon dizisi, boş şablon hissi.

## Design Principles

1. **Yanlış malzemedir, ceza değil.** Kırmızı bir hata listesi değil, üzerinde çalışılacak bir dosya. Renk ve dil suçlamaz, yönlendirir.
2. **Her ekran bir sonraki hamleyi söyler.** Dashboard skor panosu değil çalışma emri; konu sayfası arşiv değil ders planı. Ölçüm varsa, ölçümün yanında eylem olmalı.
3. **Kaynak taşıyıcıdır.** Resmî doküman linki dipnot değil, iddianın temeli. `verdict` sistemi (ok / conflict / dated / authoritative / unverified) arayüzde ikinci sınıf bir rozet değil, birinci sınıf bir eksen.
4. **Tek uzman kullanıcı için yoğunluk.** Onboarding yok, açıklayıcı tur yok, boş alan israfı yok. Kullanıcı alanı biliyor; arayüz bilgiyi seyreltmeden yoğun sunar.
5. **Uzun seansa dayanıklılık.** Saatlerce okunacak. Tipografi, kontrast ve ritim yorgunluğa göre ayarlanır; parlaklık ve doygunluk gösteriş için değil okunurluk için harcanır.

## Accessibility & Inclusion

- **WCAG 2.1 AA.** Gövde metni ≥4.5:1, büyük başlık ≥3:1. Hem açık hem koyu temada doğrulanır.
- **Tam klavye erişimi.** Tüm rotalar, filtreler, soru kartları ve import akışı klavyeyle gezilebilir. Görünür focus göstergesi; `:focus-visible` ile, outline kaldırılmaz.
- **Uzun seans konforu.** Saf beyaz (`#fff`) ve saf siyah (`#000`) zemin yasak. 300 altı font ağırlığı gövde metninde kullanılmaz. Düşük kontrastlı gri-üstüne-gri titreşimi yok.
- **`prefers-reduced-motion: reduce`** desteklenir: tüm geçiş ve animasyonlar kapanır, hiçbir işlev kaybolmaz.
- **Renk körlüğü güvenli.** Doğru/yanlış, verdict durumu ve konu ayrımı yalnızca hue ile taşınmaz; ikon, konum, etiket metni ve şekil de aynı bilgiyi verir. Yeşil/kırmızı çifti tek başına anlam taşımaz.
- **Semantik yapı.** `nav` / `main` / `aside` landmark'ları, tek `h1`, atlanmayan başlık hiyerarşisi, rota değişiminde odak yönetimi.
