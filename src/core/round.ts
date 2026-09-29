import { isAccepted, lettersOf } from './normalize';
import { shuffle, type Rng } from './rng';
import { buildTiles, scrambledOrder, type Tile } from './tiles';
import type { Difficulty, Question, ToolId } from './types';

/** Bu kadar yanlış tam deneme sonrası tur kaybedilir (doğru cevap öğretilir). */
export const MAX_WRONG_ATTEMPTS = 3;

export type RoundStatus = 'playing' | 'correct' | 'failed' | 'skipped';

/** Arayüzün kısa geri bildirim göstermesi için son olay. `seq` her olayda artar. */
export type RoundEvent =
  | { kind: 'placed' }
  | { kind: 'wrong'; attemptsLeft: number }
  | { kind: 'correct' }
  | { kind: 'failed' }
  | { kind: 'shuffle' }
  | { kind: 'undo' }
  | { kind: 'clear' }
  | { kind: 'magnet'; letter: string; removedWrong: number }
  | { kind: 'hint-meaning'; text: string }
  | { kind: 'hint-letter'; letter: string; position: number; wrongFrom: number | null };

export interface RoundState {
  question: Question;
  difficulty: Difficulty;
  tiles: Tile[];
  /** Tüm taşların ekrandaki sırası. Yerleştirilen taşın yeri boş kalır; düzen zıplamaz. */
  order: number[];
  /** Cevap alanındaki taşlar, sırasıyla. */
  placed: number[];
  wrongAttempts: number;
  used: Record<ToolId, number>;
  meaningHintShown: boolean;
  letterHints: number;
  /** İpucunun işaret ettiği taş. */
  highlight: number | null;
  status: RoundStatus;
  event: RoundEvent | null;
  seq: number;
}

export function createRound(question: Question, difficulty: Difficulty, rng: Rng = Math.random): RoundState {
  const tiles = buildTiles(question.answer, question.target, difficulty, rng);
  return {
    question,
    difficulty,
    tiles,
    order: scrambledOrder(tiles, rng),
    placed: [],
    wrongAttempts: 0,
    used: { shuffle: 0, magnet: 0, hint: 0, undo: 0 },
    meaningHintShown: false,
    letterHints: 0,
    highlight: null,
    status: 'playing',
    event: null,
    seq: 0,
  };
}

export function answerLetters(state: RoundState): string[] {
  return lettersOf(state.question.answer, state.question.target);
}

export function slotCount(state: RoundState): number {
  return answerLetters(state).length;
}

export function placedWord(state: RoundState): string {
  return state.placed.map((id) => state.tiles[id].letter).join('');
}

export function isPlaced(state: RoundState, tileId: number): boolean {
  return state.placed.includes(tileId);
}

/** Cevap alanında baştan itibaren doğru olan harf sayısı. */
export function correctPrefix(state: RoundState): number {
  const target = answerLetters(state);
  let n = 0;
  while (n < state.placed.length && state.tiles[state.placed[n]].letter === target[n]) n++;
  return n;
}

/** Oyuncunun yardım aldığı tur mu? (Karıştır ve geri al yardım sayılmaz.) */
export function wasHelped(state: RoundState): boolean {
  return state.used.magnet > 0 || state.used.hint > 0;
}

function withEvent(state: RoundState, event: RoundEvent): RoundState {
  return { ...state, event, seq: state.seq + 1 };
}

function evaluateIfFull(state: RoundState): RoundState {
  if (state.placed.length < slotCount(state)) return state;
  const word = placedWord(state);
  if (isAccepted(word, state.question.accepted, state.question.target)) {
    return withEvent({ ...state, status: 'correct', highlight: null }, { kind: 'correct' });
  }
  const wrongAttempts = state.wrongAttempts + 1;
  if (wrongAttempts >= MAX_WRONG_ATTEMPTS) {
    return withEvent({ ...state, wrongAttempts, status: 'failed', highlight: null }, { kind: 'failed' });
  }
  return withEvent({ ...state, wrongAttempts }, { kind: 'wrong', attemptsLeft: MAX_WRONG_ATTEMPTS - wrongAttempts });
}

export function placeTile(state: RoundState, tileId: number): RoundState {
  if (state.status !== 'playing') return state;
  if (isPlaced(state, tileId) || !state.tiles[tileId]) return state;
  if (state.placed.length >= slotCount(state)) return state;
  const next: RoundState = {
    ...state,
    placed: [...state.placed, tileId],
    highlight: state.highlight === tileId ? null : state.highlight,
  };
  return evaluateIfFull(withEvent(next, { kind: 'placed' }));
}

