# Design

Görsel sistem: **Dosya** (case file). Tek dosyalık `index.html`, harici bağımlılık yok, sistem fontları.

## Visual Theme

Sıcak kum kâğıt üzerinde koyu nar mürekkep. Bir dava dosyası ya da düzeltilmiş bir tez gibi: iddia, karşı-iddia, kaynak. Yapı kartlardan değil **kılcal çizgilerden ve defter satırlarından** gelir. Gölge yok, gradient yok, cam yok.

Merkezî karar: **yanlış olmak renk taşımaz.** Kırmızı bir ceza paleti kurulmaz. "Senin cevabın" çökertilmiş nötr bir panelde, `✕` glifi ve açık etiketle işaretlenir. Kroma bütçesinin tamamı tek bir eksene harcanır: *resmî kaynak ne diyor* (`verdict`). Bu hem PRODUCT.md Principle 1'i ("yanlış malzemedir, ceza değil") hem de renk körlüğü güvenliğini yapısal olarak sağlar.

Varsayılan tema **açık-sıcak**. Gerekçe: baskın etkinlik saatlerce Türkçe düzyazı okumak; koyu zeminde uzun paragraf halation yorgunluğu yaratır. Koyu tema sıcak köz-kahve tonunda mevcut ve tam eşdeğer.

## Color Palette

Renk stratejisi: **Committed.** Nar (garnet) ürünün rengidir: kenar çubuğu işaretleri, aktif durum, bağlantılar, focus halkası, yol haritası omurgası, `conflict` dolgusu. Diğer iki kroma (çam, toprak) yalnızca semantik durum taşır ve nar ile yarışmaz.

Tüm değerler OKLCH. Saf `#fff` / `#000` yok; her nötr 55–80° hue'ya doğru sıcak eğimli.

### Açık (varsayılan)

| Token | OKLCH | Rol |
|---|---|---|
| `--surface` | `oklch(.968 .008 75)` | sayfa zemini, kum |
| `--surface-sunk` | `oklch(.942 .010 72)` | çökertilmiş panel: "senin cevabın", kod, yapıştırma alanı |
| `--surface-raise` | `oklch(.991 .004 80)` | nadir yükseltme: input, aktif rail öğesi |
| `--ink` | `oklch(.24 .016 45)` | gövde metni · 10.5:1 |
| `--ink-2` | `oklch(.46 .014 50)` | ikincil metin, mikro etiket · 4.6:1 |
| `--ink-3` | `oklch(.56 .012 55)` | yalnızca dekoratif glif / placeholder, metin değil |
| `--rule` | `oklch(.885 .010 70)` | kılcal çizgi |
| `--rule-2` | `oklch(.820 .012 68)` | güçlü ayrım |
| `--garnet` | `oklch(.44 .14 25)` | marka + etkileşim · 5.0:1 |
| `--garnet-deep` | `oklch(.36 .13 25)` | hover / basılı |
| `--garnet-wash` | `oklch(.935 .028 30)` | çok hafif zemin |
| `--pine` | `oklch(.44 .09 155)` | doğrulanmış / doğru cevap · 5.0:1 |
| `--pine-wash` | `oklch(.948 .026 160)` | |
| `--ochre` | `oklch(.45 .10 72)` | dikkat: dated / unverified · 4.8:1 |
| `--ochre-wash` | `oklch(.950 .030 80)` | |

### Koyu

| Token | OKLCH |
|---|---|
| `--surface` | `oklch(.205 .012 55)` |
| `--surface-sunk` | `oklch(.172 .010 55)` |
| `--surface-raise` | `oklch(.248 .013 55)` |
| `--ink` | `oklch(.93 .008 78)` · 10.9:1 |
| `--ink-2` | `oklch(.74 .010 70)` · 6.2:1 |
| `--ink-3` | `oklch(.55 .010 60)` |
| `--rule` | `oklch(.302 .012 55)` |
| `--rule-2` | `oklch(.385 .014 55)` |
| `--garnet` | `oklch(.66 .14 28)` · 4.9:1 |
| `--garnet-deep` | `oklch(.74 .13 30)` |
| `--garnet-wash` | `oklch(.265 .035 28)` |
| `--pine` | `oklch(.68 .11 158)` · 5.2:1 |
| `--pine-wash` | `oklch(.245 .030 158)` |
| `--ochre` | `oklch(.75 .11 75)` · 6.4:1 |
| `--ochre-wash` | `oklch(.262 .032 75)` |

Kroma, lightness uçlara giderken düşürülür. Wash tonları 0.026–0.035 kroma bandında tutulur ki metin kontrastını bozmasın.

## Typography

Harici font yok. İki yığın:

```css
--sans: -apple-system, BlinkMacSystemFont, "Segoe UI Variable Text", "Segoe UI",
        system-ui, Roboto, "Helvetica Neue", Arial, sans-serif;
--mono: ui-monospace, "SF Mono", SFMono-Regular, "Cascadia Mono",
        "JetBrains Mono", Menlo, Consolas, monospace;
```

Serif yok — "editöryal çalışma defteri" ikinci-derece refleksinden kaçınmak için. Karakter renkten, ağırlık kontrastından ve ritimden gelir.

