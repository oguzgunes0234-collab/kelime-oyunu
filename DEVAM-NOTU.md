# Devam notu (geliştirme oturumları arası)

Aşağıdaki işler `main`'e birleştirildi ve yayında (oyun sahibinin onayıyla,
2026-10-01): herkese açık test linki ve telefondaki Tailscale adresi güncel.
Yeni işler için `main`'den çalışın. `main`'e birleştirme ve yayın her seferinde
oyun sahibine sorulur.

## Son birleştirilen işler
- Uzman zorluğu (B2–C1), bölüm tavanı (1–2 Orta, 3–5 Zor, 6+ Uzman).
- Çakışan Türkçe karşılıklar için ayırt edici açıklama (`terms.tr.context`).
- Geçmiş zaman konu modu (`Entry.grammar`), 67 düzensiz fiil taslağı.
- B2/C1 taslakları (grup-08), geri kazanılan kelimeler (grup-06).
- Ses (Web Audio, dosyasız) ve bulmaca sonrası pekiştirme.
- Jokerler: Cümle, Eş anlamlı; cümle ipucu ≥ 5 kelime + çeviri satırı.

## Kelime paketi durumu (2026-10-01)
Oyun sahibi bekleyen bütün taslakları toplu onayladı: paket 1.196 kelime
(`pakete-ekle.mjs ... --toplu=1,2,3,4,5,6,7,8`). İnsan tarafından tek tek
incelenen yalnızca 17 kelime (`check: "human"`); geri kalanı `crosscheck` ya da
`bulk`. İnceleme sayfası hâlâ şüpheli A1–A2 kelimelerini işaretliyor; oradaki
düzeltme/çıkarma kararları bir sonraki birleştirmede uygulanır.

## DİKKAT: kelime paketi betikleri
`taslak/ikinci-gorus.json` bilerek repoda YOK (lisansı doğrulanmamış bir
listeden türedi; yalnızca karşılaştırma için yerelde tutuluyor). Bu dosya
olmadan `node taslak/donustur.mjs` + `node taslak/pakete-ekle.mjs` çalıştırılırsa
"iki kaynak uyuştu" (crosscheck) kelimeleri paketten düşer (~650 kelime).
Dosya yoksa `src/data/pack-tr-en.json`'ı yeniden üretmeyin; doğrudan düzenleyin
ya da yalnızca yeni taslakları ekleyin.

## Sıradaki işler (oyun sahibiyle kararlaştırılan sıra, 2026-10-01)
1. [YAPILDI] Yardım türlerini ayır: anlamı daraltan jokerler (Eş anlamlı, Cümle) puandan
   düşer ama "bilmedi" sayılmaz (tekrar listesine eklemez, zorluğu düşürmez);
   cevabı açan yardımlar (Harf aç, Anlam) tekrar gerektirir.
2. [YAPILDI] Pekiştirmede tek doğru cevap: çeldirici, doğru cevabın eş anlamlısı ya da
   aynı karşılığı paylaşan bir kelime olmasın (ör. "gerçek": real/true).
3. [YAPILDI] Hiç kelimesi olmayan konu modları menüde görünmesin; kelimesi olup eşiğe
   ulaşmayanlar "Hazırlanıyor" kalsın.
4. Erken bölüm (A1–A2) kelimelerinin insan incelemesi: şüphelileri işaretle
   (kısa örnek, farklı çeviri), oyun sahibi baksın.
5. Tekrar sistemlerini tek "Öğrendiklerim" alanında birleştir (tekrar et /
   çalışılıyor / öğrenildi); atlanabilir kısa seviye belirleme (öneri olarak).
6. Ekonomi ayarı: önce gerçek oyun verisi (yardım kullanımı, jeton) topla.
7. iPhone'da ilerleme kaybı: kısa vadede "Ana ekrana ekle" önerisi; kalıcı
   çözüm bulut yedeği.

## Kontroller
`npx tsc --noEmit` ve `npx vitest run` (şu an 123 test geçiyor).
