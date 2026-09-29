import { describe, expect, it } from 'vitest';
import { buildCrossword, crosswordAnswer, validateCrossword, wordCells } from '../src/core/crossword';
import { defaultProfile } from '../src/core/profile';
import {
  applyPuzzle,
  backspace,
  cellKey,
  cellsOf,
  finishPuzzle,
  isLocked,
  newPuzzle,
  puzzleCandidates,
  revealLetter,
  selectWord,
  selectedCell,
  showMeaning,
  solvedCount,
  tapCell,
  typeLetter,
  wordsAt,
  type PuzzleState,
} from '../src/core/puzzle';
import { seededRng } from '../src/core/rng';
import type { Difficulty, Direction, Entry, WordPack } from '../src/core/types';
import packJson from '../src/data/pack-tr-en.json';

const pack = packJson as WordPack;
const day = (d: number) => new Date(2026, 8, d, 12);
const TR_EN: Direction = { source: 'tr', target: 'en' };
const EN_TR: Direction = { source: 'en', target: 'tr' };

/** Oyuncu gibi yazar: kelimenin karelerini sırayla doldurur, çözülmüş (kilitli) kareleri atlar. */
function typeWord(s: PuzzleState, word: number, letters: string[]): PuzzleState {
  let st = s;
  const cells = cellsOf(st, word);
  letters.forEach((l, i) => {
    if (st.status !== 'playing' || isLocked(st, ...cells[i])) return;
    st = typeLetter({ ...st, sel: { word, index: i } }, l);
  });
  return st;
}

describe('bulmaca üretici', () => {
  const cases: [Direction, Difficulty][] = [
    [TR_EN, 'easy'],
    [TR_EN, 'medium'],
    [TR_EN, 'hard'],
    [EN_TR, 'easy'],
    [EN_TR, 'medium'],
    [EN_TR, 'hard'],
  ];

  it('her bulmaca kurallara uyar ve yeterince kelime içerir', () => {
    const counts: number[] = [];
    for (const [dir, diff] of cases) {
      const groups = puzzleCandidates(pack, defaultProfile(day(1)), dir, diff);
      for (let seed = 1; seed <= 25; seed++) {
        const cw = buildCrossword(groups, { rng: seededRng(seed) });
        expect(validateCrossword(cw), `${dir.source}>${dir.target} ${diff} #${seed}`).toEqual([]);
        counts.push(cw.words.length);
      }
    }
    const min = Math.min(...counts);
    const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
    console.log(`bulmaca kelime sayısı: en az ${min}, ortalama ${avg.toFixed(1)}`);
    expect(min).toBeGreaterThanOrEqual(7);
  });

  it('aynı cevap bir bulmacada iki kez yer almaz', () => {
    const cw = buildCrossword(puzzleCandidates(pack, defaultProfile(day(1)), TR_EN, 'easy'), { rng: seededRng(3) });
    const answers = cw.words.map((w) => w.letters.join(''));
    expect(new Set(answers).size).toBe(answers.length);
  });

  it('klavyede olmayan harf yerine yazılabilen alternatif kullanılır', () => {
    const entry: Entry = {
      id: 'x',
      pos: 'noun',
      level: 'A2',
      topic: 't',
      terms: { tr: { text: 'rüzgâr', alternatives: ['rüzgar'] }, en: { text: 'wind' } },
    };
    expect(crosswordAnswer(entry, 'tr', 8)?.answer).toBe('rüzgar');
    expect(crosswordAnswer({ ...entry, terms: { ...entry.terms, tr: { text: 'rüzgâr' } } }, 'tr', 8)).toBeNull();
  });

  it('tekrar listesindeki kelimeler öncelikli olarak bulmacaya girer', () => {
    const p = defaultProfile(day(1));
    const ids = ['ekmek', 'sut', 'su', 'elma'];
    const withReview = { ...p, review: ids.map((entryId) => ({ entryId, dir: 'tr>en', reason: 'wrong' as const, addedAt: 0, misses: 1 })) };
    let hits = 0;
    for (let seed = 1; seed <= 10; seed++) {
      const s = newPuzzle(pack, withReview, TR_EN, 'easy', seededRng(seed));
      hits += s.cw.words.filter((w) => ids.includes(w.entryId)).length;
    }
    expect(hits).toBeGreaterThanOrEqual(20);
  });

  it('üretim telefonda beklemeden bitecek kadar hızlı', () => {
    const groups = puzzleCandidates(pack, defaultProfile(day(1)), TR_EN, 'easy');
    const t = performance.now();
    for (let i = 0; i < 5; i++) buildCrossword(groups, { rng: seededRng(i + 100) });
    const ms = (performance.now() - t) / 5;
    console.log(`bulmaca üretimi: ${ms.toFixed(0)} ms`);
    expect(ms).toBeLessThan(400);
  });
});

