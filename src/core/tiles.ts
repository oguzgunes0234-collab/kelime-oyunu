import { languageInfo } from './languages';
import { lettersOf } from './normalize';
import { shuffle, type Rng } from './rng';
import type { Difficulty, LangCode } from './types';

export interface Tile {
  id: number;
  /** Küçük harf, normalleştirilmiş. Karşılaştırmada bu kullanılır. */
  letter: string;
  /** Cevabın parçası değil, şaşırtmaca amaçlı eklenmiş harf. */
  decoy: boolean;
}

/** Zorluğa göre eklenen şaşırtmaca harf sayısı. */
export const DECOYS: Record<Difficulty, number> = { easy: 0, medium: 2, hard: 3 };

export function buildTiles(answer: string, lang: LangCode, difficulty: Difficulty, rng: Rng = Math.random): Tile[] {
  const letters = lettersOf(answer, lang);
  const alphabet = Array.from(languageInfo(lang).alphabet);
  const decoyCount = letters.length <= 2 ? Math.min(1, DECOYS[difficulty]) : DECOYS[difficulty];
  const decoys: string[] = [];
  for (let i = 0; i < decoyCount; i++) {
    decoys.push(alphabet[Math.floor(rng() * alphabet.length)]);
  }
  const tiles: Tile[] = [
    ...letters.map((letter, i) => ({ id: i, letter, decoy: false })),
    ...decoys.map((letter, i) => ({ id: letters.length + i, letter, decoy: true })),
  ];
  return tiles;
}

/**
 * Taşların görüntülenme sırası. Cevap zaten doğru sırada görünmesin diye
 * birkaç deneme yapılır (tek harfli ya da aynı harflerden oluşan kelimelerde
 * bu mümkün olmayabilir).
 */
export function scrambledOrder(tiles: Tile[], rng: Rng = Math.random): number[] {
  const ids = tiles.map((t) => t.id);
  const inOrder = tiles.filter((t) => !t.decoy).map((t) => t.letter).join('');
  let best = shuffle(ids, rng);
  for (let attempt = 0; attempt < 8; attempt++) {
    const reading = best.map((id) => tiles[id].letter).join('');
    if (!reading.startsWith(inOrder) || inOrder.length < 2) return best;
    best = shuffle(ids, rng);
  }
  return best;
}
