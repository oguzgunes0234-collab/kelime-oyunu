import { describe, expect, it } from 'vitest';
import { CHAPTER_SIZE, chapterGrid, chapterInfo, pathNodes, recordCampaignPuzzle } from '../src/core/campaign';
import { defaultProfile, type Profile } from '../src/core/profile';
import { applyPuzzle, cellsOf, finishPuzzle, isLocked, newPuzzle, typeLetter, type PuzzleState } from '../src/core/puzzle';
import { seededRng } from '../src/core/rng';
import { migrateToCampaign } from '../src/core/storage';
import { MIN_TOPIC_WORDS, TOPIC_MODES, topicEntryIds, topicStatus, topicStatuses } from '../src/core/topics';
import type { Direction, WordPack } from '../src/core/types';
import { toCase } from '../src/ui/screens/ChapterComplete';
import packJson from '../src/data/pack-tr-en.json';

const pack = packJson as WordPack;
const day = (d: number) => new Date(2026, 8, d, 12);
const TR_EN: Direction = { source: 'tr', target: 'en' };

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

function playCampaign(p: Profile, seed: number, solve = true) {
  const { chapter } = chapterInfo(p.campaign);
  let s = newPuzzle(pack, p, TR_EN, p.adaptive.difficulty, seededRng(seed), chapterGrid(chapter));
  s = solve ? solveAll(s) : finishPuzzle(s);
  return applyPuzzle(p, s, pack, true, day(1));
}

describe('bölümler', () => {
  it('bölüm ve bölüm içi ilerleme tamamlanan bulmacadan hesaplanır', () => {
    expect(chapterInfo({ puzzlesDone: 0 })).toEqual({ chapter: 1, done: 0, size: CHAPTER_SIZE });
    expect(chapterInfo({ puzzlesDone: CHAPTER_SIZE - 1 })).toMatchObject({ chapter: 1, done: CHAPTER_SIZE - 1 });
    expect(chapterInfo({ puzzlesDone: CHAPTER_SIZE })).toMatchObject({ chapter: 2, done: 0 });
    expect(recordCampaignPuzzle({ puzzlesDone: CHAPTER_SIZE - 1 }).chapterCompleted).toBe(1);
    expect(recordCampaignPuzzle({ puzzlesDone: 0 }).chapterCompleted).toBeNull();
  });

  it('bölüm yolu: bitenler, sıradaki ve kilitliler', () => {
    expect(pathNodes({ done: 0, size: 5 })).toEqual(['current', 'locked', 'locked', 'locked', 'locked']);
    expect(pathNodes({ done: 3, size: 5 })).toEqual(['done', 'done', 'done', 'current', 'locked']);
    expect(pathNodes({ done: 5, size: 5 })).toEqual(['done', 'done', 'done', 'done', 'done']);
  });

  it('Bölüm 1 küçük ızgara, sonrası normal ızgara', () => {
    expect(chapterGrid(1)).toEqual({ rows: 7, cols: 7 });
    expect(chapterGrid(2)).toEqual({ rows: 9, cols: 8 });
  });

  it('yalnızca tamamen çözülen bulmaca sayılır; erken bitirme bölümü ilerletmez', () => {
    const p = defaultProfile(day(1));
    const done = playCampaign(p, 1);
    expect(done.profile.campaign.puzzlesDone).toBe(1);
    expect(done.outcome.campaignCounted).toBe(true);
    const quit = playCampaign(p, 2, false);
    expect(quit.profile.campaign.puzzlesDone).toBe(0);
    expect(quit.outcome.campaignCounted).toBe(false);
  });

  it('bölüm ile uyarlamalı zorluk ayrıdır: her tamamlanan bulmaca tam bir kez sayılır, seviye bölümden bağımsız değişir', () => {
    let p = defaultProfile(day(1));
    let completedChapters: number[] = [];
    for (let i = 0; i < CHAPTER_SIZE * 2; i++) {
      const r = playCampaign(p, 100 + i);
      p = r.profile;
      if (r.outcome.chapterCompleted) completedChapters.push(r.outcome.chapterCompleted);
    }
    expect(p.campaign.puzzlesDone).toBe(CHAPTER_SIZE * 2);
    expect(chapterInfo(p.campaign)).toMatchObject({ chapter: 3, done: 0 });
    expect(completedChapters).toEqual([1, 2]);
    // Hatasız oyuncu için seviye yükseldi, ama bu bölüm sayısını değiştirmedi.
    expect(p.adaptive.difficulty).not.toBe('easy');
  });
});