describe('bulmaca oynanışı', () => {
  const fresh = () => newPuzzle(pack, defaultProfile(day(1)), TR_EN, 'easy', seededRng(11));

  it('doğru yazılan kelime çözülür ve kareleri kilitlenir', () => {
    let s = fresh();
    const w = s.cw.words[0];
    s = typeWord(s, 0, w.letters);
    expect(s.solved[0]).toBe(true);
    expect(s.wrong[0]).toBe(0);
    const [r, c] = wordCells(w)[0];
    const before = s.fill[cellKey(r, c)];
    s = tapCell(s, r, c);
    s = typeLetter(s, 'q');
    expect(s.fill[cellKey(r, c)]).toBe(before);
  });

  it('dolu ama yanlış kelime hata sayar, düzeltilince çözülür', () => {
    let s = fresh();
    const w = s.cw.words[0];
    const wrong = w.letters.map((l, i) => (i === w.letters.length - 1 ? (l === 'z' ? 'y' : 'z') : l));
    s = typeWord(s, 0, wrong);
    expect(s.solved[0]).toBe(false);
    expect(s.wrong[0]).toBe(1);
    expect(s.event?.kind).toBe('wrong');
    s = selectWord(s, 0);
    s = tapCell(s, ...wordCells(w)[w.letters.length - 1]);
    s = typeLetter(s, w.letters[w.letters.length - 1]);
    expect(s.solved[0]).toBe(true);
  });

  it('silme önce karedeki harfi, sonra bir öncekini siler', () => {
    let s = fresh();
    const w = s.cw.words[0];
    s = typeWord(s, 0, w.letters.slice(0, 2));
    const [r1, c1] = wordCells(w)[1];
    expect(s.fill[cellKey(r1, c1)]).toBe(w.letters[1]);
    s = backspace(s);
    s = backspace(s);
    expect(s.fill[cellKey(r1, c1)]).toBeUndefined();
  });

  it('kesişen kareye tekrar dokunmak diğer kelimeye geçer', () => {
    let s = fresh();
    const cross = Object.entries(
      s.cw.words.flatMap((w) => wordCells(w).map(([r, c]) => cellKey(r, c))).reduce<Record<string, number>>((m, k) => ({ ...m, [k]: (m[k] ?? 0) + 1 }), {}),
    ).find(([, n]) => n > 1)![0];
    const [r, c] = cross.split(',').map(Number);
    const words = wordsAt(s, r, c);
    s = tapCell(s, r, c);
    const first = s.sel.word;
    s = tapCell(s, r, c);
    expect(s.sel.word).not.toBe(first);
    expect(words).toContain(s.sel.word);
    expect(selectedCell(s)).toEqual([r, c]);
  });

  it('Harf aç doğru harfi koyar ve kelimeyi yardımlı sayar; hata saymaz', () => {
    let s = selectWord(fresh(), 0);
    const len = s.cw.words[0].letters.length;
    for (let i = 0; i < len; i++) {
      const res = revealLetter(s);
      expect(res.applied).toBe(true);
      s = res.state;
      if (s.solved[0]) break;
    }
    expect(s.solved[0]).toBe(true);
    expect(s.lettersRevealed[0]).toBeGreaterThan(0);
    expect(s.wrong[0]).toBe(0);
  });

  it('anlam ipucu kelime başına bir kez açılır', () => {
    let s = selectWord(fresh(), 0);
    const first = showMeaning(s, true);
    expect(first.applied).toBe(true);
    expect(showMeaning(first.state, true).applied).toBe(false);
    s = first.state;
    expect(s.meaningShown[0]).toBe(true);
  });

  it('tüm kelimeler çözülünce bulmaca biter', () => {
    let s = fresh();
    for (let w = 0; w < s.cw.words.length; w++) if (!s.solved[w]) s = typeWord(s, w, s.cw.words[w].letters);
    expect(solvedCount(s)).toBe(s.cw.words.length);
    expect(s.status).toBe('done');
    expect(s.event?.kind).toBe('complete');
  });

  it('bitince sonuçlar profile işlenir: jeton, günlük hedef, tekrar listesi', () => {
    let s = fresh();
    s = typeWord(s, 0, s.cw.words[0].letters);
    s = finishPuzzle(s);
    const p = defaultProfile(day(1));
    const { profile, outcome } = applyPuzzle(p, s, pack, false, day(1));
    const n = s.cw.words.length;
    expect(outcome.results).toHaveLength(n);
    expect(outcome.results[0].status).toBe('correct');
    expect(outcome.coinsEarned).toBeGreaterThan(0);
    expect(profile.daily.todayCorrect).toBe(1);
    expect(profile.learned['tr>en']).toContain(s.cw.words[0].entryId);
    // Çözülmeyen kelimeler tekrar listesine eklenir.
    expect(profile.review).toHaveLength(n - 1);
    expect(outcome.addedToReview).toBe(n - 1);
  });
});
