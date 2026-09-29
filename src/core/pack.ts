import { normalizeAnswer } from './normalize';
import type { Cefr, Difficulty, Direction, Entry, LangCode, Question, WordPack } from './types';

/** Zorluk ↔ yaklaşık CEFR eşlemesi. Komşu seviyeler kasıtlı olarak örtüşür. */
export const DIFFICULTY_LEVELS: Record<Difficulty, Cefr[]> = {
  easy: ['A1', 'A2'],
  medium: ['A2', 'B1'],
  hard: ['B1', 'B2'],
};

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: 'Kolay',
  medium: 'Orta',
  hard: 'Zor',
};

export const DIFFICULTY_CEFR_LABEL: Record<Difficulty, string> = {
  easy: '≈ A1–A2',
  medium: '≈ A2–B1',
  hard: '≈ B1–B2',
};

export const POS_LABEL: Record<string, string> = {
  noun: 'isim',
  verb: 'fiil',
  adjective: 'sıfat',
  adverb: 'zarf',
};

/** Harf taşlarıyla kurulabilecek ana cevap: yalnızca harfler, boşluksuz. */
const TILEABLE = /^\p{L}+$/u;

/**
 * Paketi yükleme anında denetler. Hatalı bir girdi oyunu çökertmek yerine
 * atlanır ve geliştirici konsolunda raporlanır; testler aynı işlevi kullanarak
 * paketin tamamen temiz olduğunu doğrular.
 */
export function validatePack(pack: WordPack): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  for (const e of pack.entries) {
    const where = `"${e.id}"`;
    if (ids.has(e.id)) problems.push(`${where}: yinelenen id`);
    ids.add(e.id);
    for (const lang of pack.languages) {
      const t = e.terms[lang];
      if (!t) {
        problems.push(`${where}: ${lang} karşılığı yok`);
        continue;
      }
      if (!TILEABLE.test(t.text)) problems.push(`${where}: ${lang} ana cevabı tek kelime ve yalnızca harf olmalı`);
      if (Array.from(t.text).length > 10) problems.push(`${where}: ${lang} ana cevabı 10 harfi geçmemeli`);
      const all = [t.text, ...(t.alternatives ?? [])].map((a) => normalizeAnswer(a, lang));
      if (new Set(all).size !== all.length) problems.push(`${where}: ${lang} alternatifleri yineleniyor`);
    }
  }
  return problems;
}

export function toQuestion(entry: Entry, direction: Direction, uiLang: LangCode = 'tr'): Question {
  const src = entry.terms[direction.source];
  const tgt = entry.terms[direction.target];
  return {
    entryId: entry.id,
    source: direction.source,
    target: direction.target,
    prompt: src.text,
    promptContext: src.context,
    answer: tgt.text,
    accepted: [tgt.text, ...(tgt.alternatives ?? [])],
    pos: entry.pos,
    level: entry.level,
    topic: entry.topic,
    sourceExample: src.example,
    targetExample: tgt.example,
    meaningHint: entry.hint?.[uiLang],
  };
}

export function directionKey(d: Direction): string {
  return `${d.source}>${d.target}`;
}

export function entriesFor(pack: WordPack, difficulty: Difficulty): Entry[] {
  const levels = DIFFICULTY_LEVELS[difficulty];
  return pack.entries.filter((e) => levels.includes(e.level));
}
