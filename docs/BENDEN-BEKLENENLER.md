# Oyun sahibinden beklenenler

Bu adımları yalnızca sen yapabilirsin; hiçbiri senin yerine yapılmadı ve
yapılmayacak. Şifre ya da doğrulama kodu kimseyle paylaşılmamalı.

## Bilgiler (yasal metinlerde ve ayarlarda yer tutucu duruyor)

- [ ] Yayıncı adı (bireysel ad soyad ya da şirket unvanı)
- [ ] İletişim e-postası (destek ve KVKK başvuruları için)
- [ ] Adres (KVKK aydınlatma metni için)
- [ ] Varsa web sitesi / destek sayfası adresi
- [ ] Bundle ID (ör. `com.<ad>.kelimekoprusu`)
- [ ] Mağaza bölgeleri (yalnızca Türkiye mi, tüm dünya mı?)
- [ ] Hedef yaş: 13 yaş altına yönelik mi? (Gizlilik politikası §5)

## Kararlar

- [ ] Jeton paketi miktarları ve taslak fiyatlar (`docs/gelir-modeli.md` §2)
- [ ] Jeton kaybı riski için çözüm (öneri: iCloud yedeği) — **çözülmeden gerçek jeton satışı açılmayacak**
- [ ] Geçiş reklamı ilk sürümde kapalı kalsın mı (öneri: evet)
- [ ] SDK seçimi onayı ve paket kurulumuna izin (Capacitor, Preferences, native-purchases, AdMob)
- [ ] Uygulama adı çakışma kontrolü (App Store araması, TÜRKPATENT)
- [ ] Birincil kategori (Eğitim / Oyunlar)
- [ ] Meshy görsellerinin lisansı (ücretsiz planla üretildiyse ticari kullanım şartları)

## App Store Connect'te (hesabına göre ekranda istenenleri takip et)

1. **Apple Developer Program** üyeliği (developer.apple.com) — bireysel ya da kurumsal; kimlik doğrulaması.
2. **Agreements, Tax, and Banking:** ücretli uygulamalar sözleşmesi (Paid Apps Agreement).
   Vergi ve banka formlarında **hangi formun gerektiğini App Store Connect hesabına göre gösterir**; ekrandaki adımları takip et.
3. **Uygulama kaydı:** My Apps → + → New App (ad, birincil dil, bundle ID, SKU).
4. **Uygulama içi ürünler:** Reklamsız (Non-Consumable) ve jeton paketleri (Consumable) — kimlikler `docs/gelir-modeli.md` §6. Her ürüne görünen ad, açıklama, fiyat ve inceleme ekran görüntüsü.
5. **App Privacy** formu: `docs/app-privacy-envanteri.md`.
6. **Yaş derecelendirmesi** anketi: `docs/magaza/listeleme.md`.
7. **Sandbox test kullanıcısı** (Users and Access → Sandbox).
8. **AdMob** (reklam açılacaksa): Google AdMob hesabı, iOS uygulama kaydı, ödüllü reklam birimi; uygulama kimliği ve birim kimliği bana verilir (gizli değildir, ama hesap bilgisi paylaşma).

## Danışmanlık

- [ ] **Hukukçu:** Gizlilik Politikası, KVKK Aydınlatma Metni, Kullanım Koşulları taslakları (`public/yasal/`): hukuki sebepler, yurt dışına aktarım, cayma hakkı, sorumluluk, uygulanacak hukuk. VERBİS kayıt yükümlülüğü.
- [ ] **Mali müşavir:** App Store gelirinin vergilendirilmesi (Türkiye'de mobil uygulama geliştiricilerine ilişkin düzenlemeler dahil).