Ölçek (oran ≈1.30, düz değil):

| Rol | Boyut | Ağırlık | Tracking | Line-height |
|---|---|---|---|---|
| Brifing display | `clamp(2rem, 1.5rem + 1.9vw, 2.85rem)` | 800 | `-.035em` | 1.06 |
| Sayfa başlığı | `1.95rem` | 750 | `-.026em` | 1.14 |
| Bölüm (h3) | `1.32rem` | 700 | `-.014em` | 1.3 |
| Alt başlık (h4) | `1.02rem` | 700 | `-.005em` | 1.4 |
| Gövde | `1rem` / 16px | 400 | `0` | **1.72** |
| Küçük | `.865rem` | 400 | `0` | 1.6 |
| Mikro etiket | `.715rem` | 700 | `.1em` UPPERCASE | 1.3 |
| Veri / ID | `.8rem` mono | 600 | `.02em` | 1.4 |

Kurallar: gövde ≥16px (uzun seans), ağırlık <400 hiç kullanılmaz, okuma sütunu `max-width: 68ch`, mono yalnızca tanımlayıcı ve kod için (dekoratif mono yasak — terminal lanesi seçilmedi).

## Spacing & Layout

Ölçek: `4 · 8 · 12 · 16 · 24 · 32 · 48 · 72 · 112` px. Ritim **değişken**: bölüm başlığı öncesi 48–72, veri satırı içi 12–16. Her yerde aynı padding yok.

- Rail (sol gezinme): `264px`, sticky, tam yükseklik.
- İçerik sarmalayıcı: `max-width 1120px`.
- Okuma sütunu: `68ch`.
- TOC: `220px`, sticky `top: 88px`.
- Radius: `3px` (chip, input, küçük), `6px` (panel, blok). Her şey 10px yuvarlak değil — dosya hissi için daha keskin.
- Kenarlık: hep `1px`. **Yan-şerit kenarlık (border-left/right accent) yasak.**

Kart kullanımı minimum. Liste = kılcal çizgiyle ayrılmış tam genişlik satırlar (defter). Kart yalnızca gerçekten ayrık bir nesne için (sınav özeti, not).

## Components

- **Ledger row** (yanlış satırı): kutu yok, alt kılcal çizgi var. Sol tarafta mono ID. Hover/focus: `--surface-sunk` zemin + solda 3px dolu nar kare glifi (kenarlık değil, glif).
- **Verdict chip**: tek yer, güçlü kroma. `conflict` = dolu nar zemin + kum metin. `ok`/`authoritative` = çam kılcal + nokta. `dated`/`unverified` = toprak kılcal + nokta. Her biri glif + metin taşır; renk tek başına anlam taşımaz.
- **Answer blocks**: `senin cevabın` = `--surface-sunk`, `--ink-2`, `✕` glifi, kroma yok. `doğru cevap` = üstte çam kılcal kural + çam mikro etiket + `✓`, gövde `--ink`.
- **Topic monogram**: `PE · MCP · CC · AG · CTX` — mono, kılcal kenarlıklı kare. Emoji ikon yok, hue-kodlu etiket yok.
- **Callout**: tam kılcal kutu + renkli mikro etiket + isteğe bağlı wash zemin. Yan şerit yok.
- **Data strip** (dashboard): stat tile ızgarası yerine dikey kılcal çizgilerle bölünmüş tek satır.
- **Roadmap spine**: 2px nar dikey çizgi, adım noktaları içi dolu/boş.
- **Flow box** ("aklında kalsın"): `--surface-sunk` zemin, kesikli kenar yok, mono düğümler + `→` ayraçlar.

## Motion

Süre `160–220ms`, easing `cubic-bezier(.16, 1, .3, 1)`. Yalnızca `opacity`, `transform`, `background-color`, `border-color`, `color`. Layout özelliği animasyonu yok. Bounce / elastic yok.

`@media (prefers-reduced-motion: reduce)` → tüm `transition` ve `animation` `.01ms`, hiçbir işlev kaybolmaz.

## Iconography

Unicode glif, tek renk, metin akışında. `✓ ✕ ↗ → ▸ ◆ ⚠ ◷ ★`. Emoji renk paleti kullanılmaz. Her glifin yanında her zaman metin etiketi vardır.

## Accessibility

- Yukarıdaki tüm metin token'ları hem açık hem koyu temada AA (≥4.5:1) doğrulandı; oranlar tabloda.
- `:focus-visible` → `outline: 2px solid var(--garnet); outline-offset: 2px`. Outline hiçbir yerde kaldırılmaz.
- Etkileşimli her öğe gerçek `<a>` veya `<button>`; `div onclick` yok.
- `nav` / `main` / `aside` landmark'ları, tek `h1`, `aria-current="page"`, rota değişiminde `main`'e odak.
- `document.documentElement.lang = "tr"`.
- Durum bilgisi hiçbir zaman yalnızca hue ile taşınmaz: glif + metin + konum eşlik eder.
- Gövde 16px, ağırlık ≥400, saf beyaz/siyah zemin yok.
