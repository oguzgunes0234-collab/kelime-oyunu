import { initialAdaptive, recordRound, roundQuality, type AdaptiveState } from './adaptive';
import { initialCampaign, type CampaignState } from './campaign';
import { initialDaily, recordCorrect, rollDay, type DailyState } from './daily';
import { COINS_CLEAN_BONUS, COINS_PER_CHARGE, COINS_PER_CORRECT, DAILY_GOAL_REWARD, INITIAL_INVENTORY } from './economy';
import { directionKey } from './pack';
import { wasHelped, type RoundState } from './round';
import { scoreRound, type ScoreBreakdown } from './scoring';
import type { Difficulty, DifficultyMode, Direction, Inventory, Question, ToolId } from './types';

/** Oyuncunun tarayıcıda saklanan tüm verisi. Hesap yok; yalnızca bu cihaz. */

export type ThemeSetting = 'auto' | 'light' | 'dark';

export interface Settings {
  direction: Direction;
  difficultyMode: DifficultyMode;
  dailyGoal: number;
  theme: ThemeSetting;
}

export type ReviewReason = 'wrong' | 'skipped' | 'helped';

export interface ReviewItem {
  entryId: string;
  /** Yön anahtarı, ör. "tr>en". */
  dir: string;
  reason: ReviewReason;
  addedAt: number;
  misses: number;
}

export interface Profile {
  version: 1;
  settings: Settings;
  tutorialDone: boolean;
  /**
   * Bulmaca eğitiminde (T1–T5) kaç adım bitti; atlanınca adım sayısına eşitlenir.
   * Eski kayıtlarda yoktur; 0 ile tamamlanır, yani mevcut oyuncular da eğitimi
   * bir kez görür (atlayabilir).
   */
  puzzleTutorialStep: number;
  /** Ana oyun ilerlemesi (bölümler). Eski kayıtlarda yoktur; bkz. storage.ts aktarım kuralı. */
  campaign: CampaignState;
  inventory: Inventory;
  coins: number;
  totalScore: number;
  adaptive: AdaptiveState;
  daily: DailyState;
  review: ReviewItem[];
  /** Yön anahtarı → en az bir kez doğru bilinen girdiler. */
  learned: Record<string, string[]>;
  stats: { rounds: number; correct: number };
}

export function defaultProfile(now: Date): Profile {
  return {
    version: 1,
    settings: { direction: { source: 'tr', target: 'en' }, difficultyMode: 'adaptive', dailyGoal: 10, theme: 'auto' },
    tutorialDone: false,
    puzzleTutorialStep: 0,
    campaign: initialCampaign(),
    inventory: { ...INITIAL_INVENTORY },
    coins: 0,
    totalScore: 0,
    adaptive: initialAdaptive('easy'),
    daily: initialDaily(now, 10),
    review: [],
    learned: {},
    stats: { rounds: 0, correct: 0 },
  };
}

export type SessionMode = 'normal' | 'review' | 'tutorial';

export interface RoundOutcome {
  status: RoundState['status'];
  score: ScoreBreakdown;
  coinsEarned: number;
  helped: boolean;
  addedToReview: ReviewReason | null;
  removedFromReview: boolean;
  goalReached: boolean;
  usedRestDay: boolean;
  levelChange: 'up' | 'down' | null;
  difficultyAfter: Difficulty | null;
}

function reviewIndex(profile: Profile, dir: string, entryId: string): number {
  return profile.review.findIndex((r) => r.dir === dir && r.entryId === entryId);
}

/** Bir kelimenin sonucu: harf taşı turundan ya da bulmacadaki bir kelimeden. */
export interface WordOutcomeInput {
  question: Question;
  status: RoundState['status'];
  helped: boolean;
  wrongAttempts: number;
  score: ScoreBreakdown;
}

/**
 * Biten bir turun sonucunu profile işler. Saf işlevdir: yeni profil ve
 * arayüzün göstereceği özet döner. Eğitim turu profili değiştirmez.
 */
export function applyRound(
  profile: Profile,
  round: RoundState,
  ctx: { mode: SessionMode; adaptive: boolean },
  now: Date,
): { profile: Profile; outcome: RoundOutcome } {
  return applyWord(
    profile,
    { question: round.question, status: round.status, helped: wasHelped(round), wrongAttempts: round.wrongAttempts, score: scoreRound(round) },
    ctx,
    now,
  );
}

