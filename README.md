# Kelime Köprüsü

Türkçe ↔ İngilizce kelime öğrenmek için mobil öncelikli bir harf taşı bulmacası.
Oyuncuya bir kelime gösterilir; karşılığını karışık harf taşlarına dokunarak kurar.
Her turdan sonra anlam, kelime türü, örnek cümle ve yaklaşık seviye gösterilir.

Bu klasör depodaki hisse takip uygulamasından **tamamen bağımsızdır**: kendi
`package.json`'ı vardır, `frontend/` ya da `backend/` ile kod paylaşmaz. Kök
`.dockerignore` yalnızca `backend/`'i imaja aldığından Fly.io dağıtımına da girmez.

## Çalıştırma

```bash
cd kelime-oyunu
npm install
npm run dev        # http://localhost:5174 (telefondan aynı ağdaki IP ile de açılır)
npm test           # oyun mantığı birim testleri (Vitest)
npm run build      # dist/ klasörüne üretim çıktısı + service worker
npm run preview    # derlenmiş sürümü http://localhost:4174 adresinde sun
```

Derlenmiş `dist/` klasörü herhangi bir statik barındırmaya (alt klasör dahil)
konabilir; yollar görelidir. Service worker yalnızca derlenmiş sürümde üretilir;
ilk açılıştan sonra oyun çevrimdışı da açılır. PWA olarak ana ekrana eklenebilir
(iOS'ta Safari → Paylaş → Ana Ekrana Ekle).

## Özellikler

- **İki yön:** Türkçe → İngilizce ve İngilizce → Türkçe.
- **Seviyeler:** Kolay (≈ A1–A2), Orta (≈ A2–B1), Zor (≈ B1–B2). Zorlaştıkça
  taşlara şaşırtmaca harfler eklenir.
- **Uyarlamalı mod:** Son 6 turun ortalamasına bakar; seviye en az 5 tur
  oynanmadan değişmez. Ortalama ≥ 0,8 ise yükselir, ≤ 0,4 ise düşer.
- **Dört araç** (alt çubuk, kalan hak rozetle): Karıştır, Mıknatıs, İpucu,
  Geri al. Her aracın ne yaptığı ve bedeli `?` düğmesinde yazar. Hak bitince
  oyun durmaz; bilgi penceresi jetonla hak almayı ya da araçsız devam etmeyi
  önerir. Paket ekranı yalnızca oyuncu açıkça isterse açılır.
- **Ücretsiz eylemler:** Temizle ve Pas geç her zaman ücretsizdir. Tam bir
  yanlış cevap 3 deneme hakkından birini harcar.
- **Tur sonu:** doğru cevap, diğer kabul edilen karşılıklar, anlam, tür,
  seviye, iki dilde örnek cümle, puan dökümü.
- **Tekrar listesi:** yanlış, pas geçilen ya da yardımla (Mıknatıs/İpucu)
  çözülen kelimeler eklenir; yardımsız ilk denemede doğru bilinince çıkar.
- **Günlük hedef ve seri:** yalnızca doğru cevaplar sayılır, yanlışlar hiçbir
  şey eksiltmez. Haftada bir kaçırılan gün otomatik "dinlenme günü" sayılır.
  Seri biterse puan/jeton/hak kaybı olmaz.
- **İlk açılışta örnek tur:** gerçek kontrollerle bir kelime çözdürür;
  eğitimde hak harcanmaz, ilerleme kaydedilmez. Ayarlar'dan yeniden oynanabilir.
- **Kayıt:** hesap yok; tüm ilerleme `localStorage`'da
  (`kelime-oyunu:profil:v1`). Depolama kapalıysa oyun yine çalışır.
- **Erişilebilirlik:** klavye (harf yaz, ⌫ Geri al, Esc Temizle, Enter
  Devam), görünür odak halkası, düğmelerde açıklayıcı etiketler, `aria-live`
  geri bildirim, koyu tema, `prefers-reduced-motion` desteği.

## Yapı

```
kelime-oyunu/
├── src/
│   ├── core/            # Arayüzden bağımsız, saf TypeScript oyun mantığı
│   │   ├── types.ts       veri modeli (Entry, Term, Question…)
│   │   ├── languages.ts   dil tanımları (yerel ayar, alfabe)
│   │   ├── normalize.ts   cevap normalleştirme ve karşılaştırma
│   │   ├── pack.ts        paket doğrulama, soru üretimi, zorluk ↔ CEFR
│   │   ├── tiles.ts       harf taşları ve şaşırtmaca harfler
│   │   ├── round.ts       tek turun durumu ve araçlar (saf reducer)
│   │   ├── scoring.ts     puanlama
│   │   ├── economy.ts     haklar, jetonlar, bedeller (tüm denge sayıları)
│   │   ├── adaptive.ts    uyarlamalı zorluk
│   │   ├── daily.ts       günlük hedef ve seri
│   │   ├── profile.ts     oyuncu verisi, tur sonucunu işleme, tekrar listesi
│   │   ├── select.ts      sıradaki kelimeyi seçme, havuz tükenmesi
│   │   ├── session.ts     10 kelimelik oturum akışı
│   │   └── storage.ts     localStorage okuma/yazma
│   ├── data/
│   │   ├── pack-tr-en.json   düzenlenebilir kelime paketi
│   │   └── packs.ts          paket yükleme (geliştirmede doğrulama uyarısı)
│   ├── ui/               # React bileşenleri (ekranlar, araç çubuğu, iletişim kutuları)
│   ├── styles.css
│   └── main.tsx
├── tests/               # Vitest birim testleri
├── public/              # manifest, ikonlar
└── vite.config.ts       # service worker'ı derleme sırasında üreten küçük eklenti
```

## Kelime verisi

`src/data/pack-tr-en.json` elle seçilmiş **138 kelimelik** bir başlangıç
paketidir (A1: 58, A2: 33, B1: 27, B2: 20). Kapsamlı ya da doğrulanmış bir
sözlük değildir; seviyeler yaklaşık CEFR tahminidir.

Paket **kavram tabanlıdır**: her girdi bir anlamdır ve her dildeki karşılığı
`terms` altında durur. Aynı girdi iki yönde de soru üretir; kaynak dil, hedef
dil, ana cevap ve kabul edilen alternatifler oyun sırasında seçilen yöne göre
türetilir (`toQuestion`).

```jsonc
{
  "id": "ruzgar",
  "pos": "noun",              // noun | verb | adjective | adverb
  "level": "A2",              // A1 | A2 | B1 | B2 (yaklaşık)
  "topic": "hava",            // konu etiketi
  "terms": {
    "tr": {
      "text": "rüzgâr",                 // ana cevap: tek kelime, yalnızca harf, ≤ 10 harf
      "alternatives": ["rüzgar"],       // kabul edilen diğer yazımlar/karşılıklar
      "context": "…",                   // (isteğe bağlı) soru bu dilde sorulurken anlamı netleştirir
      "example": "Rüzgâr çok sert esiyor."
    },
    "en": { "text": "wind", "example": "The wind is blowing very hard." }
  },
  "hint": { "tr": "Havanın hareket etmesiyle oluşan akım." }  // arayüz dilinde, cevabı içermez
}
```

Kurallar `validatePack` ile ve `tests/pack.test.ts` tarafından denetlenir
(yinelenen id, taşla kurulamayan ana cevap, 10 harfi aşan cevap, cevabı
açık eden ipucu).

**Yeni dil eklemek:** `core/languages.ts` içine dili (yerel ayar + alfabe)
ekle, paketteki girdilere `terms.<kod>` ekle ya da yeni bir paket dosyası
oluştur, `languages` listesine kodu yaz. Oyun mantığında dil sabiti yoktur.

## Cevap değerlendirme

`core/normalize.ts`: Unicode NFC, baş/son boşluk silme, iç boşlukları teke
indirme ve **dile duyarlı** küçük harf (Türkçede `İ→i`, `I→ı`). Aksanlar
bilerek silinmez: `şişe` ≠ `sise`, `ölü` ≠ `olu`. Yazım varyantları
(`rüzgâr`/`rüzgar`, `colour`/`color`, `criticise`/`criticize`) veride
alternatif olarak açıkça tanımlanır.

Harf taşları ana cevaptan üretilir; taşlarla kurulabilen bir alternatif de
kabul edilir. Farklı uzunluktaki alternatifler tur sonunda "Diğer kabul
edilen karşılıklar" olarak öğretilir. Çok anlamlı kelimelerde (ör. *ay*,
*pazar*, *patient*) soru kartında kısa bir bağlam notu gösterilir.

