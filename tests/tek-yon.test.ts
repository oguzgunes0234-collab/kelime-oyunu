import { afterEach, describe, expect, it } from 'vitest';
import { defaultProfile, GAME_DIRECTION } from '../src/core/profile';
import { loadProfile, loadPuzzle, migrateReview, PUZZLE_KEY, STORAGE_KEY } from '../src/core/storage';
import { newPuzzle } from '../src/core/puzzle';
import { seededRng } from '../src/core/rng';
import type { WordPack } from '../src/core/types';
import packJson from '../src/data/pack-tr-en.json';

const pack = packJson as WordPack;

function fakeStorage() {
  const m = new Map<string, string>();
  (globalThis as Record<string, unknown>).localStorage = {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  };
  return m;
}
afterEach(() => {
  delete (globalThis as Record<string, unknown>).localStorage;
});

describe('tek yön: Türkçe ipucu, İngilizce cevap', () => {
  it('oyunun yönü sabit; ayarlarda yön yok', () => {
    expect(GAME_DIRECTION).toEqual({ source: 'tr', target: 'en' });
    expect('direction' in defaultProfile(new Date()).settings).toBe(false);
  });

  it('eski kayıttaki İngilizce→Türkçe tekrar kelimeleri silinmez, oyunun yönüne taşınır; aynı kelime tek kalır', () => {
    const out = migrateReview([
      { entryId: 'elma', dir: 'en>tr', reason: 'wrong', addedAt: 5, misses: 1 },
      { entryId: 'su', dir: 'tr>en', reason: 'helped', addedAt: 3, misses: 2 },
      { entryId: 'su', dir: 'en>tr', reason: 'wrong', addedAt: 1, misses: 1 },
    ]);
    expect(out).toEqual([
      { entryId: 'elma', dir: 'tr>en', reason: 'wrong', addedAt: 5, misses: 1 },
      { entryId: 'su', dir: 'tr>en', reason: 'helped', addedAt: 1, misses: 3 },
    ]);
  });

  it('eski kayıt yüklenince yön ve tema ayarı atılır, tekrar listesi taşınır', () => {
    const m = fakeStorage();
    const old = { ...defaultProfile(new Date()), settings: { direction: { source: 'en', target: 'tr' }, theme: 'light', sound: true }, review: [{ entryId: 'elma', dir: 'en>tr', reason: 'wrong', addedAt: 1, misses: 1 }] };
    m.set(STORAGE_KEY, JSON.stringify(old));
    const p = loadProfile(new Date());
    expect('direction' in p.settings).toBe(false);
    expect('theme' in p.settings).toBe(false);
    expect(p.review.map((r) => r.dir)).toEqual(['tr>en']);
  });

  it('İngilizce→Türkçe yönde yarım kalmış bulmaca açılmaz', () => {
    const m = fakeStorage();
    const p = defaultProfile(new Date());
    m.set(PUZZLE_KEY, JSON.stringify(newPuzzle(pack, p, { source: 'en', target: 'tr' }, 'easy', seededRng(1))));
    expect(loadPuzzle()).toBeNull();
    m.set(PUZZLE_KEY, JSON.stringify(newPuzzle(pack, p, GAME_DIRECTION, 'easy', seededRng(1))));
    expect(loadPuzzle()).not.toBeNull();
  });
});
