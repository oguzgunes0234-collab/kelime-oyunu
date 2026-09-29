import { validatePack } from '../core/pack';
import type { WordPack } from '../core/types';
import trEn from './pack-tr-en.json';

/**
 * Kelime paketleri. Yeni bir paket ya da dil eklemek için aynı biçimde bir
 * JSON dosyası ekleyip buraya kaydetmek yeterli.
 */
export const PACK: WordPack = trEn as WordPack;

if (import.meta.env.DEV) {
  const problems = validatePack(PACK);
  if (problems.length) console.warn('Kelime paketinde sorunlar:', problems);
}
