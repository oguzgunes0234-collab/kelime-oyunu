import { languageInfo } from './languages';
import type { LangCode } from './types';

/**
 * Cevap karşılaştırması için normalleştirme.
 *
 * Yapılan: Unicode NFC, baştaki/sondaki boşlukları silme, iç boşlukları teke
 * indirme, dile duyarlı küçük harfe çevirme ("İ"→"i", "I"→"ı" Türkçede).
 *
 * Bilerek YAPILMAYAN: aksan/işaret silme. "şişe" ile "sise", "ölü" ile "olu"
 * farklı kelimelerdir. Yazım varyantları (ör. "rüzgâr"/"rüzgar") veride
 * alternatif olarak açıkça tanımlanır.
 */
export function normalizeAnswer(input: string, lang: LangCode): string {
  return input
    .normalize('NFC')
    .replace(/[’‘`´]/g, "'")
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase(languageInfo(lang).locale);
}

/** Kelimenin harflerini (normalleştirilmiş, küçük) dizi olarak verir. */
export function lettersOf(word: string, lang: LangCode): string[] {
  return Array.from(normalizeAnswer(word, lang));
}

/** Harf taşında gösterilecek büyük harf. */
export function displayLetter(letter: string, lang: LangCode): string {
  return letter.toLocaleUpperCase(languageInfo(lang).locale);
}

export function displayWord(word: string, lang: LangCode): string {
  return word.toLocaleUpperCase(languageInfo(lang).locale);
}

/** Klavyeden gelen tek bir karakteri hedef dile göre harf taşı anahtarına çevirir. */
export function keyToLetter(key: string, lang: LangCode): string | null {
  if (Array.from(key).length !== 1) return null;
  const letter = normalizeAnswer(key, lang);
  return /\p{L}/u.test(letter) ? letter : null;
}

export function isAccepted(input: string, accepted: string[], lang: LangCode): boolean {
  const given = normalizeAnswer(input, lang);
  if (!given) return false;
  return accepted.some((a) => normalizeAnswer(a, lang) === given);
}
