/**
 * Yasal metinlerin bağlantıları. Sayfalar public/yasal/ altında, uygulamayla
 * birlikte gelir (çevrimdışı da açılır) ve web sürümünde aynı yolda yayınlanır.
 * App Store Connect'e yazılacak herkese açık Gizlilik Politikası adresi
 * yayından sonra kesinleşir (bkz. docs/BENDEN-BEKLENENLER.md).
 *
 * TASLAKTIR: yayıncı adı, iletişim e-postası ve adres gibi alanlar yer tutucu;
 * hukukçu incelemesi gerekebilir.
 */
export const LEGAL_LINKS = [
  { label: 'Gizlilik Politikası', href: './yasal/gizlilik.html' },
  { label: 'KVKK Aydınlatma Metni', href: './yasal/kvkk.html' },
  { label: 'Kullanım Koşulları', href: './yasal/kosullar.html' },
  { label: 'Privacy Policy (English)', href: './yasal/privacy.html' },
  { label: 'Terms of Use (English)', href: './yasal/terms.html' },
] as const;
