import { buildCrossword, crosswordAnswer, GRID_COLS, GRID_ROWS, wordCells, type Candidate, type Crossword } from './crossword';
import { directionKey, entriesFor, toQuestion } from './pack';
import { average, recordPuzzle, roundQuality } from './adaptive';
import { chapterInfo, chapterMaxDifficulty, initialCampaign, recordCampaignPuzzle } from './campaign';
import { pickClue } from './clues';
import { isDue } from './srs';
import { recordPuzzleDone } from './daily';
import { DAILY_GOAL_REWARD } from './economy';
import { applyWord, grantDailyReward, type Profile } from './profile';
import type { Rng } from './rng';
import { scoreWord, type ScoreBreakdown } from './scoring';
import type { Difficulty, Direction, Question, WordPack } from './types';

/**
 * Tek bir çengel bulmacanın durumu. Saf işlevlerle değişir (reducer gibi);
 * arayüz yalnızca sonucu çizer. Harfler normalleştirilmiş küçük harftir.
 */

export type PuzzleEvent =
  | { kind: 'solved'; word: number }
  | { kind: 'wrong'; word: number }
  | { kind: 'reveal'; word: number }
  | { kind: 'meaning'; word: number }
  | { kind: 'synonym'; word: number }
  | { kind: 'sentence'; word: number }
  | { kind: 'complete' };

export interface PuzzleState {
  cw: Crossword;
  direction: Direction;
  difficulty: Difficulty;
  /** "satır,sütun" → oyuncunun yazdığı harf. */
  fill: Record<string, string>;
  /** Harf aç ile açılan kareler. */
  revealed: string[];
  solved: boolean[];
  /** Kelime tamamen dolup yanlış çıktığı sayısı. */
  wrong: number[];
  /** Kelimede Harf aç ile açılan harf sayısı. */
  lettersRevealed: number[];
  meaningShown: boolean[];
  /**
   * Eş anlamlı ve Cümle jokerleri gösterildi mi (kelime başına). Eski
   * kayıtlarda yoktur; yoksa hiçbiri gösterilmemiş sayılır.
   */
  synonymShown?: boolean[];
  sentenceShown?: boolean[];
  sel: { word: number; index: number };
  status: 'playing' | 'done';
  /** Her değişiklikte artar; arayüz olayları buna göre bir kez gösterir. */
  seq: number;
  event: PuzzleEvent | null;
  /**
   * Konu modu kimliği (ör. "saglik"); ana kampanya bulmacasında yok. Konu
   * bulmacası bölüm ilerlemesini ve uyarlamalı zorluğu değiştirmez.
   */
  topic?: string;
}

export const cellKey = (r: number, c: number) => `${r},${c}`;

/**
 * Bulmacada kullanılacak adaylar, öncelik sırasıyla gruplanmış:
 *
 *   0 tekrar listesi (yanlış / pas / yardımla bilinen)
 *   1 aralıklı tekrarda zamanı gelen bilinen kelimeler
 *   2 yeni kelimeler
 *   3 zamanı gelmemiş bilinen kelimeler (ızgarayı doldurmak için)
 *   4 seviye dışı kelimeler (yalnızca dolgu)
 *
 * Daha önce görülen kelime mümkünse cümle ya da tanım ipucuyla gelir (bkz.
 * core/clues.ts). `only` verilirse (konu modu) yalnızca o kelimeler kullanılır:
 * seviye süzgeci ve seviye dışı dolgu yoktur.
 */
