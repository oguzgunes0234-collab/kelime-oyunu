# Gelir modeli (TASLAK)

Ana oyun ve temel öğrenme özellikleri (bölümler, konular, tekrar, pekiştirme,
telaffuz) **ücretsizdir** ve reklama ya da satın almaya bağlı değildir. Gelir:
reklamlar (bölüm sonu geçiş reklamı + isteğe bağlı ödüllü reklam) + tek seferlik
"Reklamsız" sürüm + küçük jeton paketleri.

**Bu sürümde gerçek reklam ve gerçek ödeme yok.** Kod `off` (web; varsayılan)
ve `mock` (yerel deneme: `VITE_ADS=mock VITE_IAP=mock`) modlarıyla çalışır.
Ayarlar: `src/monetization/config.ts`.

## 1. Mevcut ekonomi: ölçülen ve hesaplanan

Kaynak: `src/core/economy.ts`, `profile.ts`, `practice.ts`; bulmaca boyu
`newPuzzle` ile 40'ar tohumla ölçüldü (2026-10).

| Ölçü | Değer |
|---|---|
| Bulmaca başına kelime | Bölüm 1–5 (7×7): **8,2**; Bölüm 6+ (9×8): **~9,5–10** |
| Kelime başına jeton | Doğru: 2; yardımsız ve ilk denemede: +1 (en çok 3) |
| Günlük hedef (1 bulmaca) | +10 jeton ve her jokerden +1 hak (günde 4 bedava joker) |
| Pekiştirme | Cevaba bakmadan bilinen kelime başına +2 (en çok 5 kelime) |
| Başlangıç | 0 jeton; her jokerden 3 hak (12 joker) |
| **1 joker hakkı** | **5 jeton** |
| **Konu açmak** | **0 jeton — konular ücretsiz (temel öğrenme)**. Jeton gerekmiyor. |

### Bir oturumda (1 bulmaca, Bölüm 6+) kazanılan jeton — varsayım: yardımsız oranı

| Oyuncu | Bulmaca | + günlük hedef | + pekiştirme | Toplam/gün |
|---|---|---|---|---|
| Güçlü (%90 yardımsız) | ~29 | 10 | ~2 | **~41** |
| Orta (%60) | ~26 | 10 | ~6 | **~42** |
| Zorlanan (%30) | ~23 | 10 | ~8 | **~41** |

Günde 3 bulmaca oynayan için günlük hedef bir kez sayılır: ~+90–100/gün.
İsteğe bağlı ödüllü reklam: izlenen her reklam **+10**, **günlük sınır yok** (oyun sahibinin kararı, 2026-10-09). Bu, ekonomiyi daha da gevşetir: reklam izleyen oyuncu istediği kadar jeton toplayabilir, jeton paketlerine talep daha da düşer.

### Harcama ve net bakiye (günde 1 bulmaca; günlük 4 joker bedava)

| Oyuncu | Joker/bulmaca (varsayım) | Jetonla ödenen | Net/gün |
|---|---|---|---|
| Güçlü | 0–1 | 0 | **+41** |
| Orta | 2 | 0 | **+42** |
| Zorlanan | 6 | 2 × 5 = 10 | **+31** |
| Yoğun joker kullanan | 14 | 10 × 5 = 50 | **−9** |

