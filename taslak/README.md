# Taslak kelimeler

Bu klasördeki kelimeler **oyunda kullanılmaz**. Oyuna yalnızca inceleme
sayfasında onaylanan kelimeler `reviewed: true` işaretiyle
`src/data/pack-tr-en.json` dosyasına eklenir.

- `adaylar.txt`: aday İngilizce kelimeler, en yaygından aza doğru sıralı.
- `grup-NN.txt`: Claude'un yazdığı taslak çeviriler, örnekler ve tanımlar.
- `donustur.mjs`: taslakları denetleyip `taslak.json` üretir.
- `inceleme.html` + `inceleme-sayfasi.mjs`: telefonda inceleme sayfası.

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
