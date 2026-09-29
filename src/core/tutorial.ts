import { clueFor, crosswordAnswer, type Arrow, type Crossword, type CwWord, type WordDir } from './crossword';
import type { Direction, WordPack } from './types';

/**
 * Bulmaca eğitimi (T1–T5): elle yazılmış küçük bulmacalar. Üretici 6×6'dan
 * küçük ızgara kuramıyor ve ok türünü seçemiyor (ölçüldü); eğitimin her
 * adımda tek bir yeni beceri öğretmesi için ızgaralar burada sabit.
 *
 * Kurallar testte `validateCrossword` ile denetlenir. Yalnızca mevcut paketteki
 * kelimeler kullanılır; yön her zaman Türkçe ipucu → İngilizce cevap.
 */

export const TUTORIAL_DIRECTION: Direction = { source: 'tr', target: 'en' };

export type TutorialSkill = 'basics' | 'crossing' | 'switch' | 'bent' | 'tools';

interface WordSpec {
  entryId: string;
  dir: WordDir;
  row: number;
  col: number;
  arrow: Arrow;
}

export interface TutorialStep {
  /** Ör. "T1". */
  id: string;
  skill: TutorialSkill;
  /** Tamamlanınca gösterilen kısa başlık ("Ok yönü" gibi). */
  title: string;
  rows: number;
  cols: number;
  words: WordSpec[];
  /** Açılışta seçili kelime (dizin). */
  startWord: number;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'T1',
    skill: 'basics',
    title: 'İpucu ve ok',
    rows: 1,
    cols: 4,
    // [göz →][E][Y][E]
    words: [{ entryId: 'goz', dir: 'across', row: 0, col: 1, arrow: 'right' }],
    startWord: 0,
  },
  {
    id: 'T2',
    skill: 'crossing',
    title: 'Ortak kare',
    rows: 5,
    cols: 4,
    // KEDİ → CAT yatay, YAĞMUR ↓ RAIN dikey; A harfi ortak.
    words: [
      { entryId: 'kedi', dir: 'across', row: 2, col: 1, arrow: 'right' },
      { entryId: 'yagmur', dir: 'down', row: 1, col: 2, arrow: 'down' },
    ],
    startWord: 0,
  },
  {
    id: 'T3',
    skill: 'switch',
    title: 'Yön değiştirme',
    rows: 5,
    cols: 5,
    // GÜNEŞ → SUN ile YILDIZ ↓ STAR aynı kareden (S) başlar; GÜN → DAY, STAR'ın A'sını keser.
    words: [
      { entryId: 'gunes', dir: 'across', row: 1, col: 2, arrow: 'right' },
      { entryId: 'yildiz', dir: 'down', row: 1, col: 2, arrow: 'down' },
      { entryId: 'gun', dir: 'across', row: 3, col: 1, arrow: 'right' },
    ],
    startWord: 0,
  },
  {
    id: 'T4',
    skill: 'bent',
    title: 'Kırık oklar',
    rows: 5,
    cols: 6,
    // EL ↳ HAND (ipucunun altından sağa), YATAK ↴ BED (ipucunun yanından aşağı),
    // KAPI ↓ DOOR, SOĞUK → COLD.
    words: [
      { entryId: 'el', dir: 'across', row: 1, col: 0, arrow: 'down-right' },
      { entryId: 'kapi', dir: 'down', row: 1, col: 3, arrow: 'down' },
      { entryId: 'soguk', dir: 'across', row: 3, col: 2, arrow: 'right' },
      { entryId: 'yatak', dir: 'down', row: 1, col: 5, arrow: 'right-down' },
    ],
    startWord: 0,
  },
  {
    id: 'T5',
    skill: 'tools',
    title: 'Anlam ve Harf aç',
    rows: 5,
    cols: 7,
    // ARKADAŞ → FRIEND; BALIK ↓ FISH, YEMEK ↓ EAT, KÖPEK ↓ DOG; SICAK → HOT.
    words: [
      { entryId: 'arkadas', dir: 'across', row: 1, col: 1, arrow: 'right' },
      { entryId: 'balik', dir: 'down', row: 1, col: 1, arrow: 'down' },
      { entryId: 'yemek', dir: 'down', row: 1, col: 4, arrow: 'down' },
      { entryId: 'kopek', dir: 'down', row: 1, col: 6, arrow: 'down' },
      { entryId: 'sicak', dir: 'across', row: 4, col: 1, arrow: 'right' },
    ],
    startWord: 0,
  },
];

export const TUTORIAL_LENGTH = TUTORIAL_STEPS.length;

/** Eğitim adımının ızgarası. Pakette olmayan kelime varsa hata fırlatır (test yakalar). */
export function tutorialCrossword(step: number, pack: WordPack): Crossword {
  const spec = TUTORIAL_STEPS[step];
  const { source, target } = TUTORIAL_DIRECTION;
  const words: CwWord[] = spec.words.map((w) => {
    const entry = pack.entries.find((e) => e.id === w.entryId);
    if (!entry) throw new Error(`Eğitim kelimesi pakette yok: ${w.entryId}`);
    const a = crosswordAnswer(entry, target, 99);
    if (!a) throw new Error(`Eğitim kelimesinin cevabı yazılamıyor: ${w.entryId}`);
    const [clueRow, clueCol] = clueFor(w.row, w.col, w.arrow);
    return {
      entryId: w.entryId,
      letters: a.letters,
      answer: a.answer,
      clue: entry.terms[source].text,
      dir: w.dir,
      row: w.row,
      col: w.col,
      clueRow,
      clueCol,
      arrow: w.arrow,
    };
  });
  return { rows: spec.rows, cols: spec.cols, words };
}