export function puzzleCandidates(
  pack: WordPack,
  profile: Profile,
  direction: Direction,
  difficulty: Difficulty,
  only?: Set<string>,
  now: Date = new Date(),
  rng: Rng = Math.random,
): Candidate[][] {
  const dir = directionKey(direction);
  const learned = new Set(profile.learned[dir] ?? []);
  const review = new Set(profile.review.filter((r) => r.dir === dir).map((r) => r.entryId));
  const maxLen = Math.max(GRID_ROWS, GRID_COLS) - 1;
  const inLevel = only ?? new Set(entriesFor(pack, difficulty).map((e) => e.id));
  const groups: Candidate[][] = [[], [], [], [], []];
  for (const entry of pack.entries) {
    if (only && !only.has(entry.id)) continue;
    const a = crosswordAnswer(entry, direction.target, maxLen);
    const src = entry.terms[direction.source];
    if (!a || !src) continue;
    const known = learned.has(entry.id) || review.has(entry.id);
    const g = !inLevel.has(entry.id)
      ? 4
      : review.has(entry.id)
        ? 0
        : learned.has(entry.id)
          ? isDue(profile.srs, dir, entry.id, true, now)
            ? 1
            : 3
          : 2;
    const clue = pickClue(entry, direction, known, rng);
    const cand: Candidate = { entryId: entry.id, letters: a.letters, answer: a.answer, clue: src.text };
    if (clue.kind !== 'translation') {
      cand.clueKind = clue.kind;
      cand.clueText = clue.text;
    }
    groups[g].push(cand);
  }
  return groups;
}

/**
 * Bir bulmacada en fazla bu kadar cümle/tanım ipucu olur; kalanlar çeviriyle
 * gelir. İpucu karesinde yalnızca "Cümle" / "Tanım" yazar ve metin üstteki
 * çubukta okunur; hepsi böyle olursa ızgara bir bakışta okunamaz.
 */
export const MAX_CONTEXT_CLUES = 3;

export function capContextClues(cw: Crossword, max: number, rng: Rng = Math.random): Crossword {
  const ctx = cw.words.map((w, i) => (w.clueKind && w.clueKind !== 'translation' ? i : -1)).filter((i) => i >= 0);
  if (ctx.length <= max) return cw;
  for (let i = ctx.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [ctx[i], ctx[j]] = [ctx[j], ctx[i]];
  }
  const drop = new Set(ctx.slice(max));
  return {
    ...cw,
    words: cw.words.map((w, i) => {
      if (!drop.has(i)) return w;
      const { clueKind: _k, clueText: _t, ...rest } = w;
      return rest;
    }),
  };
}

export function newPuzzle(
  pack: WordPack,
  profile: Profile,
  direction: Direction,
  difficulty: Difficulty,
  rng?: Rng,
  size?: { rows: number; cols: number },
  topic?: { id: string; entryIds: Set<string> },
): PuzzleState {
  const cw = capContextClues(
    buildCrossword(puzzleCandidates(pack, profile, direction, difficulty, topic?.entryIds, new Date(), rng), {
      rng,
      ...size,
    }),
    MAX_CONTEXT_CLUES,
    rng,
  );
  const s = puzzleFromCrossword(cw, direction, difficulty);
  return topic ? { ...s, topic: topic.id } : s;
}

/** Hazır bir ızgaradan (ör. elle yazılmış eğitim bulmacası) oyun durumu kurar. */
export function puzzleFromCrossword(cw: Crossword, direction: Direction, difficulty: Difficulty): PuzzleState {
  const n = cw.words.length;
  const base: PuzzleState = {
    cw,
    direction,
    difficulty,
    fill: {},
    revealed: [],
    solved: Array(n).fill(false),
    wrong: Array(n).fill(0),
    lettersRevealed: Array(n).fill(0),
    meaningShown: Array(n).fill(false),
    synonymShown: Array(n).fill(false),
    sentenceShown: Array(n).fill(false),
    sel: { word: 0, index: 0 },
    status: 'playing',
    seq: 0,
    event: null,
  };
  return base;
}

export function cellsOf(state: PuzzleState, word: number): [number, number][] {
  return wordCells(state.cw.words[word]);
}

/** Bir karedeki harf karesini içeren kelimeler. */
export function wordsAt(state: PuzzleState, r: number, c: number): number[] {
  const out: number[] = [];
  state.cw.words.forEach((w, i) => {
    if (wordCells(w).some(([wr, wc]) => wr === r && wc === c)) out.push(i);
  });
  return out;
}

