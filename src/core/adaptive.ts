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

const ORDER: Difficulty[] = ['easy', 'medium', 'hard'];

export interface AdaptiveState {
  difficulty: Difficulty;
  /** Son turların başarı puanları (0–1). */
  recent: number[];
  roundsSinceChange: number;
}

export function initialAdaptive(difficulty: Difficulty = 'easy'): AdaptiveState {
  return { difficulty, recent: [], roundsSinceChange: 0 };
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
): { state: AdaptiveState; change: 'up' | 'down' | null } {
  const recent = [...state.recent, quality].slice(-WINDOW);
  const roundsSinceChange = state.roundsSinceChange + 1;
  const idx = ORDER.indexOf(state.difficulty);
  if (roundsSinceChange >= MIN_ROUNDS_BEFORE_CHANGE && recent.length >= MIN_ROUNDS_BEFORE_CHANGE) {
    const avg = average(recent);
    if (avg >= UP_THRESHOLD && idx < ORDER.length - 1) {
      return { state: { difficulty: ORDER[idx + 1], recent: [], roundsSinceChange: 0 }, change: 'up' };
    }
    if (avg <= DOWN_THRESHOLD && idx > 0) {
      return { state: { difficulty: ORDER[idx - 1], recent: [], roundsSinceChange: 0 }, change: 'down' };
    }
  }
  return { state: { ...state, recent, roundsSinceChange }, change: null };
}
