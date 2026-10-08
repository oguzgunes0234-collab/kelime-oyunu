# App Store "App Privacy" formu için veri envanteri (TASLAK)

Koda dayalı. Son kontrol: 2026-10, `main` + gelir modeli hazırlığı.
App Store Connect'teki form oyun sahibi tarafından doldurulur; bu belge yalnızca girdi.

## A. Uygulamanın kendi kodu

Kod taraması: `fetch`, `XMLHttpRequest`, `sendBeacon`, `WebSocket` **yok**. Hesap,
analiz, çökme raporu **yok**. Sunucu **yok**.

| Veri | Nerede | Dışarı gider mi |
|---|---|---|
| İlerleme (bölüm, puan, seri, tekrar listesi, öğrenilenler), yarım bulmaca | Cihaz (localStorage; iPhone'da ayrıca UserDefaults yedeği) | Hayır |
| Jeton, joker hakları, ayarlar | Cihaz | Hayır |
| Reklamsız hakkı, günlük ödül sayacı | Cihaz | Hayır |
| Telaffuz metni | Cihazın konuşma motoru (iOS'ta cihaz üzerinde) | iOS'ta hayır |
| Profil yedeği (ilerleme, jetonlar) | Kullanıcının kendi iCloud'u (NSUbiquitousKeyValueStore) | Apple'a, kullanıcının hesabına; geliştirici erişemez |

**Apple'ın tanımına göre (yalnızca cihazda kalan veri "toplanmış" sayılmaz):**
reklam eklenmezse cevap **"Data Not Collected"** olur. iCloud anahtar-değer yedeği
yalnızca kullanıcının kendi hesabında durur ve geliştiriciye/üçüncü tarafa
erişilebilir değildir; bu yüzden "toplanmış" sayılmadığı değerlendirilir —
**App Store Connect'teki güncel tanımla doğrulanmalı.**

## B. StoreKit (uygulama içi satın alma)

Satın alma Apple'da işlenir; cihaza yalnızca işlem sonucu gelir; biz bir sunucuya
göndermiyoruz. Bu durumda "Purchases" için geliştiricinin bir şey toplamadığı
değerlendirilir — **App Store Connect formundaki güncel açıklamayla doğrulanmalı.**

## C. Google AdMob (yalnızca reklam etkinleşirse)

Google'ın beyanına göre SDK şunları toplayabilir
([kaynak](https://developers.google.com/admob/ios/privacy/data-disclosure)):
IP adresi (yaklaşık konum), çökme günlükleri, performans verisi, cihaz kimliği,
reklam verisi, ürün etkileşimi.

Formda karşılık gelebilecek Apple kategorileri (TASLAK — Google'ın güncel
rehberi ve kullanılan SDK sürümünün gizlilik manifestiyle doğrulanmalı):

| Apple kategorisi | Veri türü | Amaç | Kullanıcıya bağlı? | Takip? |
|---|---|---|---|---|
| Location | Coarse Location (IP'den) | Third-Party Advertising | [DOĞRULANACAK] | [DOĞRULANACAK] |
| Identifiers | Device ID | Third-Party Advertising | [DOĞRULANACAK] | ATT sorulmadığı için IDFA yok; [DOĞRULANACAK] |
| Usage Data | Product Interaction, Advertising Data | Third-Party Advertising, Analytics | [DOĞRULANACAK] | [DOĞRULANACAK] |
| Diagnostics | Crash Data, Performance Data | App Functionality | [DOĞRULANACAK] | Hayır |

## D. Gizlilik manifesti (PrivacyInfo.xcprivacy) — Xcode'da

- `NSPrivacyTracking`: **false** (ATT yok, takip yok).
- `NSPrivacyAccessedAPITypes`: UserDefaults (Capacitor Preferences) → neden kodu
  **CA92.1** (yalnızca uygulamanın kendi verisi). Capacitor çekirdeğinin ve
  eklentilerin kendi manifestleri de pakete girer; Xcode "Privacy Report" ile birleşik rapor kontrol edilir.
- AdMob eklenirse SDK'nın kendi manifesti gelir; Info.plist'e `GADApplicationIdentifier`
  ve Google'ın `SKAdNetworkItems` listesi eklenir. `NSUserTrackingUsageDescription` **eklenmez** (ATT yok).
- `ITSAppUsesNonExemptEncryption`: **NO** (yalnızca standart şifreleme; kendi şifrelememiz yok).