**Sonuç (açık söylemek gerekirse):** Mevcut ekonomi çok cömert. Oyuncuların
büyük çoğunluğu jetonu hiç bitirmez; jeton paketlerine talep düşük olacaktır.
Asıl gelir büyük olasılıkla Reklamsız sürüm ve ödüllü reklamdan gelir. Kazanç
oranını düşürmek bir seçenek ama gerçek oyun verisi olmadan önerilmez (yapılacak
işler #6).

## 2. Jeton paketleri (TASLAK — fiyat ve miktar onay bekliyor)

En büyük paket 600 jeton (büyük bakiye bırakmasın). "Bonus" iddiası yok;
uygulamada indirim yüzdesi yazılmaz.

| Paket | Jeton | Joker hakkı karşılığı | Yoğun kullanıcı (−9/gün) için | Taslak fiyat (ABD tabanı) | Jeton başı |
|---|---|---|---|---|---|
| Küçük kese | 100 | 20 | ~11 gün | 1,99 $ | 1,99 ¢ |
| Orta kese | 250 | 50 | ~28 gün | 3,99 $ | 1,60 ¢ |
| Büyük kese | 600 | 120 | ~67 gün | 7,99 $ | 1,33 ¢ |

Fiyatlar oyun sahibinin isteğiyle yükseltildi (ilk kese 1,99 $). Mağazada üç kese
yan yana, özgün kese çizimleriyle (`src/ui/components/CoinPouch.tsx`) gösterilir.

- Taslak fiyatlar yalnızca bu belgededir. Uygulamada sabit fiyat yazılmaz: gerçek
  sürümde StoreKit'in yerelleştirilmiş fiyatı (ör. "₺…") gösterilir; denemede "Deneme".

### Tüketilebilir ürün riski (jetonlar)

Jeton bakiyesi yalnızca cihazdadır: uygulama silinirse, ilerleme sıfırlanırsa ya
da telefon değişirse satın alınan jeton geri gelmez; Apple tüketilebilir ürünü
"geri yükle"mez. **Bu risk için bir çözüm seçilmeden gerçek jeton satışı
açılmayacak.** Seçenekler:

1. **iCloud anahtar-değer yedeği (öneri):** Profil (jeton dahil) kullanıcının
   kendi iCloud'una (NSUbiquitousKeyValueStore) yedeklenir; aynı Apple Kimliğiyle
   yeni telefonda döner. Bizim sunucumuz yok, yeni üçüncü taraf yok. Bir Capacitor
   eklentisi ve Xcode'da iCloud yeteneği gerekir.
2. Yalnızca açık uyarı + küçük paketler (şu anki taslak: mağazada uyarı yazıyor).
3. Hesap/sunucu: önerilmez (veri toplama, KVKK yükü, bakım).

## 3. Reklam akışı (TASLAK — deneme modunda çalışıyor)

**Ödüllü video (tek ilk sürüm biçimi):**
- Yalnızca oyuncu dokununca başlar: "Reklam izle: +10 jeton". Ödül önceden yazılı.
- Nerede: **bulmaca sonuç ekranı** (bulmaca bittikten sonra) ve **Hak ve paketler**.
- Nerede ASLA: kelime çözerken, yanlış cevapta, cevap açıklanmadan önce, eğitimde.
  (Joker hakkı bitince açılan pencerede reklam teklifi YOK: o an aktif çözümdür.)
- **Günlük sınır yok:** oyuncu istediği kadar izleyebilir. Yarıda kapatılırsa ödül verilmez.
- **Reklamsız sürüm ödüllü reklamı kapatmaz:** isteyen herkes izleyebilir.
- Hiçbir şey reklama bağlı değil: ana oyun, konular, tekrar, pekiştirme, telaffuz.

**Geçiş reklamı (bölüm sonu): AÇIK** (oyun sahibinin kararı, 2026-10-09;
`INTERSTITIAL.enabled = true`). Yalnızca sonuç ekranından sonraki bölüme
geçerken; en sık 3 tamamlanan bulmacada bir ve en az 5 dakika arayla; kelime
çözerken, eğitimde, pekiştirmede ve Reklamsız kullanıcıda asla. Web sürümünde
(reklam sağlayıcısı yok) hiç çalışmaz.

**Banner: yok** (oyun ekranında kullanılmaz).

## 4. Reklamsız sürüm (non-consumable)

- Tek seferlik, kalıcı. Satın alınınca **araya giren (kullanıcının başlatmadığı) reklamlar** kapanır.
- **Ödüllü reklam kapanmaz** (oyun sahibinin kararı): her zaman isteğe bağlıdır, reklamsız kullanıcı da izleyip ödül alabilir.
- Ayarlar → **Satın alımları geri yükle** bu ürünü App Store'dan geri yükler.
- İlerlemeden ayrı saklanır (`kelime-oyunu:satinalma:v1`): "İlerlemeyi sıfırla" silmez.
- **Taslak fiyat: 9,99 $** (oyun sahibinin kararı). Not: benzer oyunlarda reklam
  kaldırma genelde 2,99–4,99 $; satış verisi gelince yeniden değerlendirilebilir.
  Uygulamada sabit fiyat yazılmaz; StoreKit'in yerel fiyatı gösterilir.
- Ürün anlamlı: bölüm sonu geçiş reklamını kaldırır.

## 5. SDK seçimi (kurulmadı; onay bekliyor)

| İhtiyaç | Seçim | Gerekçe |
|---|---|---|
| iOS kabuğu | Capacitor 8 (`@capacitor/core`, `cli`, `ios`) | Vite/React web uygulamasını değiştirmeden paketler; iOS 15+; Swift Package Manager varsayılan (CocoaPods gerekmez). |
| Kalıcı kayıt | `@capacitor/preferences` | iOS UserDefaults. Capacitor belgeleri: iOS, yer daralınca web görünümünün localStorage'ını silebilir. |
| Satın alma | `@capgo/native-purchases` (8.x) | StoreKit 2, arada sunucu yok, ücretsiz; restore var. RevenueCat alternatif ama satın alma verisini kendi sunucusuna götürür (gizlilik etiketi ağırlaşır). |
| Reklam | `@capacitor-community/admob` (8.x; Google Mobile Ads SDK 13.x) | Ödüllü reklam, iOS 15+, gizlilik manifesti var. Kişiselleştirilmemiş istek; ATT izni sorulmaz. AEA/İngiltere için Google'ın onay formu (UMP) gerekir. |

Kurulumdan önce her paketin güncel sürümü, bakım durumu ve gizlilik manifesti
yeniden kontrol edilmeli. Kaynaklar:
[capacitor-community/admob](https://github.com/capacitor-community/admob/releases),
[Cap-go/capacitor-native-purchases](https://github.com/Cap-go/capacitor-native-purchases),
[Capacitor storage rehberi](https://capacitorjs.com/docs/guides/storage),
[Google Mobile Ads SDK veri açıklaması](https://developers.google.com/admob/ios/privacy/data-disclosure).

## 6. App Store Connect ürün kimlikleri (YER TUTUCU)

`src/monetization/config.ts` → `PRODUCT_IDS`. Önerilen biçim (bundle ID belli olunca):

| Ürün | Tür | Önerilen kimlik |
|---|---|---|
| Reklamsız sürüm | Non-Consumable | `<bundle id>.noads` |
| Küçük kese | Consumable | `<bundle id>.coins.100` |
| Kese | Consumable | `<bundle id>.coins.250` |
| Büyük kese | Consumable | `<bundle id>.coins.600` |
