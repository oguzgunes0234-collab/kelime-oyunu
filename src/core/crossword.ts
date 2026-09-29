import { languageInfo } from './languages';
import { lettersOf } from './normalize';
import { shuffle, type Rng } from './rng';
import type { Entry, LangCode } from './types';

/**
 * Çengel bulmaca üretici. İpucu kareleri ızgaranın içindedir; her ipucunun oku
 * cevabın hangi kareden başlayıp hangi yöne gittiğini gösterir:
 *
 *   right       ipucu solda, cevap sağa gider        [İpucu →][A][B][C]
 *   down        ipucu üstte, cevap aşağı gider
 *   down-right  ipucu üstte, cevap bir alttan başlayıp sağa gider (↳)
 *   right-down  ipucu solda, cevap bir sağdan başlayıp aşağı gider (↴)
 *
 * Kural: yatay ya da dikey, iki ve daha uzun her harf dizisi tam olarak bir
 * cevaptır. Böylece yan yana gelen harfler istemeden anlamsız kelime oluşturmaz.
 */

export type WordDir = 'across' | 'down';
export type Arrow = 'right' | 'down' | 'down-right' | 'right-down';

export interface CwWord {
  entryId: string;
  /** Hedef dilde, normalleştirilmiş (küçük) harfler. */
  letters: string[];
  /** Cevabın yazılışı (ör. "rüzgar"). */
  answer: string;
  /** İpucu: kaynak dildeki kelime. */
  clue: string;
  dir: WordDir;
  row: number;
  col: number;
  clueRow: number;
  clueCol: number;
  arrow: Arrow;
}

export interface Crossword {
  rows: number;
  cols: number;
  words: CwWord[];
}

export interface Candidate {
  entryId: string;
  letters: string[];
  answer: string;
  clue: string;
}

/**
 * Bir kareye en fazla kaç ipucu sığar. Kitaplarda iki ipucu üst/alt yarıya
 * yazılır; telefonda yazı okunmayacak kadar küçülür. Tek ipucuyla bulmaca
 * başına ortalama kelime sayısı yalnızca ~11,5'ten ~11,1'e iner (ölçüldü).
 */
export const MAX_CLUES_PER_CELL = 1;
export const GRID_ROWS = 9;
export const GRID_COLS = 8;

type Cell = { kind: 'letter'; ch: string; across: boolean; down: boolean } | { kind: 'clue'; count: number } | null;

const STEP: Record<WordDir, [number, number]> = { across: [0, 1], down: [1, 0] };

/** Cevabın her karesinin konumu. */
export function wordCells(w: Pick<CwWord, 'row' | 'col' | 'dir' | 'letters'>): [number, number][] {
  const [dr, dc] = STEP[w.dir];
  return w.letters.map((_, i) => [w.row + dr * i, w.col + dc * i]);
}

/** Okun türüne göre ipucu karesinin konumu. */
export function clueFor(row: number, col: number, arrow: Arrow): [number, number] {
  if (arrow === 'right' || arrow === 'right-down') return [row, col - 1];
  return [row - 1, col];
}

const ARROWS: Record<WordDir, Arrow[]> = { across: ['right', 'down-right'], down: ['down', 'right-down'] };

/**
 * Bir kelimenin bulmacada kullanılabilecek cevabı: ana cevap ya da klavyede
 * yazılabilen bir alternatif (ör. "rüzgâr" yerine "rüzgar"), tek kelime.
 */
export function crosswordAnswer(entry: Entry, target: LangCode, maxLen: number): { answer: string; letters: string[] } | null {
  const t = entry.terms[target];
  if (!t) return null;
  const alphabet = new Set(Array.from(languageInfo(target).alphabet));
  for (const a of [t.text, ...(t.alternatives ?? [])]) {
    const letters = lettersOf(a, target);
    if (letters.length >= 2 && letters.length <= maxLen && letters.every((l) => alphabet.has(l))) return { answer: a, letters };
  }
  return null;
}

class Grid {
  cells: Cell[][];
  words: CwWord[] = [];
  constructor(
    readonly rows: number,
    readonly cols: number,
  ) {
    this.cells = Array.from({ length: rows }, () => Array<Cell>(cols).fill(null));
  }
  inside(r: number, c: number) {
    return r >= 0 && c >= 0 && r < this.rows && c < this.cols;
  }
  at(r: number, c: number): Cell {
    return this.inside(r, c) ? this.cells[r][c] : null;
  }
  isLetter(r: number, c: number) {
    return this.at(r, c)?.kind === 'letter';
  }

