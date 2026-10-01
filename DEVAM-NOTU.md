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

## DİKKAT: kelime paketi betikleri
`taslak/ikinci-gorus.json` bilerek repoda YOK (lisansı doğrulanmamış bir
listeden türedi; yalnızca karşılaştırma için yerelde tutuluyor). Bu dosya
olmadan `node taslak/donustur.mjs` + `node taslak/pakete-ekle.mjs` çalıştırılırsa
"iki kaynak uyuştu" (crosscheck) kelimeleri paketten düşer (~650 kelime).
Dosya yoksa `src/data/pack-tr-en.json`'ı yeniden üretmeyin; doğrudan düzenleyin
ya da yalnızca yeni taslakları ekleyin.

## Sıradaki işler (öncelik sırasıyla)
1. Eş anlamlı jokeri "bilmedi" sayılmasın: puandan düşsün ama tekrar
   listesine ekleme ve uyarlamalı zorluğu düşürme (bkz. `core/puzzle.ts`
   `wordResults` → `helped`, `core/profile.ts` `applyWord`).
2. Pekiştirmede eş anlamlı çeldirici çıkmasın: bir kaydın Türkçe karşılığı
   başka kaydın alternatifiyse (ör. "gerçek": real/true) çeldirici olmasın
   (`core/practice.ts` `distractors`). 33 kayıt etkileniyor.
3. iPhone'da 7 gün kullanılmayan sitelerin verisi silinebilir: "Ana ekrana
   ekle" önerisi.
4. İçerik incelemesi (örnek cümleler, tanımlar); başlangıçta seviye testi;
   ekonomi dengesi (jeton çok cömert).

## Kontroller
`npx tsc --noEmit` ve `npx vitest run` (şu an 120 test geçiyor).
