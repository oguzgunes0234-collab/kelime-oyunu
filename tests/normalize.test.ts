import { describe, expect, it } from 'vitest';
import { displayWord, isAccepted, keyToLetter, normalizeAnswer } from '../src/core/normalize';

describe('normalizeAnswer', () => {
  it('boşlukları ve büyük/küçük harfi tolere eder', () => {
    expect(normalizeAnswer('  Apple ', 'en')).toBe('apple');
    expect(normalizeAnswer('put   off', 'en')).toBe('put off');
  });

  it('Türkçe İ/ı dönüşümünü doğru yapar', () => {
    expect(normalizeAnswer('İSTANBUL', 'tr')).toBe('istanbul');
    expect(normalizeAnswer('KIRMIZI', 'tr')).toBe('kırmızı');
    expect(displayWord('kırmızı', 'tr')).toBe('KIRMIZI');
    expect(displayWord('şişe', 'tr')).toBe('ŞİŞE');
  });

  it('aksanları silmez: farklı kelimeler eşit sayılmaz', () => {
    expect(isAccepted('sise', ['şişe'], 'tr')).toBe(false);
    expect(isAccepted('olu', ['ölü'], 'tr')).toBe(false);
    expect(isAccepted('rüzgar', ['rüzgâr'], 'tr')).toBe(false);
    expect(isAccepted('rüzgar', ['rüzgâr', 'rüzgar'], 'tr')).toBe(true);
  });

  it('ayrışık (NFD) yazılmış harfleri de tanır', () => {
    expect(isAccepted('şişe', ['şişe'], 'tr')).toBe(true);
  });

  it('alternatif cevapları kabul eder, boş cevabı reddeder', () => {
    expect(isAccepted(' HOME', ['house', 'home'], 'en')).toBe(true);
    expect(isAccepted('   ', ['house'], 'en')).toBe(false);
  });

  it('klavye tuşunu harfe çevirir', () => {
    expect(keyToLetter('I', 'tr')).toBe('ı');
    expect(keyToLetter('İ', 'tr')).toBe('i');
    expect(keyToLetter('A', 'en')).toBe('a');
    expect(keyToLetter('Enter', 'en')).toBeNull();
    expect(keyToLetter('1', 'en')).toBeNull();
  });
});
