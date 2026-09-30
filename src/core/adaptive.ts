import type { Difficulty } from './types';

/**
 * Uyarlamalı zorluk. Tek bir cevaba göre değil, son turların ortalamasına göre
 * karar verir; değişiklikten sonra yeni seviyede yeterince tur oynanmadan
 * tekrar değiştirmez (gidip gelmeyi önler).
 */

export const WINDOW = 6;
export const MIN_ROUNDS_BEFORE_CHANGE = 5;
export const UP_THRESHOLD = 0.8;
export const DOWN_THRESHOLD = 0.4;

/** Kolay → Orta → Zor → Uzman. Yükselme ve düşme her seferinde bir basamak. */
export const DIFFICULTY_ORDER: Difficulty[] = ['easy', 'medium', 'hard', 'expert'];
const ORDER = DIFFICULTY_ORDER;

/** Tavan: bölüm ilerledikçe açılan en yüksek basamak (bkz. campaign.ts). */
function topIndex(max: Difficulty): number {
  return ORDER.indexOf(max);
}

/**
 * Bulmacada karar birimi tek kelime değil, biten bulmacadır. Eskiden her kelime
 * ayrı tur sayılıyordu; 10 kelimelik tek bir bulmaca seviyeyi iki kademe
 * birden (Kolay → Zor) değiştirebiliyordu.
 */
export const PUZZLE_WINDOW = 3;
export const MIN_PUZZLES_BEFORE_CHANGE = 2;

export interface AdaptiveState {
  difficulty: Difficulty;
  /** Hızlı turun son sonuçları (0–1), kelime başına. */
  recent: number[];
  roundsSinceChange: number;
  /**
   * Son bulmacaların başarısı (0–1), bulmaca başına. Eski kayıtlarda yoktur;
   * yüklenirken varsayılan (boş) değerle tamamlanır.
   */
  puzzleRecent: number[];
  puzzlesSinceChange: number;
}

export function initialAdaptive(difficulty: Difficulty = 'easy'): AdaptiveState {
  return { difficulty, recent: [], roundsSinceChange: 0, puzzleRecent: [], puzzlesSinceChange: 0 };
}

/** Seviye değişince iki pencere de sıfırlanır: yeni seviyede baştan ölçülür. */
function changed(difficulty: Difficulty): AdaptiveState {
  return initialAdaptive(difficulty);
}

/** Tur kalitesi: yardımsız ilk denemede doğru 1; yardımla ya da yanlış denemeyle doğru daha az; pas/yanlış 0. */
export function roundQuality(outcome: 'correct' | 'failed' | 'skipped', helped: boolean, wrongAttempts: number): number {
  if (outcome !== 'correct') return 0;
  let q = 1;
  if (helped) q -= 0.4;
  q -= Math.min(0.3, wrongAttempts * 0.15);
  return Math.max(0.2, q);
}

export function average(values: number[]): number {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

export function recordRound(
  state: AdaptiveState,
  quality: number,
  max: Difficulty = 'expert',
): { state: AdaptiveState; change: 'up' | 'down' | null } {
  const recent = [...state.recent, quality].slice(-WINDOW);
  const roundsSinceChange = state.roundsSinceChange + 1;
  const idx = ORDER.indexOf(state.difficulty);
  if (roundsSinceChange >= MIN_ROUNDS_BEFORE_CHANGE && recent.length >= MIN_ROUNDS_BEFORE_CHANGE) {
    const avg = average(recent);
    if (avg >= UP_THRESHOLD && idx < topIndex(max)) return { state: changed(ORDER[idx + 1]), change: 'up' };
    if (avg <= DOWN_THRESHOLD && idx > 0) return { state: changed(ORDER[idx - 1]), change: 'down' };
  }
  return { state: { ...state, recent, roundsSinceChange }, change: null };
}

/**
 * Biten bir bulmacayı kaydeder. Tek çağrıda seviye en fazla bir kademe değişir
 * ve en az MIN_PUZZLES_BEFORE_CHANGE bulmaca görülmeden değişmez. `max`
 * (bölüm tavanı) üstüne çıkmaz; düşme her zaman serbesttir: zorlanan oyuncu
 * bir basamak aşağıda pekiştirir.
 */
export function recordPuzzle(
  state: AdaptiveState,
  quality: number,
  max: Difficulty = 'expert',
): { state: AdaptiveState; change: 'up' | 'down' | null } {
  const puzzleRecent = [...(state.puzzleRecent ?? []), quality].slice(-PUZZLE_WINDOW);
  const puzzlesSinceChange = (state.puzzlesSinceChange ?? 0) + 1;
  const idx = ORDER.indexOf(state.difficulty);
  if (puzzlesSinceChange >= MIN_PUZZLES_BEFORE_CHANGE && puzzleRecent.length >= MIN_PUZZLES_BEFORE_CHANGE) {
    const avg = average(puzzleRecent);
    if (avg >= UP_THRESHOLD && idx < topIndex(max)) return { state: changed(ORDER[idx + 1]), change: 'up' };
    if (avg <= DOWN_THRESHOLD && idx > 0) return { state: changed(ORDER[idx - 1]), change: 'down' };
  }
  return { state: { ...state, puzzleRecent, puzzlesSinceChange }, change: null };
}
