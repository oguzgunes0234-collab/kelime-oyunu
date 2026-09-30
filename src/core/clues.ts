import { languageInfo } from './languages';
import type { Rng } from './rng';
import type { Direction, Entry } from './types';

/**
 * İpucu türleri. Aynı kelime her karşılaşmada aynı soruyla gelmesin diye:
 *
 * - translation: kaynak dildeki kelime ("elma")
 * - cloze: hedef dildeki örnek cümle, cevabın yeri boş ("I eat an ___ every morning.")
 * - definition: Türkçe tanım ("Ağaçta yetişen … meyve"); yalnızca Türkçe → İngilizce
 *   yönünde, çünkü tanım Türkçe ve öbür yönde cevabın diline kayar.
 *
 * Yeni kelime her zaman çeviriyle gelir (önce öğren). Tekrar edilen kelime
 * (aralıklı tekrar ya da tekrar listesi) mümkünse cümle ya da tanımla gelir:
 * kelimeyi bağlam içinde hatırlamak düz çeviriden daha kalıcıdır.
 */
export type ClueKind = 'translation' | 'cloze' | 'definition';

export const CLUE_KIND_LABEL: Record<ClueKind, string> = {
  translation: 'Çeviri',
  cloze: 'Cümle',
  definition: 'Tanım',
};

export const CLOZE_BLANK = '___';

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Hedef dildeki örnek cümlede cevabı (ya da kabul edilen bir yazımını) tam
 * kelime olarak bulup boşlukla değiştirir. Çekimli hali (ör. "eats") eşleşmez;
 * o zaman null döner ve başka ipucu türü kullanılır.
 */
export function clozeFor(entry: Entry, target: string): string | null {
  const t = entry.terms[target];
  if (!t?.example) return null;
  const locale = languageInfo(target).locale;
  const letters = '\\p{L}';
  for (const form of [t.text, ...(t.alternatives ?? [])]) {
    const re = new RegExp(`(?<![${letters}])${escapeRe(form)}(?![${letters}])`, 'iu');
    // Türkçe İ/ı için yerel küçük harfle karşılaştır; yerini asıl cümlede bul.
    const lower = t.example.toLocaleLowerCase(locale);
    const m = re.exec(lower) ?? re.exec(t.example);
    if (m) return t.example.slice(0, m.index) + CLOZE_BLANK + t.example.slice(m.index + m[0].length);
  }
  return null;
}

export function definitionFor(entry: Entry, direction: Direction): string | null {
  if (direction.source !== 'tr') return null;
  return entry.hint?.tr ?? null;
}

export interface Clue {
  kind: ClueKind;
  /** İpucu karesinde görünen kısa metin. */
  short: string;
  /** Üstteki ipucu çubuğunda görünen tam metin. */
  text: string;
}

/**
 * Kelimenin bu karşılaşmadaki ipucu. `reviewing` doğruysa (oyuncu kelimeyi
 * daha önce gördü) cümle ya da tanım tercih edilir; ikisi de varsa rastgele.
 */
export function pickClue(entry: Entry, direction: Direction, reviewing: boolean, rng: Rng = Math.random): Clue {
  const word = entry.terms[direction.source].text;
  const translation: Clue = { kind: 'translation', short: word, text: word };
  if (!reviewing) return translation;
  const options: Clue[] = [];
  const cloze = clozeFor(entry, direction.target);
  if (cloze) options.push({ kind: 'cloze', short: CLUE_KIND_LABEL.cloze, text: cloze });
  const def = definitionFor(entry, direction);
  if (def) options.push({ kind: 'definition', short: CLUE_KIND_LABEL.definition, text: def });
  if (options.length === 0) return translation;
  return options[Math.floor(rng() * options.length)];
}