  /** Yerleştirme geçerliyse kesişme sayısını, değilse -1 döner. */
  check(cand: Candidate, dir: WordDir, row: number, col: number, arrow: Arrow, first: boolean): number {
    const [dr, dc] = STEP[dir];
    const len = cand.letters.length;
    const endR = row + dr * (len - 1);
    const endC = col + dc * (len - 1);
    if (!this.inside(row, col) || !this.inside(endR, endC)) return -1;
    // Cevabın hemen önü ve arkası harf olamaz; yoksa dizi uzar.
    if (this.isLetter(row - dr, col - dc) || this.isLetter(endR + dr, endC + dc)) return -1;
    const [cr, cc] = clueFor(row, col, arrow);
    if (!this.inside(cr, cc)) return -1;
    const clueCell = this.cells[cr][cc];
    if (clueCell && (clueCell.kind !== 'clue' || clueCell.count >= MAX_CLUES_PER_CELL)) return -1;

    let crossings = 0;
    for (let i = 0; i < len; i++) {
      const r = row + dr * i;
      const c = col + dc * i;
      const cell = this.cells[r][c];
      if (cell) {
        if (cell.kind !== 'letter' || cell.ch !== cand.letters[i] || cell[dir]) return -1;
        crossings++;
      } else {
        // Yeni harfin yanında (kelimeye dik yönde) harf olmamalı.
        if (this.isLetter(r - dc, c - dr) || this.isLetter(r + dc, c + dr)) return -1;
      }
    }
    if (crossings === len) return -1;
    if (!first && crossings === 0) return -1;
    return crossings;
  }

  place(cand: Candidate, dir: WordDir, row: number, col: number, arrow: Arrow) {
    const [dr, dc] = STEP[dir];
    cand.letters.forEach((ch, i) => {
      const r = row + dr * i;
      const c = col + dc * i;
      const cell = this.cells[r][c];
      if (cell?.kind === 'letter') cell[dir] = true;
      else this.cells[r][c] = { kind: 'letter', ch, across: dir === 'across', down: dir === 'down' };
    });
    const [cr, cc] = clueFor(row, col, arrow);
    const clueCell = this.cells[cr][cc];
    if (clueCell?.kind === 'clue') clueCell.count++;
    else this.cells[cr][cc] = { kind: 'clue', count: 1 };
    this.words.push({ ...cand, dir, row, col, clueRow: cr, clueCol: cc, arrow });
  }
}

interface Placement {
  dir: WordDir;
  row: number;
  col: number;
  arrow: Arrow;
  crossings: number;
}

function placementsFor(grid: Grid, cand: Candidate): Placement[] {
  const out: Placement[] = [];
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.cells[r][c];
      if (cell?.kind !== 'letter') continue;
      cand.letters.forEach((ch, i) => {
        if (ch !== cell.ch) return;
        for (const dir of ['across', 'down'] as WordDir[]) {
          if (cell[dir]) continue;
          const [dr, dc] = STEP[dir];
          const row = r - dr * i;
          const col = c - dc * i;
          for (const arrow of ARROWS[dir]) {
            const crossings = grid.check(cand, dir, row, col, arrow, false);
            if (crossings > 0) out.push({ dir, row, col, arrow, crossings });
          }
        }
      });
    }
  }
  return out;
}

function attempt(cands: Candidate[], rows: number, cols: number, maxWords: number, rng: Rng): Grid {
  const grid = new Grid(rows, cols);
  const pool = cands.slice();
  // İlk kelime: orta uzunlukta, yatay, sol kenardaki ipucuyla.
  const firstIdx = pool.findIndex((c) => c.letters.length >= 4 && c.letters.length <= cols - 2);
  if (firstIdx < 0) return grid;
  const [first] = pool.splice(firstIdx, 1);
  const row = 1 + Math.floor(rng() * (rows - 2));
  const col = 1 + Math.floor(rng() * (cols - first.letters.length));
  grid.place(first, 'across', row, col, 'right');

  const usedAnswers = new Set([first.letters.join('')]);
  let progress = true;
  while (progress && grid.words.length < maxWords) {
    progress = false;
    for (let i = 0; i < pool.length && grid.words.length < maxWords; i++) {
      const cand = pool[i];
      if (usedAnswers.has(cand.letters.join(''))) continue;
      const options = placementsFor(grid, cand);
      if (options.length === 0) continue;
      // Çok kesişen yerleşim tercih edilir; eşitlikte rastgele.
      const best = Math.max(...options.map((o) => o.crossings));
      const top = options.filter((o) => o.crossings === best);
      const p = top[Math.floor(rng() * top.length)];
      grid.place(cand, p.dir, p.row, p.col, p.arrow);
      usedAnswers.add(cand.letters.join(''));
      pool.splice(i, 1);
      i--;
      progress = true;
    }
  }
  return grid;
}