/** Klavyeden yazılan harfe uyan ilk boştaki taşı yerleştirir. */
export function placeLetter(state: RoundState, letter: string): RoundState {
  const free = state.order.filter((id) => !isPlaced(state, id) && state.tiles[id].letter === letter);
  if (free.length === 0) return state;
  // İpucuyla işaretlenmiş taş varsa ve aynı harfse onu tercih et.
  const chosen = free.includes(state.highlight ?? -1) ? (state.highlight as number) : free[0];
  return placeTile(state, chosen);
}

/** Cevap alanını tamamen boşaltır. Ücretsizdir, hak harcamaz. */
export function clearAnswer(state: RoundState): RoundState {
  if (state.status !== 'playing' || state.placed.length === 0) return state;
  return withEvent({ ...state, placed: [] }, { kind: 'clear' });
}

export function skipRound(state: RoundState): RoundState {
  if (state.status !== 'playing') return state;
  return { ...state, status: 'skipped', highlight: null, event: null, seq: state.seq + 1 };
}

/** Aracın şu an bir işe yarayıp yaramayacağı. Yaramıyorsa hak harcanmaz. */
export function canUseTool(state: RoundState, tool: ToolId): boolean {
  if (state.status !== 'playing') return false;
  const free = state.order.filter((id) => !isPlaced(state, id));
  switch (tool) {
    case 'shuffle':
      return free.length > 1;
    case 'undo':
      return state.placed.length > 0;
    case 'magnet':
    case 'hint':
      return correctPrefix(state) < slotCount(state);
  }
}

/**
 * Aracı uygular. Hak düşme işi çağıranındır (envanter profil verisidir);
 * bu işlev yalnızca `applied` true dönerse hak düşülmesi gerektiğini söyler.
 */
export function applyTool(state: RoundState, tool: ToolId, rng: Rng = Math.random): { state: RoundState; applied: boolean } {
  if (!canUseTool(state, tool)) return { state, applied: false };
  const used = { ...state.used, [tool]: state.used[tool] + 1 };
  switch (tool) {
    case 'shuffle': {
      const freePositions: number[] = [];
      const freeIds: number[] = [];
      state.order.forEach((id, pos) => {
        if (!isPlaced(state, id)) {
          freePositions.push(pos);
          freeIds.push(id);
        }
      });
      let mixed = shuffle(freeIds, rng);
      for (let i = 0; i < 4 && mixed.every((id, k) => id === freeIds[k]); i++) mixed = shuffle(freeIds, rng);
      const order = state.order.slice();
      freePositions.forEach((pos, k) => (order[pos] = mixed[k]));
      return { state: withEvent({ ...state, order, used }, { kind: 'shuffle' }), applied: true };
    }
    case 'undo': {
      const placed = state.placed.slice(0, -1);
      return { state: withEvent({ ...state, placed, used }, { kind: 'undo' }), applied: true };
    }
    case 'magnet': {
      const prefix = correctPrefix(state);
      const removedWrong = state.placed.length - prefix;
      const base: RoundState = { ...state, placed: state.placed.slice(0, prefix), used };
      const needed = answerLetters(state)[prefix];
      const candidates = base.order.filter((id) => !base.placed.includes(id) && base.tiles[id].letter === needed);
      // Gerçek cevap taşını şaşırtmaca taşına tercih et.
      const tileId = candidates.find((id) => !base.tiles[id].decoy) ?? candidates[0];
      const placed = [...base.placed, tileId];
      const next = withEvent(
        { ...base, placed, highlight: base.highlight === tileId ? null : base.highlight },
        { kind: 'magnet', letter: needed, removedWrong },
      );
      return { state: evaluateIfFull(next), applied: true };
    }
    case 'hint': {
      const { meaningHint } = state.question;
      if (!state.meaningHintShown && meaningHint) {
        return {
          state: withEvent({ ...state, used, meaningHintShown: true }, { kind: 'hint-meaning', text: meaningHint }),
          applied: true,
        };
      }
      const prefix = correctPrefix(state);
      const position = prefix;
      const needed = answerLetters(state)[position];
      const wrongFrom = prefix < state.placed.length ? prefix : null;
      const highlight =
        state.order.find((id) => !isPlaced(state, id) && state.tiles[id].letter === needed && !state.tiles[id].decoy) ??
        state.order.find((id) => !isPlaced(state, id) && state.tiles[id].letter === needed) ??
        null;
      return {
        state: withEvent(
          { ...state, used, letterHints: state.letterHints + 1, highlight },
          { kind: 'hint-letter', letter: needed, position, wrongFrom },
        ),
        applied: true,
      };
    }
  }
}