export function isLocked(state: PuzzleState, r: number, c: number): boolean {
  return wordsAt(state, r, c).some((w) => state.solved[w]);
}

function correctLetter(state: PuzzleState, r: number, c: number): string {
  for (const w of state.cw.words) {
    const i = wordCells(w).findIndex(([wr, wc]) => wr === r && wc === c);
    if (i >= 0) return w.letters[i];
  }
  return '';
}

export function selectedCell(state: PuzzleState): [number, number] {
  return cellsOf(state, state.sel.word)[state.sel.index];
}

function firstOpenIndex(state: PuzzleState, word: number, from = 0): number {
  const cells = cellsOf(state, word);
  for (let k = 0; k < cells.length; k++) {
    const i = (from + k) % cells.length;
    const [r, c] = cells[i];
    if (!state.fill[cellKey(r, c)] && !isLocked(state, r, c)) return i;
  }
  for (let k = 0; k < cells.length; k++) {
    const i = (from + k) % cells.length;
    if (!isLocked(state, ...cells[i])) return i;
  }
  return 0;
}

export function selectWord(state: PuzzleState, word: number): PuzzleState {
  if (word < 0 || word >= state.cw.words.length) return state;
  return { ...state, sel: { word, index: firstOpenIndex(state, word) } };
}

/** Harf karesine dokunma. Aynı kareye tekrar dokunmak yönü değiştirir. */
export function tapCell(state: PuzzleState, r: number, c: number): PuzzleState {
  const words = wordsAt(state, r, c);
  if (words.length === 0) return state;
  const [sr, sc] = selectedCell(state);
  let word: number;
  if (sr === r && sc === c && words.length > 1) word = words.find((w) => w !== state.sel.word) ?? words[0];
  else if (words.includes(state.sel.word)) word = state.sel.word;
  else {
    const dir = state.cw.words[state.sel.word]?.dir;
    word = words.find((w) => state.cw.words[w].dir === dir) ?? words[0];
  }
  const index = cellsOf(state, word).findIndex(([wr, wc]) => wr === r && wc === c);
  return { ...state, sel: { word, index } };
}

/** İpucu karesine dokunma. İki ipuçlu karede sırayla ikisi seçilir. */
export function tapClue(state: PuzzleState, r: number, c: number): PuzzleState {
  const words = state.cw.words.map((w, i) => (w.clueRow === r && w.clueCol === c ? i : -1)).filter((i) => i >= 0);
  if (words.length === 0) return state;
  const word = words.length > 1 && words[0] === state.sel.word ? words[1] : words[0];
  return selectWord(state, word);
}

function nextUnsolved(state: PuzzleState, after: number): number {
  const n = state.cw.words.length;
  for (let k = 1; k <= n; k++) {
    const w = (after + k) % n;
    if (!state.solved[w]) return w;
  }
  return after;
}

/** Değişen karenin kelimelerini kontrol eder: dolu ve doğru → çözüldü, dolu ve yanlış → hata. */
function evaluate(state: PuzzleState, r: number, c: number, countWrong = true): PuzzleState {
  let s = state;
  let event: PuzzleEvent | null = null;
  for (const w of wordsAt(s, r, c)) {
    if (s.solved[w]) continue;
    const cells = cellsOf(s, w);
    const filled = cells.every(([wr, wc]) => s.fill[cellKey(wr, wc)]);
    if (!filled) continue;
    const right = cells.every(([wr, wc], i) => s.fill[cellKey(wr, wc)] === s.cw.words[w].letters[i]);
    if (right) {
      s = { ...s, solved: s.solved.map((v, i) => v || i === w) };
      event = { kind: 'solved', word: w };
    } else if (countWrong) {
      // Harf aç ile tamamlanan kelime oyuncunun hatası sayılmaz.
      s = { ...s, wrong: s.wrong.map((v, i) => (i === w ? v + 1 : v)) };
      if (!event) event = { kind: 'wrong', word: w };
    }
  }
  if (s.solved.every(Boolean)) return { ...s, status: 'done', event: { kind: 'complete' }, seq: s.seq + 1 };
  if (!event) return s;
  s = { ...s, event, seq: s.seq + 1 };
  // Seçili kelime çözüldüyse sıradaki çözülmemiş kelimeye geç.
  if (s.solved[s.sel.word]) s = selectWord(s, nextUnsolved(s, s.sel.word));
  return s;
}

