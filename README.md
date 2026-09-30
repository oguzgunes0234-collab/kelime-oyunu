# Kelime Köprüsü

Türkçe ↔ İngilizce kelime öğreten, **yalnızca telefon için** tasarlanmış bir
çengel bulmaca oyunu.

- **Ana oyun — çengel bulmaca:** Izgaranın içindeki pembe kutular ipucudur
  (kaynak dilde bir kelime); oku, cevabın hangi kareden başlayıp hangi yöne
  yazılacağını gösterir. Cevaplar hedef dildedir ve birbirini keser.
- **İkinci mod — hızlı kelime turu:** 10 kelime; karşılığı karışık harf
  taşlarına dokunarak kurulur.

Her iki modda da jeton, günlük hedef, seri, tekrar listesi ve uyarlamalı
zorluk ortaktır. Her kelimeden sonra (bulmacada bulmaca sonunda) anlam, tür,
örnek cümle ve yaklaşık seviye gösterilir.

## Çengel bulmaca

- **Üretici (`core/crossword.ts`):** Kelime paketinden 9 satır × 8 sütunluk
  ızgaraya birbirini kesen ~9–12 kelime yerleştirir (ölçülen ortalama ~11).
  Her bulmaca yenidir; üretim ~15 ms sürer. Kural: yatay ya da dikey, iki ve
  daha uzun her harf dizisi tam olarak bir cevaptır. Oklar: sağa, aşağı,
  alttan sağa (↳), yandan aşağı (↴). Karede tek ipucu olur; iki ipucu telefonda
  okunmayacak kadar küçülüyordu.
- **Kelime seçimi:** önce tekrar listesindekiler, sonra aralıklı tekrarda
  günü gelen bilinen kelimeler, sonra henüz bilinmeyenler, sonra günü gelmemiş
  bilinenler; ızgarayı doldurmak için en son seviye dışı kelimeler.
- **Aralıklı tekrar (`core/srs.ts`):** her kelime bir Leitner kutusundadır
  (1, 3, 7, 21, 60 gün). Yardımsız ve hatasız bilinen kelime bir kutu yükselir,
  yardımla bilinen kutusunda kalır, bilinemeyen 1. kutuya döner; ikisi de
  ertesi gün yine gelir.
- **İpucu türleri (`core/clues.ts`):** yeni kelime her zaman çeviriyle gelir.
  Daha önce görülen kelime mümkünse *Cümle* (hedef dildeki örnek cümle, cevap
  yerine `___`) ya da *Tanım* (Türkçe tanım; yalnızca Türkçe → İngilizce)
  ipucuyla gelir. Karede yalnızca tür adı yazar, metin üstteki çubukta okunur;
  ızgara bir bakışta okunabilsin diye bulmaca başına en fazla 3 böyle ipucu
  olur (`MAX_CONTEXT_CLUES`).
- **Oynanış (`core/puzzle.ts`, saf işlevler):** kareye ya da ipucuna dokun,
  ekran klavyesiyle yaz (Türkçe yönünde Türkçe Q düzeni). Kelime dolunca
  denetlenir: doğruysa yeşile döner ve kilitlenir, yanlışsa sarsılır (hata
  sayılır, hiçbir şey eksilmez). Kesişen kareye tekrar dokunmak yön değiştirir.
- **Araçlar:** *Anlam* (İpucu hakkı, −2 puan) seçili kelimenin anlamını
  gösterir; *Harf aç* (Mıknatıs hakkı, −4 puan) seçili kareyi açar. Harf aç ile
  tamamlanan kelime hata sayılmaz ama yardımlı sayılır.
- **Bitiş:** tüm kelimeler çözülünce ya da oyuncu "Bitir" deyince; çözülmeyen
  ve yardımla çözülen kelimeler tekrar listesine eklenir.
- **Yarım bulmaca** `localStorage`'da (`kelime-oyunu:bulmaca:v1`) saklanır;
  sayfa kapansa da kaldığı yerden devam eder.
- **Telefon düzeni:** ekran tam telefon yüksekliğindedir; ızgara kalan boşluğa
  göre (container query) ölçeklenir, böylece 320×568'den büyük her ekranda
  ipucu çubuğu, ızgara, araçlar ve klavye birlikte görünür. Android'de doğru,
  yanlış ve bitişte kısa titreşim olur (iPhone Safari desteklemez).

## Çalıştırma

```bash
npm install
npm run dev        # http://localhost:5174 (telefondan aynı ağdaki IP ile de açılır)
npm test           # oyun mantığı birim testleri (Vitest)
npm run build      # dist/ klasörüne üretim çıktısı + service worker
npm run preview    # derlenmiş sürümü http://localhost:4174 adresinde sun
```

**Windows'ta telefonda açmak için:** `TELEFONDA-AC.bat` dosyasına çift tıkla.
Paketleri kurar, derler, Tailscale varsa oyunu `https://<makine>.<tailnet>.ts.net:8443`
adresinden açar (hisse uygulamasının Tailscale adresine dokunmaz) ve telefonda
açılacak adresleri yazar. Kapatmak için pencerede Ctrl+C; Tailscale
yönlendirmesini kaldırmak için `tailscale serve --https=8443 off`.