## Ekonomi ve gelir modeli

Tüm sayılar `core/economy.ts` içindedir.

| Araç | Ne yapar | Bedel |
|---|---|---|
| Karıştır | Boştaki taşların sırasını değiştirir | 1 hak, puan kesmez |
| Mıknatıs | Sıradaki doğru harfi yerleştirir, hatalıları geri alır | 1 hak, −4 puan |
| İpucu | Önce anlam ipucu, sonra sıradaki harf | 1 hak, anlam −2 / harf −3 puan |
| Geri al | Son harfi geri gönderir | 1 hak, puan kesmez |

Başlangıç hakları: 5 / 3 / 3 / 8. İşe yaramayacak bir kullanımda (ör. boş
cevapta Geri al) hak harcanmaz. Jeton yalnızca oynayarak kazanılır: doğru
cevap +2, yardımsız ilk denemede +1, günlük hedefte +10 ve her araçtan hediye
hak. 5 jeton = 1 hak.

**Mock olanlar:**

- *Hak ve paketler → Paketler* bölümü yalnızca **tasarım prototipidir**.
  Fiyatlar örnektir; "İncele" penceresi satın almanın devre dışı olduğunu
  söyler. Ödeme alınmaz, hesaba hiçbir şey eklenmez.
- Gerçek ödeme, reklam SDK'sı, giriş sistemi, backend veya uzak sözlük API'si
  **yoktur**.

Bilerek eklenmeyenler: sahte indirim sayacı, zaman baskısı, rastgele ücretli
ödül kutusu, yanlış dokunmayla satın alma, "devam etmek için öde" akışı.
Temel oyun satın alma olmadan tamamen oynanabilir.

İleride değerlendirilebilecekler: oyuncunun kendisi seçerse ödüllü reklam
karşılığı hak, içeriği ve fiyatı açık paketler, isteğe bağlı görsel temalar.
Gerçek dijital içerik satışı App Store / Google Play kurallarına uygun
(platform içi satın alma) biçimde ele alınmalıdır.