export function typeLetter(state: PuzzleState, letter: string): PuzzleState {
  if (state.status !== 'playing') return state;
  let s = state;
  let [r, c] = selectedCell(s);
  if (isLocked(s, r, c)) {
    const cells = cellsOf(s, s.sel.word);
    const i = cells.findIndex(([wr, wc], k) => k >= s.sel.index && !isLocked(s, wr, wc));
    if (i < 0) return s;
    s = { ...s, sel: { ...s.sel, index: i } };
    [r, c] = cells[i];
  }
  s = { ...s, fill: { ...s.fill, [cellKey(r, c)]: letter }, event: null };
  const word = s.sel.word;
  const index = s.sel.index;
  s = evaluate(s, r, c);
  if (s.status !== 'playing' || s.sel.word !== word) return s;
  // İmleci kelimede ilerlet: önce sonraki boş kareye, yoksa sonraki açık kareye.
  const cells = cellsOf(s, word);
  let next = index;
  for (let i = index + 1; i < cells.length; i++) {
    if (!isLocked(s, ...cells[i])) {
      next = i;
      break;
    }
  }
  const empty = cells.findIndex(([wr, wc], i) => i > index && !s.fill[cellKey(wr, wc)] && !isLocked(s, wr, wc));
  if (empty >= 0) next = empty;
  return { ...s, sel: { word, index: next } };
}

export function backspace(state: PuzzleState): PuzzleState {
  if (state.status !== 'playing') return state;
  const cells = cellsOf(state, state.sel.word);
  const [r, c] = cells[state.sel.index];
  const k = cellKey(r, c);
  if (state.fill[k] && !isLocked(state, r, c)) {
    const fill = { ...state.fill };
    delete fill[k];
    return { ...state, fill, event: null };
  }
  for (let i = state.sel.index - 1; i >= 0; i--) {
    const [pr, pc] = cells[i];
    if (isLocked(state, pr, pc)) continue;
    const fill = { ...state.fill };
    delete fill[cellKey(pr, pc)];
    return { ...state, fill, sel: { ...state.sel, index: i }, event: null };
  }
  return state;
}

/** Seçili karenin (o doğruysa kelimedeki ilk boş/yanlış karenin) harfini açar. */
export function revealLetter(state: PuzzleState): { state: PuzzleState; applied: boolean } {
  if (state.status !== 'playing') return { state, applied: false };
  const cells = cellsOf(state, state.sel.word);
  const wrongOrEmpty = (i: number) => {
    const [r, c] = cells[i];
    return !isLocked(state, r, c) && state.fill[cellKey(r, c)] !== correctLetter(state, r, c);
  };
  let i = wrongOrEmpty(state.sel.index) ? state.sel.index : cells.findIndex((_, k) => wrongOrEmpty(k));
  if (i < 0) return { state, applied: false };
  const [r, c] = cells[i];
  const k = cellKey(r, c);
  let s: PuzzleState = {
    ...state,
    fill: { ...state.fill, [k]: correctLetter(state, r, c) },
    revealed: [...state.revealed, k],
    sel: { ...state.sel, index: i },
    // Önceki olay (ör. Anlam) taşınırsa aşağıdaki kontrol onu yeni olay sanıp imleci ilerletmiyordu.
    event: null,
  };
  const touched = wordsAt(s, r, c).filter((w) => !s.solved[w]);
  s = { ...s, lettersRevealed: s.lettersRevealed.map((v, w) => (touched.includes(w) ? v + 1 : v)) };
  const word = s.sel.word;
  const after = evaluate(s, r, c, false);
  if (after.event) return { state: after, applied: true };
  i = cells.findIndex(([wr, wc], idx) => idx > i && !after.fill[cellKey(wr, wc)]);
  return {
    state: { ...after, event: { kind: 'reveal', word }, seq: after.seq + 1, sel: { word, index: i >= 0 ? i : after.sel.index } },
    applied: true,
  };
}

