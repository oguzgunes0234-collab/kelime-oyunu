import { clozeFor } from './clues';
import { PRACTICE_COINS_PER_WORD } from './economy';
import { lettersOf } from './normalize';
import type { Profile } from './profile';
import type { WordResult } from './puzzle';
import type { Rng } from './rng';
import type { Direction, Entry, WordPack } from './types';

/**
 * Pekiştirme: bulmacada zorlanılan kelimeler, bulmaca biter bitmez kısa bir
 * turla tekrar edilir. İsteğe bağlıdır; atlanabilir, hiçbir şey eksiltmez.
 *
 * Her kelime için iki adım:
 * 1. Anlam seçme: kelimeyi (hedef dilde) görüp dört seçenekten kaynak dildeki
 *    anlamını bul. Çeldiriciler aynı sözcük türünden.
 * 2. Cümle tamamlama: hedef dildeki örnek cümlede boşluğa kelimeyi yaz. Örnek
 *    cümlede kelime aynen geçmiyorsa kaynak dildeki kelime sorulur.
 *
 * Cevabı göstermeden ikisini de doğru yapan kelime başına jeton verilir.
 * Tekrar listesi ve aralıklı tekrar değişmez: kelime birkaç dakika önce
 * görüldü, gerçek pekiştirme sonraki günlerde (aralıklı tekrar) olur.
 */

export const MAX_PRACTICE_WORDS = 5;

export interface PracticeItem {
  entryId: string;
  /** Kelime, hedef dilde (bulmacadaki yazılış). */
  answer: string;
  /** Yazılması gereken harfler (normalleştirilmiş). */
  letters: string[];
  /** Kaynak dildeki anlam seçenekleri, karışık. */
  choices: string[];
  correctChoice: number;
  /** Hedef dildeki örnek, cevap yerine ___; yoksa null. */
  cloze: string | null;
  /** Kaynak dildeki kelime (cümle yoksa soru, varsa yardımcı bilgi). */
  prompt: string;
  /** Kaynak dildeki örnek cümle (cümle tamamlamada anlamı destekler). */
  sourceExample?: string;
}

/** Zorlanılan kelimeler: çözülemeyen, yardımla çözülen ya da yanlış denemesi olan. */
export function practiceCandidates(results: WordResult[]): WordResult[] {
  return results.filter((r) => r.status !== 'correct' || r.helped || r.assisted || r.wrongAttempts > 0).slice(0, MAX_PRACTICE_WORDS);
}

function shuffle<T>(items: T[], rng: Rng): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Bir kaydın bütün karşılıkları (ana + kabul edilen), her iki dilde, küçük harf. */
function forms(e: Entry): Set<string> {
  const out = new Set<string>();
  for (const t of Object.values(e.terms)) for (const w of [t.text, ...(t.alternatives ?? [])]) out.add(w.toLocaleLowerCase('tr'));
  return out;
}

/**
 * Çeldiriciler: aynı sözcük türü, kesin farklı anlam; önce aynı seviyeden.
 * Doğru kelimeyle HERHANGİ bir karşılığı paylaşan kayıt çeldirici olmaz: ör.
 * true sorulurken "gerçek" (real) seçenek olursa iki doğru cevap olur. Aynı
 * Türkçe kelimeyi açıklamayla paylaşanlar ("ay": month/moon) da dışarıda kalır.
 */
function distractors(entry: Entry, pack: WordPack, lang: string, rng: Rng): string[] {
  const own = forms(entry);
  const pool = pack.entries.filter((e) => {
    if (e.id === entry.id || e.pos !== entry.pos || !e.terms[lang] || e.grammar) return false;
    for (const f of forms(e)) if (own.has(f)) return false;
    return true;
  });
  const same = shuffle(pool.filter((e) => e.level === entry.level), rng);
  const other = shuffle(pool.filter((e) => e.level !== entry.level), rng);
  const out: string[] = [];
  for (const e of [...same, ...other]) {
    const t = e.terms[lang].text;
    if (!out.some((o) => o.toLocaleLowerCase('tr') === t.toLocaleLowerCase('tr'))) out.push(t);
    if (out.length === 3) break;
  }
  return out;
}

export function buildPractice(pack: WordPack, direction: Direction, results: WordResult[], rng: Rng = Math.random): PracticeItem[] {
  const items: PracticeItem[] = [];
  for (const r of practiceCandidates(results)) {
    const entry = pack.entries.find((e) => e.id === r.question.entryId);
    if (!entry) continue;
    const src = entry.terms[direction.source];
    const meaning = src.text;
    const choices = shuffle([meaning, ...distractors(entry, pack, direction.source, rng)], rng);
    items.push({
      entryId: entry.id,
      answer: r.answer,
      letters: lettersOf(r.answer, direction.target),
      choices,
      correctChoice: choices.indexOf(meaning),
      // Pekiştirmede kaynak cümle de görünür: kısa örnek de belirsiz kalmaz.
      cloze: clozeFor(entry, direction.target, 0),
      prompt: src.context ? `${src.text} (${src.context})` : src.text,
      sourceExample: src.example,
    });
  }
  return items;
}

export interface PracticeResult {
  entryId: string;
  meaningOk: boolean;
  clozeOk: boolean;
  /** Oyuncu "Cevabı göster" dedi: öğrendi ama ödül yok. */
  revealed: boolean;
}

export function practiceMastered(r: PracticeResult): boolean {
  return r.meaningOk && r.clozeOk && !r.revealed;
}

/**
 * Pekiştirme sonucunu profile işler: yalnızca jeton ekler, hiçbir şey
 * eksiltmez. Tekrar listesine ve aralıklı tekrara dokunmaz (bkz. üstteki açıklama).
 */
export function applyPractice(profile: Profile, results: PracticeResult[]): { profile: Profile; coins: number; mastered: number } {
  const mastered = results.filter(practiceMastered).length;
  const coins = mastered * PRACTICE_COINS_PER_WORD;
  return { profile: coins ? { ...profile, coins: profile.coins + coins } : profile, coins, mastered };
}
