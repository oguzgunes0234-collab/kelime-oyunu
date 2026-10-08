# Mac / Xcode yönergesi (oyun sahibi için)

Bu adımlar **senin Mac'inde** yapılır; bu depoda hiçbiri çalıştırılmadı ya da
denenmedi. Paket kurulumu (2. adım) internetten indirme yapar; onaylamadan başlama.
TestFlight'a yükleme ve App Store'a gönderme ayrı onay gerektirir (son adımlar).

## 0. Hazırlık

- macOS'un güncel sürümü ve App Store'dan **Xcode** (Capacitor 8 için güncel Xcode gerekir; sürüm şartını Capacitor belgesinden kontrol et).
- **Node.js** (LTS) ve git.
- Apple Developer Program üyeliği ve App Store Connect'te uygulama kaydı (bkz. `docs/BENDEN-BEKLENENLER.md`).

## 1. Depoyu al

```bash
git clone https://github.com/oguzgunes0234-collab/kelime-oyunu.git
cd kelime-oyunu
npm ci
npm test
```

## 2. Capacitor'ı ekle (ONAYDAN SONRA — paket indirir)

```bash
npm install @capacitor/core @capacitor/ios @capacitor/preferences
npm install -D @capacitor/cli
npx cap init "Kelime Köprüsü" "<BUNDLE ID, ör. com.ornek.kelimekoprusu>" --web-dir dist
```

`capacitor.config.ts` içinde `webDir: 'dist'` olduğunu kontrol et. Bundle ID'yi
App Store Connect'teki kayıtla **aynı** yaz.

## 3. Web kısmını derle ve iOS projesini oluştur

```bash
npm run build          # dist/ üretir (gerçek reklam/ödeme yok: varsayılan "off")
npx cap add ios
npx cap sync ios
npx cap open ios       # Xcode açılır
```

Deneme pencereleri (gerçek ödeme yok) ile denemek istersen:
`VITE_ADS=mock VITE_IAP=mock npm run build` → `npx cap sync ios`.

## 4. Xcode'da

- **Signing & Capabilities:** Team = kendi geliştirici hesabın; Bundle Identifier = App Store Connect'teki.
- **Deployment target:** iOS 15.0 (Capacitor 8'in alt sınırı).
- **Display Name:** Kelime Köprüsü. **Yön:** yalnızca dikey (Portrait).
- **Cihaz:** yalnızca iPhone (iPad'i kapatmak istersen Targeted Device Families = iPhone).
- **Uygulama ikonu:** 1024×1024 PNG, saydamlık yok (`public/icon-512.png` yeterli değil; kesinleşmiş ikonu ver).
- **Info.plist:** `ITSAppUsesNonExemptEncryption` = NO.
- **PrivacyInfo.xcprivacy:** `docs/app-privacy-envanteri.md` bölüm D'ye göre.

## 5. Simülatör ve gerçek cihazda kontrol listesi

Her maddeyi işaretle; çalışmayanı bana yaz (ekran görüntüsüyle):

- [ ] Açılış ekranı → ana sayfa; çentik/Dynamic Island altında yazı kalmıyor.
- [ ] Bulmaca: klavye, ızgara ve araçlar ekrana sığıyor; alt çubuk (home indicator) düğmeleri örtmüyor.
- [ ] Bir bulmacayı bitir → sonuç ekranı kaymadan sığıyor.
- [ ] Uygulamayı arka plana al, 1 dk sonra aç → yarım bulmaca yerinde.
- [ ] Uygulamayı tamamen kapat (kaydırarak), yeniden aç → ilerleme, jeton yerinde.
- [ ] Uçak modunda aç ve oyna → çalışıyor.
- [ ] Ayarlar → Yasal → her belge açılıyor, "Kapat" dönüyor.
- [ ] Telaffuz düğmesi ses veriyor (sessiz mod kapalıyken).
- [ ] Eski kayıt taşıma: Safari'deki web sürümünün kaydı uygulamaya **otomatik geçmez** (ayrı depolar); bu beklenen bir durum.

## 6. Satın alma denemesi (StoreKit) — gerçek sağlayıcı eklendikten sonra

- Xcode → File → New → File → **StoreKit Configuration File** ile ürünleri yerel tanımla
  (kimlikler `docs/gelir-modeli.md` §6). Scheme → Run → Options → StoreKit Configuration.
  Bu, App Store Connect olmadan yerel deneme sağlar; gerçek para alınmaz.
- Sonra App Store Connect'te **Sandbox test kullanıcısı** ile gerçek cihazda dene.

## 7. TestFlight ve gönderim (AYRI ONAY GEREKİR)

Product → Archive → Distribute App → App Store Connect. **Bunu, oyun sahibinin
açık onayı olmadan yapma.**
