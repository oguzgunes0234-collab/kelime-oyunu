import { describe, expect, it } from 'vitest';
import { CLOZE_BLANK, clozeFor, definitionFor, pickClue } from '../src/core/clues';
import { defaultProfile, type Profile } from '../src/core/profile';
import { MAX_CONTEXT_CLUES, applyPuzzle, cellsOf, isLocked, newPuzzle, puzzleCandidates, typeLetter, type PuzzleState } from '../src/core/puzzle';
import { seededRng } from '../src/core/rng';
import { SRS_INTERVALS, SRS_MAX_BOX, dueCount, isDue, recordSrs, srsNext } from '../src/core/srs';
import type { Direction, Entry, WordPack } from '../src/core/types';
import packJson from '../src/data/pack-tr-en.json';

const pack = packJson as WordPack;
const day = (d: number) => new Date(2026, 8, d, 12);
const TR_EN: Direction = { source: 'tr', target: 'en' };
const EN_TR: Direction = { source: 'en', target: 'tr' };
const elma = pack.entries.find((e) => e.id === 'elma')!;

function entry(en: Partial<Entry['terms'][string]>, tr: Partial<Entry['terms'][string]> = {}): Entry {
  return {
    id: 'x',
    pos: 'noun',
    level: 'A1',
    topic: 'genel',
    terms: { tr: { text: 'kedi', ...tr }, en: { text: 'cat', ...en } },
  } as Entry;
}

describe('cümle ipucu (cloze)', () => {
  it('örnek cümledeki cevabı boşlukla değiştirir', () => {
    expect(clozeFor(elma, 'en')).toBe(`I eat an ${CLOZE_BLANK} every morning.`);
    expect(clozeFor(elma, 'tr')).toBe(`Her sabah bir ${CLOZE_BLANK} yerim.`);
  });

  it('büyük harfle başlayan cevabı da bulur, cümlenin geri kalanını korur', () => {
    expect(clozeFor(entry({ example: 'Cats like milk.', alternatives: ['cats'] }), 'en')).toBe(`${CLOZE_BLANK} like milk.`);
    expect(clozeFor(entry({ example: 'Cat food is here.' }), 'en')).toBe(`${CLOZE_BLANK} food is here.`);
  });

  it('kelimenin parçasını boşaltmaz; bulamazsa null döner', () => {
    expect(clozeFor(entry({ example: 'The catalog is new.' }), 'en')).toBeNull();
    expect(clozeFor(entry({}), 'en')).toBeNull();
  });

  it('Türkçe çekimli hali eşleşmez (ör. "kediler")', () => {
    expect(clozeFor(entry({}, { example: 'Kediler süt sever.' }), 'tr')).toBeNull();
  });
});

describe('ipucu seçimi', () => {
  it('tanım yalnızca Türkçe → İngilizce yönünde var', () => {
    expect(definitionFor(elma, TR_EN)).toBe(elma.hint!.tr);
    expect(definitionFor(elma, EN_TR)).toBeNull();
  });

  it('yeni kelime her zaman çeviriyle gelir', () => {
    for (let i = 0; i < 10; i++) expect(pickClue(elma, TR_EN, false, seededRng(i)).kind).toBe('translation');
  });

  it('tekrar edilen kelime cümle ya da tanımla gelir; ikisi de yoksa çeviri', () => {
    const kinds = new Set(Array.from({ length: 30 }, (_, i) => pickClue(elma, TR_EN, true, seededRng(i)).kind));
    expect(kinds).toEqual(new Set(['cloze', 'definition']));
    expect(pickClue(entry({}), TR_EN, true).kind).toBe('translation');
    const c = pickClue(elma, EN_TR, true, seededRng(1));
    expect(c.kind).toBe('cloze');
    expect(c.text).toContain(CLOZE_BLANK);
  });
});