Derlenmiş `dist/` klasörü herhangi bir statik barındırmaya (alt klasör dahil)
konabilir; yollar görelidir. Service worker yalnızca derlenmiş sürümde üretilir;
ilk açılıştan sonra oyun çevrimdışı da açılır. PWA olarak ana ekrana eklenebilir
(iOS'ta Safari → Paylaş → Ana Ekrana Ekle).

## Özellikler

- **İki yön:** Türkçe → İngilizce ve İngilizce → Türkçe.
- **Seviyeler:** Kolay (≈ A1–A2), Orta (≈ A2–B1), Zor (≈ B1–B2). Zorlaştıkça
  taşlara şaşırtmaca harfler eklenir.
- **Uyarlamalı mod:** Ortalama ≥ 0,8 ise seviye bir kademe yükselir, ≤ 0,4
  ise bir kademe düşer; tek seferde asla iki kademe değişmez. Hızlı turda
  birim kelimedir (son 6 tur, en az 5 tur). Bulmacada birim biten bulmacadır
  (son 3 bulmaca, en az 2 bulmaca); bulmacanın başarısı kelimelerin
  kalitelerinin ortalamasıdır (yardım ve yanlış deneme düşürür, çözülmeyen 0).
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
- **Günlük hedef ve seri:** hedef günde bir bulmacayı tamamlamaktır (tüm
  kelimeleri çöz; Anlam ve Harf aç serbest). Erken "Bitir" hedefi tamamlamaz;
  hızlı tur hedefe sayılmaz. Doğru kelimeler yalnızca istatistik olarak
  sayılır. Yanlışlar hiçbir şey eksiltmez. Haftada bir kaçırılan gün otomatik
  "dinlenme günü" sayılır. Seri biterse puan/jeton/hak kaybı olmaz.
- **Bulmaca eğitimi (T1–T5, `core/tutorial.ts`):** "Bulmaca çöz" ilk kez
  açılınca mevcut paketten elle yazılmış beş küçük bulmaca (1×4 … 5×7) gelir;
  her biri tek beceri öğretir: ipucu ve ok · ortak kare · ortak karede yön
  değiştirme · kırık oklar (↳ ↴) · Anlam ve Harf aç. Açıklamalar tek cümle,
  gerektiği anda çıkar, "Anladım" ile ya da öğrettiği şey yapılınca kapanır;
  ilk yanlış kelimede düzeltme anlatılır. "Eğitimi atla" her adımda var.
  Eğitim profili değiştirmez (jeton, hedef, tekrar listesi), araçlar
  ücretsizdir ve yarım kalmış normal bulmacanın üzerine yazmaz. Adım,
  bitince kaydedilir. Yarım bulmacası olan oyuncuda önce o sürer; eğitim
  "?" → "Eğitimi baştan oynat" ya da Ayarlar'dan açılır.
- **Hızlı tur örneği:** gerçek kontrollerle bir kelime çözdürür; hak
  harcanmaz, ilerleme kaydedilmez. Ayarlar'dan yeniden oynanabilir.
- **Bölümler (`core/campaign.ts`):** 5 bulmaca = 1 bölüm; yalnızca tüm
  kelimeleri çözülen ana oyun bulmacası sayılır. Bölüm yalnızca ızgara boyunu
  belirler (Bölüm 1: 7×7, sonrası 9×8); kelime seviyesini uyarlamalı zorluk
  belirler ve oyuncuya seçtirilmez. Ana sayfada bölüm yolu (biten ✓, sıradaki
  vurgulu, kilitli kesik çizgi), sonuç ekranında küçük yol, bölüm bitince
  "Bölüm N tamamlandı" ekranı (yeni ödül ya da para birimi yok). Eski kayıtlar
  Bölüm 1'den başlar (tamamlanan bulmaca sayısı eskiden tutulmuyordu); diğer
  veriler korunur, elle seçilmiş seviye uyarlamalı seviyeye aktarılır.
- **Konu modları (`core/topics.ts`):** Sağlık, Teknoloji, Hukuk, Seyahat ve
  şehir. Bir mod en az 60 gözden geçirilmiş (`reviewed: true`) kelimeyle
  açılır; şu an hiçbiri açık değil ve "Hazırlanıyor" olarak görünür. Konu
  bulmacası bölümü ve zorluğu değiştirmez, günlük hedefe sayılır.
- **Açılış ekranı:** `index.html` içinde; KELİME/KÖPRÜ mini çengel bulmaca
  logosu, yükleme çubuğu yok, ~0,7 sn sonra kaybolur.
- **Hızlı turda harf geri alma:** cevaptaki bir harfe dokunmak onu taşlara
  geri gönderir (ücretsiz); diğer harfler kaymaz, denetim yalnızca tüm kareler
  dolunca yapılır.
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
│   │   ├── crossword.ts   çengel bulmaca üretici ve kural denetimi
│   │   ├── clues.ts       ipucu türleri (çeviri / cümle / tanım)
│   │   ├── srs.ts         aralıklı tekrar kutuları
│   │   ├── puzzle.ts      bulmacanın durumu, yazma/silme/araçlar, sonuçların profile işlenmesi
│   │   ├── round.ts       hızlı turun durumu ve araçlar (saf reducer)
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
