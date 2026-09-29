import { describe, expect, it } from 'vitest';
import { normalizeAnswer } from '../src/core/normalize';
import { DIFFICULTY_LEVELS, toQuestion, validatePack } from '../src/core/pack';
import type { WordPack } from '../src/core/types';
import packJson from '../src/data/pack-tr-en.json';

const pack = packJson as WordPack;

describe('kelime paketi', () => {
  it('doğrulamadan temiz geçer', () => {
    expect(validatePack(pack)).toEqual([]);
  });

  it('her seviyede yeterli kelime var', () => {
    for (const levels of Object.values(DIFFICULTY_LEVELS)) {
      const n = pack.entries.filter((e) => levels.includes(e.level)).length;
      expect(n).toBeGreaterThanOrEqual(20);
    }
  });

  it('her girdi iki yönde de soru üretir', () => {
    for (const e of pack.entries) {
      const a = toQuestion(e, { source: 'tr', target: 'en' });
      const b = toQuestion(e, { source: 'en', target: 'tr' });
      expect(a.answer).toBe(e.terms.en.text);
      expect(b.answer).toBe(e.terms.tr.text);
      expect(a.accepted[0]).toBe(a.answer);
    }
  });

  it('anlam ipuçları cevabı ya da soruyu tam kelime olarak içermez', () => {
    const words = (s: string) => s.toLocaleLowerCase('tr-TR').split(/[^\p{L}]+/u).filter(Boolean);
    for (const e of pack.entries) {
      const hint = e.hint?.tr;
      expect(hint, e.id).toBeTruthy();
      const hw = new Set(words(hint!));
      const forms = [e.terms.tr.text, ...(e.terms.tr.alternatives ?? []), e.terms.en.text].map((w) => normalizeAnswer(w, 'tr'));
      for (const f of forms) expect(hw.has(f), `${e.id}: ipucu "${f}" içeriyor`).toBe(false);
    }
  });
});