describe('aralıklı tekrar', () => {
  const now = day(10);

  it('hatasız bilinen kelime kutu kutu seyrekleşir, en üst kutuda kalır', () => {
    let item = srsNext(undefined, 'clean', now);
    expect(item).toEqual({ box: 1, due: '2026-09-11' });
    item = srsNext(item, 'clean', now);
    expect(item).toEqual({ box: 2, due: '2026-09-13' });
    for (let i = 0; i < 10; i++) item = srsNext(item, 'clean', now);
    expect(item.box).toBe(SRS_MAX_BOX);
    expect(item.due).toBe('2026-11-09'); // 60 gün
    expect(SRS_INTERVALS[SRS_MAX_BOX - 1]).toBe(60);
  });

  it('yardımla bilinen kutusunda kalır, bilinemeyen 1. kutuya döner; ikisi de ertesi gün gelir', () => {
    expect(srsNext({ box: 3, due: 'x' }, 'correct', now)).toEqual({ box: 3, due: '2026-09-11' });
    expect(srsNext({ box: 4, due: 'x' }, 'miss', now)).toEqual({ box: 1, due: '2026-09-11' });
  });

  it('kaydı olmayan öğrenilmiş kelime hemen tekrar sayılır; kayıtlı olan gününe göre', () => {
    const s = recordSrs({}, 'tr>en', 'elma', 'clean', now);
    expect(isDue(s, 'tr>en', 'su', true, now)).toBe(true);
    expect(isDue(s, 'tr>en', 'su', false, now)).toBe(false);
    expect(isDue(s, 'tr>en', 'elma', true, now)).toBe(false);
    expect(isDue(s, 'tr>en', 'elma', true, day(11))).toBe(true);
    expect(isDue(s, 'en>tr', 'elma', true, now)).toBe(true);
    expect(dueCount(s, 'tr>en', ['elma', 'su'], now)).toBe(1);
  });
});

function solveAll(s: PuzzleState): PuzzleState {
  let st = s;
  st.cw.words.forEach((w, word) => {
    const cells = cellsOf(st, word);
    w.letters.forEach((l, i) => {
      if (st.status !== 'playing' || isLocked(st, ...cells[i])) return;
      st = typeLetter({ ...st, sel: { word, index: i } }, l);
    });
  });
  return st;
}

describe('bulmacada tekrar', () => {
  it('tekrarı gelen kelime yeni kelimeden önce, tekrarı gelmemiş olan sonra sıralanır', () => {
    const p: Profile = { ...defaultProfile(day(1)), learned: { 'tr>en': ['elma', 'su'] } };
    p.srs = recordSrs({}, 'tr>en', 'su', 'clean', day(10)); // su yarına kadar beklemede
    const groups = puzzleCandidates(pack, p, TR_EN, 'easy', undefined, day(10), seededRng(1));
    const groupOf = (id: string) => groups.findIndex((g) => g.some((c) => c.entryId === id));
    expect(groupOf('elma')).toBe(1);
    expect(groupOf('su')).toBe(3);
    const fresh = groups[2];
    expect(fresh.length).toBeGreaterThan(0);
    expect(fresh.every((c) => !c.clueKind)).toBe(true);
    const elmaCand = groups[1].find((c) => c.entryId === 'elma')!;
    expect(['cloze', 'definition']).toContain(elmaCand.clueKind);
    expect(elmaCand.clueText).toBeTruthy();
    expect(elmaCand.clue).toBe('elma');
  });

  it('bir bulmacada en fazla birkaç cümle/tanım ipucu olur, kalanlar çeviri', () => {
    const all = pack.entries.map((e) => e.id);
    const p: Profile = { ...defaultProfile(day(1)), learned: { 'tr>en': all } };
    for (let seed = 1; seed <= 5; seed++) {
      const s = newPuzzle(pack, p, TR_EN, 'easy', seededRng(seed));
      const ctx = s.cw.words.filter((w) => w.clueKind && w.clueKind !== 'translation');
      expect(ctx.length).toBe(MAX_CONTEXT_CLUES);
      expect(s.cw.words.filter((w) => !w.clueKind && !w.clueText).length).toBe(s.cw.words.length - MAX_CONTEXT_CLUES);
    }
  });

  it('bulmaca bitince çözülen kelimeler kutuya girer', () => {
    const p = defaultProfile(day(1));
    const s = solveAll(newPuzzle(pack, p, TR_EN, 'easy', seededRng(3)));
    const { profile } = applyPuzzle(p, s, pack, true, day(1));
    const ids = s.cw.words.map((w) => w.entryId);
    for (const id of ids) expect(profile.srs['tr>en'][id]).toEqual({ box: 1, due: '2026-09-02' });
  });
});
