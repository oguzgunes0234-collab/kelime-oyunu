import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MIN_PUZZLES_BEFORE_CHANGE, initialAdaptive, recordPuzzle } from '../src/core/adaptive';
import { validateCrossword, wordCells } from '../src/core/crossword';
import { defaultProfile } from '../src/core/profile';
import { applyPuzzle, cellsOf, finishPuzzle, isLocked, newPuzzle, puzzleFromCrossword, typeLetter, type PuzzleState } from '../src/core/puzzle';
import { seededRng } from '../src/core/rng';
import { STORAGE_KEY, loadProfile } from '../src/core/storage';
import { TUTORIAL_DIRECTION, TUTORIAL_STEPS, tutorialCrossword } from '../src/core/tutorial';
import type { WordPack } from '../src/core/types';
import packJson from '../src/data/pack-tr-en.json';

const pack = packJson as WordPack;
const day = (d: number) => new Date(2026, 8, d, 12);

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

describe('eğitim bulmacaları (T1–T5)', () => {
  const grids = TUTORIAL_STEPS.map((_, i) => tutorialCrossword(i, pack));

  it('hepsi bulmaca kurallarına uyar (validateCrossword)', () => {
    grids.forEach((cw, i) => expect(validateCrossword(cw), TUTORIAL_STEPS[i].id).toEqual([]));
  });

  it('cevaplar beklendiği gibi ve yalnızca pakette olan kelimeler', () => {
    expect(grids.map((cw) => cw.words.map((w) => w.answer.toUpperCase()))).toEqual([
      ['EYE'],
      ['CAT', 'RAIN'],
      ['SUN', 'STAR', 'DAY'],
      ['HAND', 'DOOR', 'COLD', 'BED'],
      ['FRIEND', 'FISH', 'EAT', 'DOG', 'HOT'],
    ]);
  });

  it('zorluk adım adım artar: kelime sayısı ve ızgara büyür', () => {
    const counts = grids.map((cw) => cw.words.length);
    const areas = grids.map((cw) => cw.rows * cw.cols);
    for (let i = 1; i < grids.length; i++) {
      expect(counts[i]).toBeGreaterThan(counts[i - 1]);
      expect(areas[i]).toBeGreaterThan(areas[i - 1]);
    }
    expect(Math.max(...grids.map((cw) => cw.cols))).toBeLessThanOrEqual(7);
  });

  it('her adım tek yeni beceri: kırık oklar T4’ten önce yok, T4’te ikisi de var', () => {
    const arrows = grids.map((cw) => new Set(cw.words.map((w) => w.arrow)));
    for (let i = 0; i < 3; i++) for (const a of arrows[i]) expect(['right', 'down']).toContain(a);
    expect(arrows[0]).toEqual(new Set(['right']));
    expect(arrows[3].has('down-right') && arrows[3].has('right-down')).toBe(true);
  });

  it('T2’de tek ortak kare var; T3’te iki kelime aynı kareden başlar (yön değiştirme için)', () => {
    const shared = (i: number) => {
      const seen = new Map<string, number>();
      grids[i].words.forEach((w) => wordCells(w).forEach(([r, c]) => seen.set(`${r},${c}`, (seen.get(`${r},${c}`) ?? 0) + 1)));
      return [...seen.values()].filter((n) => n > 1).length;
    };
    expect(shared(1)).toBe(1);
    const starts = grids[2].words.map((w) => `${w.row},${w.col}`);
    expect(new Set(starts).size).toBeLessThan(starts.length);
  });

  it('her adım baştan sona çözülebilir', () => {
    grids.forEach((cw) => {
      const s = solveAll(puzzleFromCrossword(cw, TUTORIAL_DIRECTION, 'easy'));
      expect(s.status).toBe('done');
      expect(s.solved.every(Boolean)).toBe(true);
    });
  });
});

describe('uyarlamalı zorluk: bulmaca başına', () => {
  const perfect = (seed: number, p = defaultProfile(day(1))) => {
    const s = solveAll(newPuzzle(pack, p, { source: 'tr', target: 'en' }, p.adaptive.difficulty, seededRng(seed)));
    return applyPuzzle(p, s, pack, true, day(1));
  };

  it('tek hatasız bulmaca seviyeyi değiştirmez (eskiden Kolay → Zor atlıyordu)', () => {
    const r = perfect(1);
    expect(r.outcome.levelChange).toBeNull();
    expect(r.profile.adaptive.difficulty).toBe('easy');
  });

  it('art arda iyi bulmacalar seviyeyi bir seferde yalnızca bir kademe yükseltir', () => {
    let p = defaultProfile(day(1));
    const levels: string[] = [];
    for (let i = 0; i < MIN_PUZZLES_BEFORE_CHANGE * 3; i++) {
      const r = perfect(10 + i, p);
      p = r.profile;
      levels.push(p.adaptive.difficulty);
    }
    // Kolay → Orta → Zor; hiçbir adımda iki kademe birden değişmez.
    const order = ['easy', 'medium', 'hard'];
    let prev = 0;
    for (const l of levels) {
      const idx = order.indexOf(l);
      expect(Math.abs(idx - prev)).toBeLessThanOrEqual(1);
      prev = idx;
    }
    expect(levels[MIN_PUZZLES_BEFORE_CHANGE - 1]).toBe('medium');
  });

  it('çözülmeyen bulmacalar seviyeyi bir kademe düşürür', () => {
    let a = initialAdaptive('medium');
    let change = null;
    for (let i = 0; i < MIN_PUZZLES_BEFORE_CHANGE; i++) ({ state: a, change } = recordPuzzle(a, 0));
    expect(change).toBe('down');
    expect(a.difficulty).toBe('easy');
  });

  it('bulmacada kelimeler hızlı turun kelime penceresine yazılmaz', () => {
    const r = perfect(3);
    expect(r.profile.adaptive.recent).toEqual([]);
    expect(r.profile.adaptive.puzzleRecent).toHaveLength(1);
  });
});