function gridScore(g: Grid): number {
  let letters = 0;
  let crossings = 0;
  for (const row of g.cells)
    for (const cell of row)
      if (cell?.kind === 'letter') {
        letters++;
        if (cell.across && cell.down) crossings++;
      }
  return g.words.length * 100 + crossings * 10 + letters;
}

export interface BuildOptions {
  rows?: number;
  cols?: number;
  maxWords?: number;
  attempts?: number;
  rng?: Rng;
}

/**
 * Adaylardan bulmaca kurar. Adayların sırası önceliktir (önce tekrar
 * listesindekiler, sonra yeni kelimeler); her denemede öncelik grupları
 * korunarak hafifçe karıştırılır ve en iyi ızgara seçilir.
 */
export function buildCrossword(groups: Candidate[][], opts: BuildOptions = {}): Crossword {
  const rows = opts.rows ?? GRID_ROWS;
  const cols = opts.cols ?? GRID_COLS;
  const maxWords = opts.maxWords ?? 12;
  const attempts = opts.attempts ?? 24;
  const rng = opts.rng ?? Math.random;
  let best: Grid | null = null;
  let bestScore = -1;
  for (let a = 0; a < attempts; a++) {
    const ordered = groups.flatMap((g) => shuffle(g, rng));
    const g = attempt(ordered, rows, cols, maxWords, rng);
    const s = gridScore(g);
    if (s > bestScore) {
      best = g;
      bestScore = s;
    }
  }
  return { rows, cols, words: best?.words ?? [] };
}

/**
 * Bulmacanın kurallara uyduğunu denetler (testler için). Sorunları döner.
 */
export function validateCrossword(cw: Crossword): string[] {
  const problems: string[] = [];
  const letters = new Map<string, string>();
  const clues = new Map<string, number>();
  const key = (r: number, c: number) => `${r},${c}`;
  for (const w of cw.words) {
    const [cr, cc] = clueFor(w.row, w.col, w.arrow);
    if (cr !== w.clueRow || cc !== w.clueCol) problems.push(`${w.answer}: ipucu yeri okla uyuşmuyor`);
    if (cr < 0 || cc < 0 || cr >= cw.rows || cc >= cw.cols) problems.push(`${w.answer}: ipucu ızgara dışında`);
    clues.set(key(cr, cc), (clues.get(key(cr, cc)) ?? 0) + 1);
    wordCells(w).forEach(([r, c], i) => {
      if (r < 0 || c < 0 || r >= cw.rows || c >= cw.cols) problems.push(`${w.answer}: ızgara dışında`);
      const k = key(r, c);
      const prev = letters.get(k);
      if (prev && prev !== w.letters[i]) problems.push(`${w.answer}: ${k} karesinde harf çakışması`);
      letters.set(k, w.letters[i]);
    });
  }
  for (const [k, n] of clues) {
    if (letters.has(k)) problems.push(`${k}: hem ipucu hem harf`);
    if (n > MAX_CLUES_PER_CELL) problems.push(`${k}: çok fazla ipucu`);
  }
  // Her iki+ harflik dizi tam bir cevap olmalı.
  const starts = new Set(cw.words.map((w) => `${w.dir}:${w.row},${w.col}:${w.letters.length}`));
  for (const dir of ['across', 'down'] as WordDir[]) {
    const outer = dir === 'across' ? cw.rows : cw.cols;
    const inner = dir === 'across' ? cw.cols : cw.rows;
    for (let o = 0; o < outer; o++) {
      let runStart = -1;
      for (let i = 0; i <= inner; i++) {
        const r = dir === 'across' ? o : i;
        const c = dir === 'across' ? i : o;
        const has = i < inner && letters.has(key(r, c));
        if (has && runStart < 0) runStart = i;
        if (!has && runStart >= 0) {
          const len = i - runStart;
          if (len >= 2) {
            const sr = dir === 'across' ? o : runStart;
            const sc = dir === 'across' ? runStart : o;
            if (!starts.has(`${dir}:${sr},${sc}:${len}`)) problems.push(`${dir} ${sr},${sc}: cevap olmayan ${len} harflik dizi`);
          }
          runStart = -1;
        }
      }
    }
  }
  // Tüm kelimeler birbirine bağlı olmalı.
  if (cw.words.length > 1) {
    const cellsOf = cw.words.map((w) => new Set(wordCells(w).map(([r, c]) => key(r, c))));
    const seen = new Set([0]);
    const queue = [0];
    while (queue.length) {
      const i = queue.pop()!;
      cellsOf.forEach((cells, j) => {
        if (seen.has(j)) return;
        for (const k of cellsOf[i]) if (cells.has(k)) {
          seen.add(j);
          queue.push(j);
          return;
        }
      });
    }
    if (seen.size !== cw.words.length) problems.push('kelimeler birbirine bağlı değil');
  }
  return problems;
}
