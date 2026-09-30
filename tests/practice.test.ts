import { describe, expect, it } from 'vitest';
import { PRACTICE_COINS_PER_WORD } from '../src/core/economy';
import { toQuestion } from '../src/core/pack';
import { MAX_PRACTICE_WORDS, applyPractice, buildPractice, practiceCandidates } from '../src/core/practice';
import { defaultProfile } from '../src/core/profile';
import type { WordResult } from '../src/core/puzzle';
import { seededRng } from '../src/core/rng';
import type { Direction, WordPack } from '../src/core/types';
import packJson from '../src/data/pack-tr-en.json';

const pack = packJson as WordPack;
const TR_EN: Direction = { source: 'tr', target: 'en' };

function result(id: string, over: Partial<WordResult> = {}): WordResult {
  const entry = pack.entries.find((e) => e.id === id)!;
  const q = toQuestion(entry, TR_EN);
  return {
    word: 0,
    question: q,
    answer: q.answer,
    status: 'correct',
    helped: false,
    wrongAttempts: 0,
    score: { lines: [], total: 0 },
    ...over,
  } as WordResult;
}

describe('pekiştirme', () => {
  it('yalnızca zorlanılan kelimeler gelir: çözülemeyen, yardımla çözülen ya da yanlış denemesi olan', () => {
    const rs = [
      result('elma'),
      result('su', { status: 'failed' }),
      result('ekmek', { helped: true }),
      result('kedi', { wrongAttempts: 1 }),
    ];
    expect(practiceCandidates(rs).map((r) => r.question.entryId)).toEqual(['su', 'ekmek', 'kedi']);
  });

  it(`en çok ${MAX_PRACTICE_WORDS} kelime`, () => {
    const ids = pack.entries.slice(0, 9).map((e) => e.id);
    expect(practiceCandidates(ids.map((id) => result(id, { status: 'failed' })))).toHaveLength(MAX_PRACTICE_WORDS);
  });

  it('anlam seçenekleri: dört farklı seçenek, doğrusu içinde, çeldiriciler aynı sözcük türünden', () => {
    const [item] = buildPractice(pack, TR_EN, [result('elma', { status: 'failed' })], seededRng(3));
    expect(item.choices).toHaveLength(4);
    expect(new Set(item.choices).size).toBe(4);
    expect(item.choices[item.correctChoice]).toBe('elma');
    for (const c of item.choices) {
      const e = pack.entries.find((x) => x.terms.tr.text === c)!;
      expect(e.pos).toBe('noun');
    }
  });

  it('cümle tamamlama: örnekte kelime varsa boşluklu cümle, harfler cevabın harfleri', () => {
    const [item] = buildPractice(pack, TR_EN, [result('elma', { status: 'failed' })], seededRng(1));
    expect(item.cloze).toBe('I eat an ___ every morning.');
    expect(item.letters.join('')).toBe('apple');
    expect(item.sourceExample).toContain('elma');
  });

  it('yalnızca cevaba bakmadan ikisini de doğru yapılan kelime jeton getirir; hiçbir şey eksilmez', () => {
    const p = { ...defaultProfile(new Date()), coins: 7 };
    const res = applyPractice(p, [
      { entryId: 'a', meaningOk: true, clozeOk: true, revealed: false },
      { entryId: 'b', meaningOk: true, clozeOk: true, revealed: true },
      { entryId: 'c', meaningOk: false, clozeOk: true, revealed: false },
    ]);
    expect(res.mastered).toBe(1);
    expect(res.coins).toBe(PRACTICE_COINS_PER_WORD);
    expect(res.profile.coins).toBe(7 + PRACTICE_COINS_PER_WORD);
    expect(res.profile.review).toEqual(p.review);
    expect(res.profile.srs).toEqual(p.srs);
    expect(applyPractice(p, []).profile).toBe(p);
  });
});
