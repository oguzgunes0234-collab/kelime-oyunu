# Taslak kelimeler

Bu klasördeki taslaklar kendiliğinden oyuna girmez. `pakete-ekle.mjs`
yalnızca şunları `src/data/pack-tr-en.json` dosyasına ekler:

- kişinin inceleme sayfasında onayladıkları (`check: "human"`),
- Türkçe karşılığı ikinci kaynakla uyuşanlar (`check: "crosscheck"`),
- oyun sahibinin açıkça toplu onayladığı gruplar (şu an yalnızca 1 ve 2;
  `check: "bulk"`).

Geri kalanlar kişinin kararını bekler.

- `adaylar.txt`: aday İngilizce kelimeler, en yaygından aza doğru sıralı.
- `grup-NN.txt`: Claude'un yazdığı taslak çeviriler, örnekler ve tanımlar.
- `donustur.mjs`: taslakları denetleyip `taslak.json` üretir.
- `pakete-ekle.mjs`: kurallara göre pakete ekler (tekrar çalıştırılabilir).
- `inceleme.html` + `inceleme-sayfasi.mjs`: telefonda inceleme sayfası.
- `denetim-dosyasi.mjs`: dış denetçi (ör. ChatGPT) için CSV üretir.

## Gruplar ve kaynakları

İngilizce kelime SEÇİMİ her grupta aşağıdaki telifsiz listelerden gelir.
Türkçe karşılıklar, örnek cümleler ve tanımlar Claude'un taslağıdır.

| Grup | İçerik | Kelime seçiminin kaynağı |
|---|---|---|
| 01–02 | En yaygın genel kelimeler | 12dicts 2+2+3frq sınıf ≤ 12 ∩ 3esl (`adaylar.txt`) |
| 03–05 | Konu modları (yemek, alışveriş, ev, seyahat, iş, sağlık, bilim ve teknoloji, hukuk) | 12dicts 2+2+3frq tüm sınıflar ∩ 3esl, konuya göre elle seçildi |
| 06 | Geri kazanılan çakışan kelimeler (ör. "ay (takvim)") | 01–02'de çakışma yüzünden elenenler |
| 07 | Düzensiz fiillerin geçmiş zamanı (went, ate…) | Temel fiiller 12dicts'te; geçmiş zaman biçimleri İngilizce dilbilgisinin genel bilgisidir, bir listeden alınmadı |
| 08 | B2/C1 kelimeler | 12dicts 2+2+3frq sınıf 13–14 ∩ 3esl |

**İkinci kaynak (`ikinci-gorus.json`, repoya girmez):** Oyun sahibinin
ChatGPT'den aldığı bir Word dosyası. Belgenin kendisi, çevirilerin
"Oxford3000_Vocab" adlı bir GitHub deposundan alındığını ve kelime seçiminin
yeniden dağıtım izninin doğrulanmadığını yazıyor. Bu yüzden oradan hiçbir
kelime ALINMADI; yalnızca bizim taslaklarımızın Türkçe karşılığının onunkiyle
aynı olup olmadığına bakılır. Uyuşma, kelimenin kişi onayı olmadan oyuna
girmesine izin verir. Bu karşılaştırmanın bile kullanılmasını istemiyorsanız
dosyayı silip `pakete-ekle.mjs`'i yeniden çalıştırmak yeterli; o zaman
yalnızca kişi onaylı ve toplu onaylı kelimeler kalır.

## Ayırt edici açıklama (çakışan Türkçe karşılıklar)

Aynı Türkçe kelime (ör. "ay") birden çok kayıtta ancak hepsinde farklı bir
`terms.tr.context` varsa kabul edilir: "ay (takvim)" = month, "ay (gökyüzü)"
= moon. Açıklama ipucu çubuğunda görünür; bulmaca üreticisi aynı görünen
ipucunu bir bulmacaya iki kez koymaz. Eş anlamlılar (large/big, fast/quick)
açıklamayla güvenilir biçimde ayrılamadığı için geri kazanılmadı.

## Aday listesi nasıl çıkarıldı

12dicts `Lemmatized/2+2+3frq.txt` sıklık sınıfı 12 ve altı olan kök
kelimeler; bunların içinden `American/3esl.txt` (İngilizce öğrenenler için)
listesinde olan, 3–8 harfli, bağlaç/edat/zamir olmayan ve pakette
bulunmayanlar alındı: 3.051 kelime. Telifli öğrenci listeleri (Oxford 3000
vb.) kullanılmadı.

## Kaynaklar ve lisans

**12dicts 6.0.2**, Alan Beale. Kamu malı ilan edilmiştir; yazar kaynak
gösterilmesini ister. 2+2+3 listeleri AGID'e dayanır (Kevin Atkinson,
aşağıdaki izinle).

**SCOWL 2020.12.07** (Spell Checker Oriented Word Lists), Kevin Atkinson,
http://wordlist.aspell.net/ — telif notu:

    The collective work is Copyright 2000-2018 by Kevin Atkinson as well
    as any of the copyrights mentioned below:
    
      Copyright 2000-2018 by Kevin Atkinson
    
      Permission to use, copy, modify, distribute and sell these word
      lists, the associated scripts, the output created from the scripts,
      and its documentation for any purpose is hereby granted without fee,
      provided that the above copyright notice appears in all copies and
      that both that copyright notice and this permission notice appear in
      supporting documentation. Kevin Atkinson makes no representations
      about the suitability of this array for any purpose. It is provided
      "as is" without express or implied warranty.
