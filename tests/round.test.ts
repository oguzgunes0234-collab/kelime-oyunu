import { describe, expect, it } from 'vitest';
import { toQuestion } from '../src/core/pack';
import { seededRng } from '../src/core/rng';
import {
  MAX_WRONG_ATTEMPTS,
  applyTool,
  canUseTool,
  createRound,
  filledCount,
  nextSlot,
  placeLetter,
  placeTile,
  placedWord,
  removeAt,
  skipRound,
  wasHelped,
  type RoundState,
} from '../src/core/round';
import { scoreRound } from '../src/core/scoring';
import type { Entry } from '../src/core/types';

const entry: Entry = {
  id: 'kus',
  pos: 'noun',
  level: 'A1',
  topic: 'hayvanlar',
  terms: { tr: { text: 'kuş' }, en: { text: 'bird' } },
  hint: { tr: 'Kanatlı hayvan.' },
};

function round(dir: 'tr>en' | 'en>tr' = 'tr>en', difficulty: 'easy' | 'hard' = 'easy'): RoundState {
  const direction = dir === 'tr>en' ? { source: 'tr', target: 'en' } : { source: 'en', target: 'tr' };
  return createRound(toQuestion(entry, direction), difficulty, seededRng(1));
}

function type(state: RoundState, word: string): RoundState {
  for (const ch of word) state = placeLetter(state, ch);
  return state;
}

/** Oyuncunun tüm harflere tek tek dokunup geri alması. */
function removeAll(state: RoundState): RoundState {
  state.placed.forEach((_, i) => (state = removeAt(state, i)));
  return state;
}

