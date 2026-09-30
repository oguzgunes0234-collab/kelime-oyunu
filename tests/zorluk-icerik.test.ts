import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DIFFICULTY_ORDER, MIN_PUZZLES_BEFORE_CHANGE, initialAdaptive, recordPuzzle } from '../src/core/adaptive';
import { chapterMaxDifficulty } from '../src/core/campaign';
import { buildCrossword } from '../src/core/crossword';
import { DIFFICULTY_LEVELS, entriesFor, validatePack } from '../src/core/pack';
import { defaultProfile } from '../src/core/profile';
import { puzzleCandidates } from '../src/core/puzzle';
import { seededRng } from '../src/core/rng';
import type { Direction, WordPack } from '../src/core/types';
import packJson from '../src/data/pack-tr-en.json';

const pack = packJson as WordPack;
const TR_EN: Direction = { source: 'tr', target: 'en' };

function climb(max: Parameters<typeof recordPuzzle>[2], puzzles: number, quality: number) {
  let s = initialAdaptive('easy');
  for (let i = 0; i < puzzles; i++) s = recordPuzzle(s, quality, max).state;
  return s.difficulty;
}

describe('uzman zorluğu ve bölüm tavanı', () => {
  it('zorluk dört basamaklı; Uzman B2–C1 kelimeleriyle eşleşir', () => {
    expect(DIFFICULTY_ORDER).toEqual(['easy', 'medium', 'hard', 'expert']);
    expect(DIFFICULTY_LEVELS.expert).toEqual(['B2', 'C1']);
  });

  it('bölüm tavanı: 1–2 Orta, 3–5 Zor, 6+ Uzman', () => {
    expect([1, 2, 3, 5, 6, 20].map(chapterMaxDifficulty)).toEqual(['medium', 'medium', 'hard', 'hard', 'expert', 'expert']);
  });

  it('iyi oynayan tavana kadar birer basamak yükselir, tavanı aşmaz', () => {
    const many = MIN_PUZZLES_BEFORE_CHANGE * 10;
    expect(climb('medium', many, 1)).toBe('medium');
    expect(climb('hard', many, 1)).toBe('hard');
    expect(climb('expert', many, 1)).toBe('expert');
  });

  it('zorlanan oyuncu tavandan bağımsız olarak bir basamak düşer', () => {
    let s = initialAdaptive('expert');
    let change = null;
    for (let i = 0; i < MIN_PUZZLES_BEFORE_CHANGE; i++) ({ state: s, change } = recordPuzzle(s, 0, 'expert'));
    expect(change).toBe('down');
    expect(s.difficulty).toBe('hard');
  });

  it('Uzman seviyesinde bulmaca kurulabilecek kadar B2/C1 kelime var', () => {
    expect(entriesFor(pack, 'expert').length).toBeGreaterThanOrEqual(40);
    const cw = buildCrossword(puzzleCandidates(pack, defaultProfile(new Date()), TR_EN, 'expert'), { rng: seededRng(2) });
    expect(cw.words.length).toBeGreaterThanOrEqual(7);
  });
});

describe('çakışan Türkçe karşılıklar', () => {
  it('aynı Türkçe kelimeyi kullanan kayıtların hepsinde farklı ayırt edici açıklama var', () => {
    const byTr = new Map<string, typeof pack.entries>();
    for (const e of pack.entries) {
      const k = e.terms.tr.text.toLocaleLowerCase('tr');
      byTr.set(k, [...(byTr.get(k) ?? []), e]);
    }
    for (const [tr, list] of byTr) {
      if (list.length < 2) continue;
      const ctx = list.map((e) => e.terms.tr.context);
      expect(ctx.every(Boolean), `${tr}: ${list.map((e) => e.terms.en.text)}`).toBe(true);
      expect(new Set(ctx).size, `${tr}: açıklamalar aynı`).toBe(list.length);
    }
  });

  it('bir bulmacada aynı görünen ipucu iki kez yer almaz', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const cw = buildCrossword(puzzleCandidates(pack, defaultProfile(new Date()), TR_EN, 'easy'), { rng: seededRng(seed) });
      const clues = cw.words.map((w) => w.clue);
      expect(new Set(clues).size, `#${seed}`).toBe(clues.length);
    }
  }, 20_000);
});

describe('geçmiş zaman kayıtları', () => {
  const past = pack.entries.filter((e) => e.grammar);
  it('her kayıtta temel hâl, açıklama, bağlam ve örnekler var', () => {
    for (const e of past) {
      expect(e.grammar!.form).toBe('past');
      expect(e.grammar!.base.en && e.grammar!.base.tr, e.id).toBeTruthy();
      expect(e.grammar!.note).toContain(e.terms.en.text);
      expect(e.terms.tr.context).toContain('geçmiş zaman');
      expect(e.terms.en.context).toContain(e.grammar!.base.en);
      expect(e.terms.en.example?.toLowerCase()).toMatch(new RegExp(`\\b${e.terms.en.text}\\b`));
      expect(e.topic).toBe('dilbilgisi');
    }
  });
  it('taslak dosyasındaki her fiil kaydı eksiksiz (oyuna girmeden önce)', () => {
    const lines = readFileSync(new URL('../taslak/grup-07.txt', import.meta.url), 'utf8').split(/\r?\n/).filter(Boolean);
    expect(lines.length).toBeGreaterThanOrEqual(60);
    const trSeen = new Map<string, string>();
    for (const l of lines) {
      const [en, tr, , pos, , topic, exEn, exTr, hint, , , base, note] = l.split('|');
      expect(pos, en).toBe('verb');
      expect(topic, en).toBe('dilbilgisi');
      expect(base, en).toMatch(/^[a-z]+\/[\p{L} ]+$/u);
      expect(note, en).toBe(`Düzensiz fiil: ${base.split('/')[0]} → ${en}`);
      expect(exEn.toLowerCase(), en).toMatch(new RegExp(`\\b${en}\\b`));
      expect(exTr, en).toBeTruthy();
      const words = hint.toLocaleLowerCase('tr').split(/[^\p{L}]+/u);
      expect(words.includes(tr) || words.includes(en), `${en}: tanım cevabı içeriyor`).toBe(false);
      // Aynı Türkçe biçim (ör. "aldı": took / bought) ancak farklı temel hâlle.
      if (trSeen.has(tr)) expect(trSeen.get(tr), tr).not.toBe(base.split('/')[1]);
      trSeen.set(tr, base.split('/')[1]);
    }
  });

  it('paket doğrulamasından geçer', () => {
    expect(validatePack(pack)).toEqual([]);
  });
});
