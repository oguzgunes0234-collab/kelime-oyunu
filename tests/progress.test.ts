import { describe, expect, it } from 'vitest';
import { MIN_ROUNDS_BEFORE_CHANGE, initialAdaptive, recordRound, roundQuality } from '../src/core/adaptive';
import { currentStreak, goalDoneToday, initialDaily, recordCorrect, recordPuzzleDone } from '../src/core/daily';
import { COINS_PER_CHARGE, TOOL_PACKS } from '../src/core/economy';
import { toQuestion } from '../src/core/pack';
import { applyRound, buyChargeWithCoins, buyPackWithCoins, consumeCharge, defaultProfile } from '../src/core/profile';
import { seededRng } from '../src/core/rng';
import { applyTool, createRound, placeLetter, skipRound } from '../src/core/round';
import { pickEntry } from '../src/core/select';
import { nextRound, startSession } from '../src/core/session';
import type { Entry, WordPack } from '../src/core/types';
import packJson from '../src/data/pack-tr-en.json';

const pack = packJson as WordPack;
const day = (d: number) => new Date(2026, 8, d, 12);

describe('uyarlamalı zorluk', () => {
  it('tek iyi yanıtla seviye değişmez', () => {
    const r = recordRound(initialAdaptive('easy'), 1);
    expect(r.change).toBeNull();
  });

  it('son turlar iyiyse yükselir, kötüyse düşer; değişince pencere sıfırlanır', () => {
    let s = initialAdaptive('easy');
    let change = null;
    for (let i = 0; i < MIN_ROUNDS_BEFORE_CHANGE; i++) ({ state: s, change } = recordRound(s, 1));
    expect(change).toBe('up');
    expect(s.difficulty).toBe('medium');
    for (let i = 0; i < MIN_ROUNDS_BEFORE_CHANGE; i++) ({ state: s, change } = recordRound(s, 0));
    expect(change).toBe('down');
    expect(s.difficulty).toBe('easy');
  });

  it('karışık performansta seviye sabit kalır', () => {
    let s = initialAdaptive('medium');
    const seq = [1, 0, 1, 0.6, 0, 1, 0.6, 0];
    for (const q of seq) s = recordRound(s, q).state;
    expect(s.difficulty).toBe('medium');
  });

  it('yardım ve yanlış deneme kaliteyi düşürür', () => {
    expect(roundQuality('correct', false, 0)).toBe(1);
    expect(roundQuality('correct', true, 0)).toBeLessThan(1);
    expect(roundQuality('skipped', false, 0)).toBe(0);
  });
});

describe('günlük hedef ve seri', () => {
  it('hedef bir bulmacayı tamamlamaktır; seri ardışık günlerde artar', () => {
    let s = initialDaily(day(1));
    const r = recordPuzzleDone(s, day(1));
    expect(r.goalReached).toBe(true);
    expect(r.state.streak).toBe(1);
    expect(recordPuzzleDone(r.state, day(1)).goalReached).toBe(false); // aynı gün ikinci kez ödül yok
    s = recordPuzzleDone(r.state, day(2)).state;
    expect(s.streak).toBe(2);
  });

  it('doğru kelimeler yalnızca sayılır, hedefi tamamlamaz', () => {
    let s = initialDaily(day(1));
    for (let i = 0; i < 30; i++) s = recordCorrect(s, day(1));
    expect(s.todayCorrect).toBe(30);
    expect(goalDoneToday(s, day(1))).toBe(false);
    expect(s.streak).toBe(0);
  });

  it('bir gün kaçırılırsa dinlenme günü seriyi korur', () => {
    let s = initialDaily(day(1));
    s = recordPuzzleDone(s, day(1)).state;
    expect(currentStreak(s, day(3))).toEqual({ streak: 1, restDayNeeded: true });
    const r = recordPuzzleDone(s, day(3));
    expect(r.usedRestDay).toBe(true);
    expect(r.state.streak).toBe(2);
  });

  it('uzun aradan sonra seri sessizce yeniden başlar; en iyi seri korunur', () => {
    let s = initialDaily(day(1));
    s = recordPuzzleDone(s, day(1)).state;
    s = recordPuzzleDone(s, day(2)).state;
    s = recordPuzzleDone(s, day(10)).state;
    expect(s.streak).toBe(1);
    expect(s.bestStreak).toBe(2);
  });

  it('eski kelime hedefiyle bugün tamamlanmış gün, bulmacayla ikinci kez ödül vermez', () => {
    const old = { ...initialDaily(day(1)), lastGoalDay: '2026-09-01', streak: 3, todayCorrect: 10 };
    delete (old as Partial<typeof old>).todayPuzzles; // eski kayıtta bu alan yoktu
    expect(goalDoneToday(old, day(1))).toBe(true);
    const r = recordPuzzleDone(old, day(1));
    expect(r.goalReached).toBe(false);
    expect(r.state.streak).toBe(3);
  });
});

