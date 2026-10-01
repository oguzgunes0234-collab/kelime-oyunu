# Devam notu (geliştirme oturumları arası)

Aşağıdaki işler `main`'e birleştirildi ve yayında (oyun sahibinin onayıyla,
2026-10-01): herkese açık test linki ve telefondaki Tailscale adresi güncel (08867c7: ana sayfa ve bulmaca arka plan görselleri).
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

## Kelime paketi betikleri (bulutta dikkat)
- `taslak/ikinci-gorus.json` bilerek repoda YOK (lisansı doğrulanmamış bir
  listeden türedi; yalnızca karşılaştırma için oyun sahibinin bilgisayarında).
  Bütün taslaklar toplu onaylandığı için, birleştirme her zaman
  `node taslak/donustur.mjs && node taslak/pakete-ekle.mjs <karar klasörü> --toplu=1,2,3,4,5,6,7,8`
  ile çalıştırılırsa bu dosya olmadan da hiçbir kelime düşmez; yalnızca
  "crosscheck" etiketleri "bulk" olur. `--toplu` vermeden ÇALIŞTIRMAYIN.
- İnceleme sayfası (oyun sahibine özel artifact):
  https://claude.ai/artifact/JEsQpKBTKDwv65jXYHHaHL — sayfa
  `node taslak/inceleme-sayfasi.mjs <çıktı.html>` ile üretilir ve aynı adrese
  yeniden yayınlanır. Oyun sahibinin kararları sayfanın veritabanında,
  `kararlar` koleksiyonunda (belge kimliği = kelime id; `{s: ok|edit|drop, e?}`).
  Kararları bir klasöre `<id>.json` olarak indirip `pakete-ekle.mjs`'e verin.
- Aday kelime listeleri: `taslak/adaylar.txt` yalnızca ilk 3.051 aday. Daha
  fazlası için SCOWL 2020.12.07 ve 12dicts 6.0.2 yeniden indirilmeli
  (wordlist.aspell.net / SourceForge; indirmeden önce oyun sahibinden izin
  alın); seçim kuralı `taslak/README.md` içinde.

## Yayın nasıl yapılır (oyun sahibi onay verince)
1. `main`'e gönder (GitHub).
2. Herkese açık test sürümü: `npx vite build --base ./ --outDir <klasör>`,
   çıktıyı `oguzgunes0234-collab/kelime-oyunu-test` reposunun köküne kopyala
   (`.nojekyll` ve README kalsın), gönder; GitHub Pages bir iki dakikada yayınlar.
3. Telefondaki Tailscale adresi oyun sahibinin bilgisayarında `main`'den
   derlenir (`TELEFONDA-AC.bat`); bulutta güncellenemez.

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