describe('günlük hedef: bulmaca tamamlamak', () => {
  it('tüm kelimeler çözülünce hedef tamamlanır ve ödül bir kez verilir', () => {
    const p = defaultProfile(day(1));
    const s = solveAll(newPuzzle(pack, p, { source: 'tr', target: 'en' }, 'easy', seededRng(5)));
    const r = applyPuzzle(p, s, pack, false, day(1));
    expect(r.outcome.goalReached).toBe(true);
    expect(r.profile.daily.todayPuzzles).toBe(1);
    expect(r.profile.daily.todayCorrect).toBe(s.cw.words.length);
    const s2 = solveAll(newPuzzle(pack, r.profile, { source: 'tr', target: 'en' }, 'easy', seededRng(6)));
    const r2 = applyPuzzle(r.profile, s2, pack, false, day(1));
    expect(r2.outcome.goalReached).toBe(false);
    expect(r2.profile.daily.todayPuzzles).toBe(2);
  });

  it('erken "Bitir" ile yarım kalan bulmaca hedefi tamamlamaz', () => {
    const p = defaultProfile(day(1));
    let s = newPuzzle(pack, p, { source: 'tr', target: 'en' }, 'easy', seededRng(8));
    const w = s.cw.words[0];
    w.letters.forEach((l, i) => (s = typeLetter({ ...s, sel: { word: 0, index: i } }, l)));
    s = finishPuzzle(s);
    const r = applyPuzzle(p, s, pack, false, day(1));
    expect(r.outcome.goalReached).toBe(false);
    expect(r.profile.daily.todayPuzzles).toBe(0);
    expect(r.profile.daily.todayCorrect).toBe(1);
  });
});

describe('eski kayıtlarla uyum', () => {
  const store = new Map<string, string>();
  beforeEach(() => {
    store.clear();
    (globalThis as { localStorage?: unknown }).localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    };
  });
  afterEach(() => {
    delete (globalThis as { localStorage?: unknown }).localStorage;
  });

  it('bu değişiklikten önceki kayıt yüklenir; yeni alanlar varsayılanla tamamlanır, eski değerler korunur', () => {
    // f1d5a4d sürümünün yazdığı biçim: puzzleTutorialStep, adaptive.puzzle*, daily.todayPuzzles yok.
    const old = {
      version: 1,
      settings: { direction: { source: 'tr', target: 'en' }, difficultyMode: 'adaptive', dailyGoal: 10, theme: 'auto' },
      tutorialDone: true,
      puzzleIntroDone: true,
      inventory: { shuffle: 5, magnet: 2, hint: 1, undo: 8 },
      coins: 40,
      totalScore: 120,
      adaptive: { difficulty: 'hard', recent: [1, 1, 1], roundsSinceChange: 3 },
      daily: { goal: 10, day: '2026-09-01', todayCorrect: 10, streak: 2, bestStreak: 2, lastGoalDay: '2026-09-01', restDays: [], goalDays: 2 },
      review: [],
      learned: { 'tr>en': ['elma'] },
      stats: { rounds: 12, correct: 10 },
    };
    store.set(STORAGE_KEY, JSON.stringify(old));
    const p = loadProfile(day(1));
    expect(p.puzzleTutorialStep).toBe(0);
    expect(p.adaptive).toMatchObject({ difficulty: 'hard', recent: [1, 1, 1], puzzleRecent: [], puzzlesSinceChange: 0 });
    expect(p.daily).toMatchObject({ todayPuzzles: 0, streak: 2, lastGoalDay: '2026-09-01' });
    expect(p.coins).toBe(40);
    // Eski kayıtla bulmaca işlenebilir.
    const s = solveAll(newPuzzle(pack, p, { source: 'tr', target: 'en' }, 'hard', seededRng(2)));
    const r = applyPuzzle(p, s, pack, true, day(1));
    expect(r.profile.adaptive.difficulty).toBe('hard');
    expect(r.outcome.goalReached).toBe(false); // bugün eski hedefle zaten tamamlanmıştı
  });
});
