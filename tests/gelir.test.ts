import { afterEach, describe, expect, it } from 'vitest';
import { AD_REWARDS_PER_DAY, COIN_PACKS, IAP_MODE, ADS_MODE, INTERSTITIAL } from '../src/monetization/config';
import {
  countReward,
  initialAdState,
  loadEntitlements,
  notePuzzleDone,
  noteInterstitialShown,
  rewardsLeft,
  saveEntitlements,
  shouldShowInterstitial,
} from '../src/monetization/state';
import { persistRaw, restoreNativeBackup } from '../src/platform/persist';

const g = globalThis as Record<string, unknown>;
function fakeStorage(initial: Record<string, string> = {}) {
  const m = new Map(Object.entries(initial));
  g.localStorage = {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  };
  return m;
}
function fakeNative(prefs: Map<string, string>) {
  g.window = {
    Capacitor: {
      isNativePlatform: () => true,
      Plugins: {
        Preferences: {
          get: async ({ key }: { key: string }) => ({ value: prefs.get(key) ?? null }),
          set: async ({ key, value }: { key: string; value: string }) => void prefs.set(key, value),
          remove: async ({ key }: { key: string }) => void prefs.delete(key),
        },
      },
    },
  };
}
afterEach(() => {
  delete g.localStorage;
  delete g.window;
});

const day = (d: number, h = 12) => new Date(2026, 9, d, h);

describe('gelir modeli: varsayılanlar', () => {
  it('derlemede açıkça istenmedikçe reklam ve satın alma kapalı (gerçek ya da deneme)', () => {
    expect(ADS_MODE).toBe('off');
    expect(IAP_MODE).toBe('off');
    expect(INTERSTITIAL.enabled).toBe(false);
  });

  it('jeton paketleri küçük: en büyüğü 600 jeton, büyük bakiye bırakmaz', () => {
    expect(Math.max(...COIN_PACKS.map((p) => p.coins))).toBeLessThanOrEqual(600);
    expect(COIN_PACKS.every((p) => p.productId.startsWith('YER_TUTUCU'))).toBe(true);
  });
});

describe('ödül (ödüllü reklam ya da reklamsız bonus)', () => {
  it('günde en çok AD_REWARDS_PER_DAY kez; ertesi gün sıfırlanır', () => {
    let s = initialAdState(day(1));
    for (let i = 0; i < AD_REWARDS_PER_DAY; i++) s = countReward(s, day(1))!;
    expect(rewardsLeft(s, day(1))).toBe(0);
    expect(countReward(s, day(1))).toBeNull();
    expect(rewardsLeft(s, day(2))).toBe(AD_REWARDS_PER_DAY);
    expect(countReward(s, day(2))!.rewardsToday).toBe(1);
  });
});

describe('geçiş reklamı', () => {
  const on = { ...INTERSTITIAL, enabled: true };
  it('kapalıyken ve reklamsız kullanıcıya asla', () => {
    const s = { ...initialAdState(day(1)), puzzlesSinceInterstitial: 99 };
    expect(shouldShowInterstitial(s, { noAds: false }, day(1))).toBe(false);
    expect(shouldShowInterstitial(s, { noAds: true }, day(1), on)).toBe(false);
  });
  it('açıkken: yeterli bulmaca ve süre geçmeden gösterilmez', () => {
    let s = initialAdState(day(1));
    for (let i = 0; i < on.everyPuzzles - 1; i++) s = notePuzzleDone(s);
    expect(shouldShowInterstitial(s, { noAds: false }, day(1), on)).toBe(false);
    s = notePuzzleDone(s);
    expect(shouldShowInterstitial(s, { noAds: false }, day(1), on)).toBe(true);
    s = noteInterstitialShown(s, day(1));
    for (let i = 0; i < on.everyPuzzles; i++) s = notePuzzleDone(s);
    expect(shouldShowInterstitial(s, { noAds: false }, new Date(day(1).getTime() + 60_000), on)).toBe(false);
    expect(shouldShowInterstitial(s, { noAds: false }, new Date(day(1).getTime() + on.minGapMs), on)).toBe(true);
  });
});

describe('kalıcı kayıt', () => {
  it('reklamsız hak ilerlemeden ayrı saklanır', () => {
    fakeStorage();
    expect(loadEntitlements()).toEqual({ noAds: false });
    saveEntitlements({ noAds: true });
    expect(loadEntitlements()).toEqual({ noAds: true });
  });

  it('web: yalnızca localStorage; geri yükleme hiçbir şey yapmaz', async () => {
    const m = fakeStorage();
    persistRaw('a', '1');
    expect(m.get('a')).toBe('1');
    expect(await restoreNativeBackup(['a'])).toEqual([]);
  });

  it('iPhone: her yazma yedeğe de gider; silinen web deposu açılışta yedekten döner', async () => {
    const prefs = new Map<string, string>();
    fakeNative(prefs);
    const m = fakeStorage();
    persistRaw('profil', '{"coins":42}');
    await Promise.resolve();
    expect(prefs.get('profil')).toBe('{"coins":42}');
    m.clear(); // iOS web deposunu sildi
    expect(await restoreNativeBackup(['profil'])).toEqual(['profil']);
    expect(m.get('profil')).toBe('{"coins":42}');
  });

  it('iPhone: var olan web verisinin üzerine yedekten yazılmaz; eksik yedek tamamlanır', async () => {
    const prefs = new Map([['profil', '{"coins":1}']]);
    fakeNative(prefs);
    const m = fakeStorage({ profil: '{"coins":99}' });
    expect(await restoreNativeBackup(['profil'])).toEqual([]);
    expect(m.get('profil')).toBe('{"coins":99}');
    expect(prefs.get('profil')).toBe('{"coins":99}');
  });
});