export function showMeaning(state: PuzzleState, hasHint: boolean): { state: PuzzleState; applied: boolean } {
  const w = state.sel.word;
  if (state.status !== 'playing' || !hasHint || state.meaningShown[w] || state.solved[w]) return { state, applied: false };
  return {
    state: {
      ...state,
      meaningShown: state.meaningShown.map((v, i) => v || i === w),
      event: { kind: 'meaning', word: w },
      seq: state.seq + 1,
    },
    applied: true,
  };
}

/**
 * Eş anlamlı ya da Cümle jokeri: seçili kelime için bir kez gösterilir.
 * `available` false ise (ör. kayıtlı eş anlamlı yok) uygulanmaz, hak harcanmaz.
 */
export function showExtra(state: PuzzleState, kind: 'synonym' | 'sentence', available: boolean): { state: PuzzleState; applied: boolean } {
  const w = state.sel.word;
  const key = kind === 'synonym' ? 'synonymShown' : 'sentenceShown';
  const shown = state[key] ?? state.cw.words.map(() => false);
  if (state.status !== 'playing' || !available || shown[w] || state.solved[w]) return { state, applied: false };
  return {
    state: { ...state, [key]: shown.map((v, i) => v || i === w), event: { kind, word: w }, seq: state.seq + 1 },
    applied: true,
  };
}

export function extraShown(state: PuzzleState, kind: 'synonym' | 'sentence', word: number): boolean {
  return !!(kind === 'synonym' ? state.synonymShown : state.sentenceShown)?.[word];
}

/** Oyuncu bulmacayı bitirir; çözülmeyen kelimeler cevaplarıyla gösterilir. */
export function finishPuzzle(state: PuzzleState): PuzzleState {
  return state.status === 'done' ? state : { ...state, status: 'done', event: null, seq: state.seq + 1 };
}

export function solvedCount(state: PuzzleState): number {
  return state.solved.filter(Boolean).length;
}

export interface PuzzleOutcome {
  results: WordResult[];
  coinsEarned: number;
  scoreTotal: number;
  goalReached: boolean;
  usedRestDay: boolean;
  levelChange: 'up' | 'down' | null;
  difficultyAfter: Difficulty | null;
  addedToReview: number;
  removedFromReview: number;
  /** Ana kampanyada tamamlanan bulmaca sayıldı mı (konu modunda ve erken bitirmede hayır). */
  campaignCounted: boolean;
  /** Bu bulmacayla biten bölümün numarası; bölüm bitmediyse null. */
  chapterCompleted: number | null;
}

/**
 * Biten bulmacanın tüm kelimelerini sırayla profile işler. Konu modu
 * bulmacası (state.topic) bölüm ilerlemesini ve uyarlamalı zorluğu değiştirmez.
 */
