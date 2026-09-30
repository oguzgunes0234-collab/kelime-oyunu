import { describe, expect, it } from 'vitest';
import { CLOZE_BLANK, sentenceFor, synonymsFor } from '../src/core/clues';
import { DAILY_GOAL_REWARD, INITIAL_INVENTORY, PUZZLE_TOOL_ORDER, TOOL_POINT_COST } from '../src/core/economy';
import { defaultProfile } from '../src/core/profile';
import { extraShown, finishPuzzle, newPuzzle, showExtra, wordResults } from '../src/core/puzzle';
import { seededRng } from '../src/core/rng';
import { scoreWord } from '../src/core/scoring';
import type { Direction, Entry, WordPack } from '../src/core/types';
import packJson from '../src/data/pack-tr-en.json';

const pack = packJson as WordPack;
const TR_EN: Direction = { source: 'tr', target: 'en' };
const EN_TR: Direction = { source: 'en', target: 'tr' };
const byEn = (en: string) => pack.entries.find((e) => e.terms.en.text === en)!;

describe('Eş anlamlı jokeri', () => {
  it('goal → amaç: ızgaradaki kelime dışındaki kabul edilen karşılıklar (hedef, gaye)', () => {
    expect(synonymsFor(byEn('goal'), 'tr', 'amaç')).toEqual(['hedef', 'gaye']);
  });

  it('ızgarada alternatif yazıldıysa ana kelime eş anlamlı olarak görünür', () => {
    expect(synonymsFor(byEn('goal'), 'tr', 'hedef')).toEqual(['amaç', 'gaye']);
  });

  it('aynı kelimenin şapkalı/şapkasız yazımı eş anlamlı sayılmaz', () => {
    const e = { terms: { tr: { text: 'hâlâ', alternatives: ['hala'] } } } as unknown as Entry;
    expect(synonymsFor(e, 'tr', 'hala')).toEqual([]);
  });
});

describe('Cümle jokeri', () => {
  it('örnek cümle, cevap yerine boşlukla ve çevirisiyle', () => {
    const s = sentenceFor(byEn('apple'), TR_EN)!;
    expect(s.cloze).toBe(`I eat an ${CLOZE_BLANK} every morning.`);
    expect(s.translation).toContain('elma');
  });

  it('kısa cümleyi de kullanır (çeviri göründüğü için belirsiz değil)', () => {
    const e = { terms: { en: { text: 'round', example: 'The table is round.' }, tr: { text: 'yuvarlak', example: 'Masa yuvarlak.' } } } as unknown as Entry;
    expect(sentenceFor(e, TR_EN)).toEqual({ cloze: `The table is ${CLOZE_BLANK}.`, translation: 'Masa yuvarlak.' });
  });

  it('Türkçe cevaplı yönde Türkçe cümle ve İngilizce çeviri', () => {
    const s = sentenceFor(byEn('apple'), EN_TR)!;
    expect(s.cloze).toContain(CLOZE_BLANK);
    expect(s.translation).toContain('apple');
  });
});

describe('jokerlerin oyun kuralları', () => {
  it('bulmacada dört joker var; yeni oyuncu yeni jokerlerden de hakla başlar, günlük hedef hediye eder', () => {
    expect(PUZZLE_TOOL_ORDER).toEqual(['hint', 'sentence', 'synonym', 'magnet']);
    expect(INITIAL_INVENTORY.synonym).toBeGreaterThan(0);
    expect(INITIAL_INVENTORY.sentence).toBeGreaterThan(0);
    expect(DAILY_GOAL_REWARD.tools.synonym).toBeGreaterThan(0);
    expect(defaultProfile(new Date()).inventory.sentence).toBe(INITIAL_INVENTORY.sentence);
  });

  it('kelime başına bir kez; uygun değilse uygulanmaz; kullanılan kelime yardımlı sayılır ve puandan düşer', () => {
    const s0 = newPuzzle(pack, defaultProfile(new Date()), TR_EN, 'easy', seededRng(5));
    expect(showExtra(s0, 'synonym', false).applied).toBe(false);
    const a = showExtra(s0, 'synonym', true);
    expect(a.applied).toBe(true);
    expect(extraShown(a.state, 'synonym', s0.sel.word)).toBe(true);
    expect(showExtra(a.state, 'synonym', true).applied).toBe(false);
    const b = showExtra(a.state, 'sentence', true).state;
    const r = wordResults(finishPuzzle(b), pack).find((x) => x.word === s0.sel.word)!;
    expect(r.helped).toBe(true);

    const clean = scoreWord('A1', 5, { solved: true, wrong: 0, lettersRevealed: 0, meaning: false });
    const used = scoreWord('A1', 5, { solved: true, wrong: 0, lettersRevealed: 0, meaning: false, synonym: true, sentence: true });
    expect(clean.total - used.total).toBe(TOOL_POINT_COST.synonym + TOOL_POINT_COST.sentence);
  });

  it('eski kayıtta (joker dizileri yok) hiçbir joker gösterilmemiş sayılır', () => {
    const s0 = newPuzzle(pack, defaultProfile(new Date()), TR_EN, 'easy', seededRng(5));
    const old = { ...s0, synonymShown: undefined, sentenceShown: undefined };
    expect(extraShown(old, 'sentence', 0)).toBe(false);
    expect(showExtra(old, 'sentence', true).applied).toBe(true);
  });
});