describe('tur', () => {
  it('taşlardan doğru kelime kurulunca tur kazanılır', () => {
    const s = type(round(), 'bird');
    expect(s.status).toBe('correct');
    expect(scoreRound(s).total).toBeGreaterThan(0);
  });

  it('Türkçe cevapta özel harfler taş olarak gelir', () => {
    const s = round('en>tr');
    expect(s.tiles.map((t) => t.letter).sort()).toEqual(['k', 'u', 'ş'].sort());
    expect(type(s, 'kuş').status).toBe('correct');
  });

  it('zor seviyede şaşırtmaca taşlar eklenir ama cevap alanı cevap uzunluğundadır', () => {
    const s = round('tr>en', 'hard');
    expect(s.tiles.length).toBe(4 + 3);
    expect(s.tiles.filter((t) => t.decoy)).toHaveLength(3);
  });

  it('yanlış tam cevap deneme hakkını düşürür; hak bitince tur kaybedilir', () => {
    let s = round();
    for (let i = 0; i < MAX_WRONG_ATTEMPTS; i++) {
      s = type(s, 'drib');
      if (i < MAX_WRONG_ATTEMPTS - 1) {
        expect(s.event?.kind).toBe('wrong');
        s = removeAll(s);
      }
    }
    expect(s.status).toBe('failed');
    expect(scoreRound(s).total).toBe(0);
  });

  describe('harfe dokunup geri alma', () => {
    it('dokunulan harf geri döner, diğerleri yerinde kalır; sıradaki taş boşluğa gider', () => {
      let s = type(round(), 'bir');
      s = removeAt(s, 1); // "i"
      expect(placedWord(s)).toBe('br');
      expect(s.placed[0]).not.toBeNull();
      expect(s.placed[1]).toBeNull();
      expect(s.placed[2]).not.toBeNull();
      expect(nextSlot(s)).toBe(1);
      expect(s.event).toMatchObject({ kind: 'removed', position: 1 });
      s = placeLetter(s, 'i');
      expect(placedWord(s)).toBe('bir');
      s = placeLetter(s, 'd');
      expect(s.status).toBe('correct');
    });

    it('dokunmak doğru/yanlış denetimini tetiklemez', () => {
      let s = type(round(), 'drib');
      expect(s.wrongAttempts).toBe(1);
      const before = s.wrongAttempts;
      s = removeAt(s, 0);
      expect(s.status).toBe('playing');
      expect(s.wrongAttempts).toBe(before);
      expect(s.event?.kind).toBe('removed');
      // Kalanları da geri alırken yine denetim olmaz.
      s = removeAll(s);
      expect(filledCount(s)).toBe(0);
      expect(s.wrongAttempts).toBe(before);
    });

    it('yanlış harfi düzeltme: yalnızca yanlış kareyi geri alıp doğrusunu koymak kelimeyi tamamlar', () => {
      // "bird" yerine "brid": 2. ve 3. harf yer değiştirmiş.
      let s = type(round(), 'brid');
      expect(s.event?.kind).toBe('wrong');
      s = removeAt(s, 1);
      s = removeAt(s, 2);
      expect(placedWord(s)).toBe('bd');
      s = type(s, 'ir');
      expect(placedWord(s)).toBe('bird');
      expect(s.status).toBe('correct');
      expect(s.wrongAttempts).toBe(1);
    });

    it('harfi değiştirme: tam dolmadan geri alınan harfin yerine başka harf konabilir', () => {
      let s = type(round(), 'bd');
      s = removeAt(s, 1);
      s = type(s, 'ird');
      expect(s.status).toBe('correct');
      expect(s.wrongAttempts).toBe(0);
    });

    it('boş kareye ya da biten turda dokunmak hiçbir şey değiştirmez', () => {
      const s = type(round(), 'b');
      expect(removeAt(s, 2)).toBe(s);
      const done = type(round(), 'bird');
      expect(removeAt(done, 0)).toBe(done);
    });
  });

  it('geri al son harfi geri gönderir; boşken hak harcatmaz', () => {
    let s = round();
    expect(applyTool(s, 'undo').applied).toBe(false);
    s = type(s, 'bi');
    const r = applyTool(s, 'undo');
    expect(r.applied).toBe(true);
    expect(placedWord(r.state)).toBe('b');
    expect(wasHelped(r.state)).toBe(false);
  });

  it('karıştır yalnızca boştaki taşların yerini değiştirir', () => {
    let s = type(round(), 'b');
    const placedId = s.placed[0]!;
    const pos = s.order.indexOf(placedId);
    const r = applyTool(s, 'shuffle', seededRng(3));
    expect(r.applied).toBe(true);
    expect(r.state.order.indexOf(placedId)).toBe(pos);
    expect([...r.state.order].sort()).toEqual([...s.order].sort());
  });

  it('mıknatıs sıradaki doğru harfi yerleştirir ve hatalı harfleri geri alır', () => {
    let s = type(round(), 'di');
    const r = applyTool(s, 'magnet');
    expect(placedWord(r.state)).toBe('b');
    expect(r.state.event).toMatchObject({ kind: 'magnet', letter: 'b', removedWrong: 2 });
    expect(wasHelped(r.state)).toBe(true);
  });

  it('mıknatısla tamamlanan kelime de kazanılır ama puan kesilir', () => {
    let s = round();
    for (let i = 0; i < 4; i++) s = applyTool(s, 'magnet').state;
    expect(s.status).toBe('correct');
    const clean = scoreRound(type(round(), 'bird')).total;
    expect(scoreRound(s).total).toBeLessThan(clean);
    expect(scoreRound(s).total).toBeGreaterThan(0);
  });

  it('ipucu önce anlamı, sonra sıradaki harfi gösterir', () => {
    let s = round();
    let r = applyTool(s, 'hint');
    expect(r.state.event).toMatchObject({ kind: 'hint-meaning' });
    r = applyTool(r.state, 'hint');
    expect(r.state.event).toMatchObject({ kind: 'hint-letter', letter: 'b', position: 0 });
    expect(r.state.highlight).not.toBeNull();
    expect(r.state.tiles[r.state.highlight!].letter).toBe('b');
  });

  it('tur bitince araçlar ve taşlar kilitlenir; pas geçilebilir', () => {
    const done = type(round(), 'bird');
    expect(canUseTool(done, 'magnet')).toBe(false);
    expect(placeTile(done, 0)).toBe(done);
    expect(skipRound(round()).status).toBe('skipped');
  });

  it('alternatif cevap taşlarla kurulabiliyorsa kabul edilir', () => {
    const e: Entry = { ...entry, id: 'x', terms: { tr: { text: 'kaş' }, en: { text: 'arc', alternatives: ['car'] } } };
    let s = createRound(toQuestion(e, { source: 'tr', target: 'en' }), 'easy', seededRng(2));
    s = type(s, 'car');
    expect(s.status).toBe('correct');
  });
});