describe('bölüm numarasına gelen ek', () => {
  it('sayının okunuşuna göre doğru ek', () => {
    const cases: [number, string][] = [
      [1, "1'e"], [2, "2'ye"], [3, "3'e"], [4, "4'e"], [5, "5'e"], [6, "6'ya"], [7, "7'ye"], [8, "8'e"], [9, "9'a"],
      [10, "10'a"], [20, "20'ye"], [30, "30'a"], [40, "40'a"], [50, "50'ye"], [60, "60'a"], [70, "70'e"], [80, "80'e"],
      [90, "90'a"], [100, "100'e"], [12, "12'ye"], [26, "26'ya"],
    ];
    for (const [n, want] of cases) expect(toCase(n)).toBe(want);
  });
});

describe('eski kaydın bölüm sistemine aktarımı', () => {
  it('elle seçilmiş seviye korunur, oyuncu Bölüm 1’den başlar, diğer veriler kalır', () => {
    const old = { ...defaultProfile(day(1)), coins: 57, settings: { ...defaultProfile(day(1)).settings, difficultyMode: 'medium' as const } };
    const m = migrateToCampaign(old);
    expect(m.settings.difficultyMode).toBe('adaptive');
    expect(m.adaptive.difficulty).toBe('medium');
    expect(chapterInfo(m.campaign)).toMatchObject({ chapter: 1, done: 0 });
    expect(m.coins).toBe(57);
  });

  it('uyarlamalı moddaki oyuncunun mevcut seviyesi olduğu gibi kalır', () => {
    const old = { ...defaultProfile(day(1)), adaptive: { ...defaultProfile(day(1)).adaptive, difficulty: 'hard' as const } };
    expect(migrateToCampaign(old).adaptive.difficulty).toBe('hard');
  });
});

describe('konu modları', () => {
  it('bir mod, paketteki konu kelimesi eşiğe ulaşınca açık görünür', () => {
    const st = topicStatuses(pack);
    expect(st).toHaveLength(9);
    for (const s of st) {
      expect(s.total).toBe(pack.entries.filter((e) => s.mode.packTopics.includes(e.topic)).length);
      expect(s.enabled).toBe(s.total >= MIN_TOPIC_WORDS);
    }
  });

  it('yalnızca iki kaynağın uyuştuğu (kişinin okumadığı) kelime gözden geçirilmiş sayılmaz', () => {
    const cross = pack.entries.filter((e) => e.check === 'crosscheck');
    expect(cross.length).toBeGreaterThan(0);
    expect(cross.every((e) => e.reviewed === false)).toBe(true);
    expect(pack.entries.filter((e) => e.check === 'human').every((e) => e.reviewed === true)).toBe(true);
  });

  it('mod, eşik kadar kelimeyle açılır; eşiğin altında kapalı kalır', () => {
    const mode = TOPIC_MODES.find((m) => m.id === 'saglik')!;
    const make = (n: number): WordPack => ({ ...pack, entries: pack.entries.map((e, i) => ({ ...e, topic: i < n ? 'sağlık' : 'x' })) });
    expect(topicStatus(mode, make(MIN_TOPIC_WORDS)).enabled).toBe(true);
    expect(topicEntryIds(mode, make(MIN_TOPIC_WORDS)).size).toBe(MIN_TOPIC_WORDS);
    expect(topicStatus(mode, make(MIN_TOPIC_WORDS - 1)).enabled).toBe(false);
  });

  it('konu bulmacası yalnızca o konunun kelimelerini kullanır; bölümü ve zorluğu değiştirmez, günlük hedefe sayılır', () => {
    const mode = TOPIC_MODES.find((m) => m.id === 'saglik')!;
    const fake: WordPack = { ...pack, entries: pack.entries.map((e, i) => ({ ...e, ...(i < 70 ? { topic: 'sağlık', reviewed: true } : {}) })) };
    const ids = topicEntryIds(mode, fake);
    const p = defaultProfile(day(1));
    const s = solveAll(newPuzzle(fake, p, TR_EN, 'easy', seededRng(4), { rows: 7, cols: 7 }, { id: mode.id, entryIds: ids }));
    expect(s.cw.words.every((w) => ids.has(w.entryId))).toBe(true);
    const r = applyPuzzle(p, s, fake, true, day(1));
    expect(r.profile.campaign.puzzlesDone).toBe(0);
    expect(r.outcome.campaignCounted).toBe(false);
    expect(r.profile.adaptive).toEqual(p.adaptive);
    expect(r.outcome.goalReached).toBe(true);
  });
});
