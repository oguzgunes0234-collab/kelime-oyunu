import { directionKey, toQuestion } from './pack';
import type { Profile, RoundOutcome, SessionMode } from './profile';
import { createRound, type RoundState } from './round';
import { seededRng, shuffle, type Rng } from './rng';
import { difficultyForLevel, pickEntry, reviewQuestion } from './select';
import type { Difficulty, DifficultyMode, Direction, Question, WordPack } from './types';

export const SESSION_LENGTH = 10;
/** Eğitim turunda kullanılan sabit, kolay kelime. */
export const TUTORIAL_ENTRY_ID = 'elma';

export interface SessionConfig {
  mode: SessionMode;
  direction: Direction;
  difficultyMode: DifficultyMode;
}

export interface SessionRound {
  question: Question;
  outcome: RoundOutcome;
}

export interface Session {
  config: SessionConfig;
  length: number;
  /** Sorulmuş "yön:id" anahtarları — oturum içinde tekrar sorulmaz. */
  asked: string[];
  rounds: SessionRound[];
  allowRepeats: boolean;
  /** Tekrar oturumunda sırayla sorulacak öğeler. */
  queue: { dir: string; entryId: string }[];
}

export function startSession(config: SessionConfig, profile: Profile, rng: Rng = Math.random): Session {
  const queue =
    config.mode === 'review'
      ? shuffle(profile.review.map((r) => ({ dir: r.dir, entryId: r.entryId })), rng).slice(0, SESSION_LENGTH)
      : [];
  return {
    config,
    length: config.mode === 'review' ? queue.length : config.mode === 'tutorial' ? 1 : SESSION_LENGTH,
    asked: [],
    rounds: [],
    allowRepeats: false,
    queue,
  };
}

export function sessionDifficulty(session: Session, profile: Profile): Difficulty {
  const m = session.config.difficultyMode;
  return m === 'adaptive' ? profile.adaptive.difficulty : m;
}

export type NextRound = { kind: 'round'; round: RoundState } | { kind: 'exhausted' } | { kind: 'finished' };

export function nextRound(session: Session, pack: WordPack, profile: Profile, rng: Rng = Math.random): NextRound {
  if (session.rounds.length >= session.length) return { kind: 'finished' };
  const { mode, direction } = session.config;

  if (mode === 'tutorial') {
    const entry = pack.entries.find((e) => e.id === TUTORIAL_ENTRY_ID) ?? pack.entries[0];
    // Sabit tohum: eğitim her seferinde aynı görünsün.
    return { kind: 'round', round: createRound(toQuestion(entry, direction), 'easy', seededRng(7)) };
  }

  if (mode === 'review') {
    for (const item of session.queue.slice(session.rounds.length)) {
      const q = reviewQuestion(pack, { ...item, reason: 'wrong', addedAt: 0, misses: 0 });
      if (q) return { kind: 'round', round: createRound(q, difficultyForLevel(q.level), rng) };
    }
    return { kind: 'finished' };
  }

  const dirKey = directionKey(direction);
  const exclude = new Set(session.asked.filter((k) => k.startsWith(`${dirKey}:`)).map((k) => k.slice(dirKey.length + 1)));
  const difficulty = sessionDifficulty(session, profile);
  const entry = pickEntry(pack, profile, { direction, difficulty, exclude, allowRepeats: session.allowRepeats, rng });
  if (!entry) return { kind: 'exhausted' };
  return { kind: 'round', round: createRound(toQuestion(entry, direction), difficulty, rng) };
}

export function recordSessionRound(session: Session, round: RoundState, outcome: RoundOutcome): Session {
  const key = `${directionKey({ source: round.question.source, target: round.question.target })}:${round.question.entryId}`;
  return {
    ...session,
    asked: [...session.asked, key],
    rounds: [...session.rounds, { question: round.question, outcome }],
  };
}

export function sessionScore(session: Session): number {
  return session.rounds.reduce((sum, r) => sum + r.outcome.score.total, 0);
}