export function applyPuzzle(
  profile: Profile,
  state: PuzzleState,
  pack: WordPack,
  adaptive: boolean,
  now: Date,
): { profile: Profile; outcome: PuzzleOutcome } {
  const results = wordResults(state, pack);
  const outcome: PuzzleOutcome = {
    results,
    coinsEarned: 0,
    scoreTotal: 0,
    goalReached: false,
    usedRestDay: false,
    levelChange: null,
    difficultyAfter: null,
    addedToReview: 0,
    removedFromReview: 0,
    campaignCounted: false,
    chapterCompleted: null,
  };
  const campaign = !state.topic;
  let p = profile;
  for (const r of results) {
    // Kelimeler tek tek zorluğu etkilemez; bulmaca aşağıda bir kez değerlendirilir.
    const res = applyWord(p, r, { mode: 'normal', adaptive: false }, now);
    p = res.profile;
    const o = res.outcome;
    outcome.coinsEarned += o.coinsEarned;
    outcome.scoreTotal += o.score.total;
    if (o.addedToReview) outcome.addedToReview++;
    if (o.removedFromReview) outcome.removedFromReview++;
  }

  // Tamamlandı: tüm kelimeler çözüldü (yardımla da olur). Erken "Bitir" sayılmaz.
  const completed = results.length > 0 && results.every((r) => r.status === 'correct');
  if (completed && campaign) {
    const c = recordCampaignPuzzle(p.campaign ?? initialCampaign());
    p = { ...p, campaign: c.state };
    outcome.campaignCounted = true;
    outcome.chapterCompleted = c.chapterCompleted;
  }

  // Günlük hedef: ana oyunda da konu modunda da tamamlanan bulmaca sayılır.
  if (completed) {
    const daily = recordPuzzleDone(p.daily, now);
    p = { ...p, daily: daily.state };
    outcome.goalReached = daily.goalReached;
    outcome.usedRestDay = daily.usedRestDay;
    if (daily.goalReached) {
      p = grantDailyReward(p);
      outcome.coinsEarned += DAILY_GOAL_REWARD.coins;
    }
  }

  // Uyarlamalı zorluk: bulmaca başına tek karar, en fazla bir kademe; yalnızca ana oyunda.
  if (adaptive && campaign && results.length > 0) {
    const max = chapterMaxDifficulty(chapterInfo(p.campaign ?? initialCampaign()).chapter);
    const res = recordPuzzle(p.adaptive, puzzleQuality(results), max);
    p = { ...p, adaptive: res.state };
    outcome.levelChange = res.change;
    outcome.difficultyAfter = res.change ? res.state.difficulty : null;
  }
  return { profile: p, outcome };
}

/**
 * Bulmacanın başarısı (0–1): kelimelerin kalitelerinin ortalaması. Kelime
 * kalitesi hızlı turdakiyle aynı ölçüdür (yardım ve yanlış deneme düşürür,
 * çözülmeyen kelime 0).
 */
export function puzzleQuality(results: Pick<WordResult, 'status' | 'helped' | 'wrongAttempts'>[]): number {
  if (results.length === 0) return 0;
  return average(results.map((r) => roundQuality(r.status, r.helped, r.wrongAttempts)));
}

export interface WordResult {
  word: number;
  question: Question;
  /** Bulmacadaki yazılışı (ana cevaptan farklı olabilir). */
  answer: string;
  status: 'correct' | 'failed';
  /** Cevabı açan yardım: Harf aç ya da Anlam. */
  helped: boolean;
  /** Anlamı daraltan joker: Eş anlamlı ya da Cümle (bkz. WordOutcomeInput.assisted). */
  assisted: boolean;
  wrongAttempts: number;
  score: ScoreBreakdown;
}

export function wordResults(state: PuzzleState, pack: WordPack): WordResult[] {
  const out: WordResult[] = [];
  state.cw.words.forEach((w, i) => {
    const entry = pack.entries.find((e) => e.id === w.entryId);
    if (!entry) return;
    const question = toQuestion(entry, state.direction);
    const solved = state.solved[i];
    out.push({
      word: i,
      question,
      answer: w.answer,
      status: solved ? 'correct' : 'failed',
      helped: state.lettersRevealed[i] > 0 || state.meaningShown[i],
      assisted: extraShown(state, 'synonym', i) || extraShown(state, 'sentence', i),
      wrongAttempts: state.wrong[i],
      score: scoreWord(question.level, w.letters.length, {
        solved,
        wrong: state.wrong[i],
        lettersRevealed: state.lettersRevealed[i],
        meaning: state.meaningShown[i],
        synonym: extraShown(state, 'synonym', i),
        sentence: extraShown(state, 'sentence', i),
      }),
    });
  });
  return out;
}
