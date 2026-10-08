import { describe, expect, it } from 'vitest';
import { puzzleFromCrossword, readingOrder, selectWord, stepWord, typeLetter } from '../src/core/puzzle';
import { TUTORIAL_DIRECTION, TUTORIAL_STEPS, tutorialCrossword } from '../src/core/tutorial';
import type { WordPack } from '../src/core/types';
import packJson from '../src/data/pack-tr-en.json';

const pack = packJson as WordPack;
const T4 = TUTORIAL_STEPS.findIndex((s) => s.id === 'T4');

describe('sıradaki kelime: ipucu karesine göre okuma sırası', () => {
  it('yukarıdan aşağı, soldan sağa', () => {
    const cw = tutorialCrossword(T4, pack);
    const ids = readingOrder(cw).map((i) => cw.words[i].entryId);
    expect(ids).toEqual(['el', 'kapi', 'yatak', 'soguk']);
  });

  it('eğitimde KAPI (DOOR) çözülünce imleç YATAK\'a geçer', () => {
    const cw = tutorialCrossword(T4, pack);
    const kapi = cw.words.findIndex((w) => w.entryId === 'kapi');
    let s = selectWord(puzzleFromCrossword(cw, TUTORIAL_DIRECTION, 'easy'), kapi);
    for (const ch of cw.words[kapi].letters) s = typeLetter(s, ch);
    expect(s.solved[kapi]).toBe(true);
    expect(cw.words[s.sel.word].entryId).toBe('yatak');
  });

  it('önceki/sonraki ok tuşları çözülenleri atlar ve başa sarar', () => {
    const cw = tutorialCrossword(T4, pack);
    const order = readingOrder(cw);
    const s0 = puzzleFromCrossword(cw, TUTORIAL_DIRECTION, 'easy');
    const s = { ...s0, solved: s0.solved.map((_, i) => i === order[1]) };
    expect(stepWord(s, order[0], 1)).toBe(order[2]);
    expect(stepWord(s, order[3], 1)).toBe(order[0]);
    expect(stepWord(s, order[0], -1)).toBe(order[3]);
  });
});