describe('profil', () => {
  const elma = pack.entries.find((e) => e.id === 'elma') as Entry;
  const q = toQuestion(elma, { source: 'tr', target: 'en' });

  it('pas geçilen kelime tekrar listesine eklenir, temiz doğru cevapla çıkar', () => {
    let p = defaultProfile(day(1));
    let r = applyRound(p, skipRound(createRound(q, 'easy', seededRng(1))), { mode: 'normal', adaptive: true }, day(1));
    expect(r.outcome.addedToReview).toBe('skipped');
    expect(r.profile.review).toHaveLength(1);
    let s = createRound(q, 'easy', seededRng(1));
    for (const ch of 'apple') s = placeLetter(s, ch);
    r = applyRound(r.profile, s, { mode: 'review', adaptive: false }, day(1));
    expect(r.outcome.removedFromReview).toBe(true);
    expect(r.profile.review).toHaveLength(0);
  });

  it('yardım kullanılan doğru cevap da tekrar listesine girer', () => {
    let s = createRound(q, 'easy', seededRng(1));
    for (let i = 0; i < 5; i++) s = applyTool(s, 'magnet').state;
    const r = applyRound(defaultProfile(day(1)), s, { mode: 'normal', adaptive: true }, day(1));
    expect(r.outcome.status).toBe('correct');
    expect(r.outcome.addedToReview).toBe('helped');
  });

  it('eğitim turu profili değiştirmez', () => {
    const p = defaultProfile(day(1));
    const r = applyRound(p, skipRound(createRound(q, 'easy')), { mode: 'tutorial', adaptive: true }, day(1));
    expect(r.profile).toBe(p);
  });

  it('hak sıfırın altına düşmez; jetonla hak alınabilir', () => {
    let p = defaultProfile(day(1));
    for (let i = 0; i < 20; i++) p = consumeCharge(p, 'magnet');
    expect(p.inventory.magnet).toBe(0);
    expect(buyChargeWithCoins(p, 'magnet')).toBeNull();
    p = { ...p, coins: COINS_PER_CHARGE };
    expect(buyChargeWithCoins(p, 'magnet')?.inventory.magnet).toBe(1);
  });
});

describe('kelime seçimi', () => {
  it('bilinen kelimeler bitince havuz tükenir; tekrar izniyle devam eder', () => {
    const p = defaultProfile(day(1));
    const all = pack.entries.filter((e) => ['B1', 'B2'].includes(e.level)).map((e) => e.id);
    const learned = { ...p, learned: { 'tr>en': all } };
    const opts = { direction: { source: 'tr', target: 'en' }, difficulty: 'hard' as const, exclude: new Set<string>(), rng: seededRng(4) };
    expect(pickEntry(pack, learned, { ...opts, allowRepeats: false })).toBeNull();
    expect(pickEntry(pack, learned, { ...opts, allowRepeats: true })).not.toBeNull();
  });

  it('oturum içinde aynı kelime tekrar sorulmaz', () => {
    const p = defaultProfile(day(1));
    let session = startSession({ mode: 'normal', direction: { source: 'en', target: 'tr' }, difficultyMode: 'easy' }, p);
    const seen = new Set<string>();
    const rng = seededRng(9);
    for (let i = 0; i < 10; i++) {
      const n = nextRound(session, pack, p, rng);
      if (n.kind !== 'round') throw new Error(n.kind);
      expect(seen.has(n.round.question.entryId)).toBe(false);
      seen.add(n.round.question.entryId);
      session = { ...session, asked: [...session.asked, `en>tr:${n.round.question.entryId}`], rounds: [...session.rounds, { question: n.round.question, outcome: {} as never }] };
    }
    expect(nextRound(session, pack, p, rng).kind).toBe('finished');
  });
});

describe('jetonla paket', () => {
  it('jeton yetince paketi ekler, yetmezse hiçbir şey değişmez', () => {
    const pack = TOOL_PACKS[0];
    const p = { ...defaultProfile(day(1)), coins: pack.coins };
    const next = buyPackWithCoins(p, pack)!;
    expect(next.coins).toBe(0);
    expect(next.inventory.magnet).toBe(p.inventory.magnet + (pack.tools.magnet ?? 0));
    expect(next.inventory.shuffle).toBe(p.inventory.shuffle + (pack.tools.shuffle ?? 0));
    expect(buyPackWithCoins({ ...p, coins: pack.coins - 1 }, pack)).toBeNull();
  });

  it('paket tek tek almaktan ucuzdur', () => {
    for (const pk of TOOL_PACKS) {
      const n = Object.values(pk.tools).reduce((a, b) => a + (b ?? 0), 0);
      expect(pk.coins).toBeLessThan(n * COINS_PER_CHARGE);
    }
  });
});