/** Tek bir kelimenin sonucunu profile işler (jeton, günlük hedef, tekrar listesi, uyarlamalı zorluk). */
export function applyWord(
  profile: Profile,
  word: WordOutcomeInput,
  ctx: { mode: SessionMode; adaptive: boolean },
  now: Date,
): { profile: Profile; outcome: RoundOutcome } {
  const { helped, score } = word;
  const outcome: RoundOutcome = {
    status: word.status,
    score,
    coinsEarned: 0,
    helped,
    addedToReview: null,
    removedFromReview: false,
    goalReached: false,
    usedRestDay: false,
    levelChange: null,
    difficultyAfter: null,
  };
  if (ctx.mode === 'tutorial' || word.status === 'playing') return { profile, outcome };

  const dir = directionKey({ source: word.question.source, target: word.question.target });
  const id = word.question.entryId;
  let p: Profile = { ...profile, daily: rollDay(profile.daily, now) };
  const correct = word.status === 'correct';
  const clean = correct && !helped && word.wrongAttempts === 0;

  p.stats = { rounds: p.stats.rounds + 1, correct: p.stats.correct + (correct ? 1 : 0) };
  p.totalScore += score.total;

  if (correct) {
    outcome.coinsEarned = COINS_PER_CORRECT + (clean ? COINS_CLEAN_BONUS : 0);
    const learned = p.learned[dir] ?? [];
    if (!learned.includes(id)) p.learned = { ...p.learned, [dir]: [...learned, id] };
    // Günlük hedef artık bulmaca tamamlamaktır (bkz. applyPuzzle); kelime yalnızca sayılır.
    p.daily = recordCorrect(p.daily, now);
    p.coins += outcome.coinsEarned;
  }

  // Tekrar listesi
  const idx = reviewIndex(p, dir, id);
  const reason: ReviewReason | null = word.status === 'failed' ? 'wrong' : word.status === 'skipped' ? 'skipped' : helped ? 'helped' : null;
  if (reason) {
    const review = p.review.slice();
    if (idx >= 0) {
      const prev = review[idx];
      review[idx] = { ...prev, reason: reason === 'helped' ? prev.reason : reason, misses: prev.misses + 1 };
    } else {
      review.push({ entryId: id, dir, reason, addedAt: now.getTime(), misses: 1 });
    }
    p.review = review;
    outcome.addedToReview = reason;
  } else if (clean && idx >= 0) {
    p.review = p.review.filter((_, i) => i !== idx);
    outcome.removedFromReview = true;
  }

  if (ctx.adaptive && ctx.mode === 'normal') {
    const res = recordRound(p.adaptive, roundQuality(correct ? 'correct' : word.status === 'failed' ? 'failed' : 'skipped', helped, word.wrongAttempts));
    p.adaptive = res.state;
    outcome.levelChange = res.change;
    outcome.difficultyAfter = res.state.difficulty;
  }

  return { profile: p, outcome };
}

/** Günlük hedef ödülü (günde bir kez): jeton ve her araçtan hediye hak. Miktarlar economy.ts'de. */
export function grantDailyReward(profile: Profile): Profile {
  const inventory = { ...profile.inventory };
  (Object.keys(DAILY_GOAL_REWARD.tools) as ToolId[]).forEach((t) => (inventory[t] += DAILY_GOAL_REWARD.tools[t]));
  return { ...profile, coins: profile.coins + DAILY_GOAL_REWARD.coins, inventory };
}

export function consumeCharge(profile: Profile, tool: ToolId): Profile {
  return { ...profile, inventory: { ...profile.inventory, [tool]: Math.max(0, profile.inventory[tool] - 1) } };
}

export function buyChargeWithCoins(profile: Profile, tool: ToolId): Profile | null {
  if (profile.coins < COINS_PER_CHARGE) return null;
  return {
    ...profile,
    coins: profile.coins - COINS_PER_CHARGE,
    inventory: { ...profile.inventory, [tool]: profile.inventory[tool] + 1 },
  };
}

export function removeReview(profile: Profile, dir: string, entryId: string): Profile {
  return { ...profile, review: profile.review.filter((r) => !(r.dir === dir && r.entryId === entryId)) };
}
