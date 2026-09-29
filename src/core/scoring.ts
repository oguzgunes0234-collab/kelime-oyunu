import { MEANING_HINT_COST, TOOL_POINT_COST, WRONG_ATTEMPT_COST } from './economy';
import { answerLetters, type RoundState } from './round';
import type { Cefr } from './types';

export const LEVEL_BASE: Record<Cefr, number> = { A1: 10, A2: 14, B1: 18, B2: 22 };
export const FIRST_TRY_BONUS = 5;
/** Doğru cevap, ne kadar yardım alınırsa alınsın en az bu kadar puan getirir. */
export const MIN_CORRECT_SCORE = 2;

export interface ScoreLine {
  label: string;
  points: number;
}

export interface ScoreBreakdown {
  lines: ScoreLine[];
  total: number;
}

export function scoreRound(state: RoundState): ScoreBreakdown {
  if (state.status !== 'correct') return { lines: [], total: 0 };
  const lines: ScoreLine[] = [];
  lines.push({ label: `Kelime (${state.question.level})`, points: LEVEL_BASE[state.question.level] });
  const extraLetters = Math.max(0, answerLetters(state).length - 4);
  if (extraLetters > 0) lines.push({ label: 'Uzun kelime', points: extraLetters });
  if (state.wrongAttempts === 0) lines.push({ label: 'İlk denemede', points: FIRST_TRY_BONUS });
  else lines.push({ label: `${state.wrongAttempts} yanlış deneme`, points: -WRONG_ATTEMPT_COST * state.wrongAttempts });
  if (state.used.magnet > 0) lines.push({ label: `Mıknatıs ×${state.used.magnet}`, points: -TOOL_POINT_COST.magnet * state.used.magnet });
  if (state.meaningHintShown) lines.push({ label: 'Anlam ipucu', points: -MEANING_HINT_COST });
  if (state.letterHints > 0) lines.push({ label: `Harf ipucu ×${state.letterHints}`, points: -TOOL_POINT_COST.hint * state.letterHints });
  const raw = lines.reduce((sum, l) => sum + l.points, 0);
  return { lines, total: Math.max(MIN_CORRECT_SCORE, raw) };
}
