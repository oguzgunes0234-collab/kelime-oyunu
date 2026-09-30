import { directionKey, entriesFor, toQuestion } from './pack';
import type { Profile, ReviewItem } from './profile';
import { pick, type Rng } from './rng';
import type { Cefr, Difficulty, Direction, Entry, Question, WordPack } from './types';

/** Tekrar listesindeki bir kelimenin normal oyunda araya girme olasılığı. */
export const REVIEW_MIX_CHANCE = 0.25;

export interface PickOptions {
  direction: Direction;
  difficulty: Difficulty;
  /** Bu oturumda zaten sorulanlar. */
  exclude: Set<string>;
  /** Havuz tükendiğinde oyuncu isterse bilinen kelimeler de sorulur. */
  allowRepeats: boolean;
  rng?: Rng;
}

/**
 * Sıradaki kelimeyi seçer. Öncelik: (ara sıra) tekrar listesi → hiç doğru
 * bilinmemiş kelimeler → (izin verildiyse) bilinenler. Seçilecek bir şey
 * yoksa `null` döner: arayüz "kelime havuzu tükendi" durumunu gösterir.
 */
export function pickEntry(pack: WordPack, profile: Profile, opts: PickOptions): Entry | null {
  const rng = opts.rng ?? Math.random;
  const dir = directionKey(opts.direction);
  const pool = entriesFor(pack, opts.difficulty).filter((e) => !opts.exclude.has(e.id));
  if (pool.length === 0) return null;
  const learned = new Set(profile.learned[dir] ?? []);
  const inReview = new Set(profile.review.filter((r) => r.dir === dir).map((r) => r.entryId));

  const review = pool.filter((e) => inReview.has(e.id));
  if (review.length > 0 && rng() < REVIEW_MIX_CHANCE) return pick(review, rng);

  const fresh = pool.filter((e) => !learned.has(e.id) && !inReview.has(e.id));
  if (fresh.length > 0) return pick(fresh, rng);
  if (review.length > 0) return pick(review, rng);
  return opts.allowRepeats ? pick(pool, rng) : null;
}

/** Havuzda henüz doğru bilinmemiş kaç kelime kaldı? */
export function remainingFresh(pack: WordPack, profile: Profile, direction: Direction, difficulty: Difficulty): number {
  const learned = new Set(profile.learned[directionKey(direction)] ?? []);
  return entriesFor(pack, difficulty).filter((e) => !learned.has(e.id)).length;
}

const LEVEL_DIFFICULTY: Record<Cefr, Difficulty> = { A1: 'easy', A2: 'easy', B1: 'medium', B2: 'hard', C1: 'expert' };

export function difficultyForLevel(level: Cefr): Difficulty {
  return LEVEL_DIFFICULTY[level];
}

export function parseDirKey(key: string): Direction {
  const [source, target] = key.split('>');
  return { source, target };
}

/** Tekrar listesindeki öğeyi soruya çevirir (paket değiştiyse null). */
export function reviewQuestion(pack: WordPack, item: ReviewItem): Question | null {
  const entry = pack.entries.find((e) => e.id === item.entryId);
  return entry ? toQuestion(entry, parseDirKey(item.dir)) : null;
}

