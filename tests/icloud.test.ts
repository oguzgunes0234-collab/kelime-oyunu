import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AUTO_RESTORE_OFF_KEY,
  CLOUD_PREFIX,
  applyCloudBackup,
  bestBackup,
  deviceId,
  isPristine,
  readCloudBackups,
  restoreCloudIfEmpty,
  scheduleCloudBackup,
  type CloudBackup,
} from '../src/platform/cloud';
import { clearProfile, STORAGE_KEY } from '../src/core/storage';

const g = globalThis as Record<string, unknown>;
let local: Map<string, string>;
let cloud: Map<string, string>;

function setup(native = true) {
  local = new Map();
  cloud = new Map();
  g.localStorage = {
    getItem: (k: string) => local.get(k) ?? null,
    setItem: (k: string, v: string) => void local.set(k, v),
    removeItem: (k: string) => void local.delete(k),
  };
  g.window = native
    ? {
        Capacitor: {
          isNativePlatform: () => true,
          Plugins: {
            ICloudKV: {
              get: async ({ key }: { key: string }) => ({ value: cloud.get(key) ?? null }),
              set: async ({ key, value }: { key: string; value: string }) => void cloud.set(key, value),
              keys: async ({ prefix }: { prefix: string }) => ({ keys: [...cloud.keys()].filter((k) => k.startsWith(prefix)) }),
            },
          },
        },
      }
    : {};
}

const profile = (puzzlesDone: number, coins: number, totalScore = puzzlesDone * 100) =>
  JSON.stringify({ version: 1, coins, totalScore, campaign: { puzzlesDone }, stats: { rounds: 0 } });
const backup = (device: string, puzzlesDone: number, coins: number, savedAt = 1): CloudBackup => ({
  v: 1,
  savedAt,
  device,
  profile: profile(puzzlesDone, coins),
});

beforeEach(() => setup());
afterEach(() => {
  delete g.localStorage;
  delete g.window;
  vi.useRealTimers();
});

describe('iCloud yedeği', () => {
  it('her cihaz yalnızca kendi anahtarına yazar; art arda kayıtlar birleşir', async () => {
    vi.useFakeTimers();
    scheduleCloudBackup(profile(1, 10));
    scheduleCloudBackup(profile(2, 20));
    await vi.runAllTimersAsync();
    const keys = [...cloud.keys()];
    expect(keys).toEqual([CLOUD_PREFIX + deviceId()]);
    expect(JSON.parse(JSON.parse(cloud.get(keys[0])!).profile).coins).toBe(20);
  });

  it('yeni telefon (profil yok): en ileri yedek yüklenir, satın alınan jetonlar dahil', async () => {
    cloud.set(CLOUD_PREFIX + 'eski', JSON.stringify(backup('eski', 40, 650)));
    cloud.set(CLOUD_PREFIX + 'tablet', JSON.stringify(backup('tablet', 3, 50)));
    expect(await restoreCloudIfEmpty(STORAGE_KEY)).toBe(true);
    expect(JSON.parse(local.get(STORAGE_KEY)!)).toMatchObject({ coins: 650, campaign: { puzzlesDone: 40 } });
  });

  it('iCloud geç inse bile eski telefonun yedeği ezilmez; sonraki açılışta yüklenir', async () => {
    vi.useFakeTimers();
    // İlk açılış: iCloud boş, oyun boş profille başlar ve kendi anahtarına yazar.
    expect(await restoreCloudIfEmpty(STORAGE_KEY)).toBe(false);
    local.set(STORAGE_KEY, profile(0, 0, 0));
    scheduleCloudBackup(profile(0, 0, 0));
    await vi.runAllTimersAsync();
    // iCloud indi: eski telefonun yedeği geldi, yeni telefonunki onu ezmedi.
    cloud.set(CLOUD_PREFIX + 'eski', JSON.stringify(backup('eski', 40, 650)));
    vi.useRealTimers();
    expect(await restoreCloudIfEmpty(STORAGE_KEY)).toBe(true);
    expect(JSON.parse(local.get(STORAGE_KEY)!).coins).toBe(650);
  });

  it('oynanmış profilin üzerine kendiliğinden yazılmaz', async () => {
    local.set(STORAGE_KEY, profile(5, 30));
    cloud.set(CLOUD_PREFIX + 'eski', JSON.stringify(backup('eski', 40, 650)));
    expect(await restoreCloudIfEmpty(STORAGE_KEY)).toBe(false);
    expect(JSON.parse(local.get(STORAGE_KEY)!).coins).toBe(30);
  });

  it('"İlerlemeyi sıfırla" sonrası yedek kendiliğinden geri gelmez; elle yükleme yine çalışır', async () => {
    local.set(STORAGE_KEY, profile(5, 30));
    cloud.set(CLOUD_PREFIX + 'eski', JSON.stringify(backup('eski', 40, 650)));
    clearProfile();
    expect(await restoreCloudIfEmpty(STORAGE_KEY)).toBe(false);
    const [b] = await readCloudBackups();
    expect(applyCloudBackup(STORAGE_KEY, b)).toBe(true);
    expect(local.get(AUTO_RESTORE_OFF_KEY)).toBeUndefined();
    expect(JSON.parse(local.get(STORAGE_KEY)!).coins).toBe(650);
  });

  it('en ileri yedek: önce biten bölüm, sonra puan, sonra tarih; hiç oynanmamış profil boş sayılır', () => {
    expect(bestBackup([backup('a', 10, 999, 5), backup('b', 12, 1, 1)])!.device).toBe('b');
    expect(bestBackup([])).toBeNull();
    expect(isPristine(null)).toBe(true);
    expect(isPristine(profile(0, 0, 0))).toBe(true);
    expect(isPristine(profile(0, 5, 0))).toBe(false);
  });

  it('web: eklenti yok, hiçbir şey yapmaz', async () => {
    setup(false);
    scheduleCloudBackup(profile(3, 3));
    expect(await restoreCloudIfEmpty(STORAGE_KEY)).toBe(false);
    expect(await readCloudBackups()).toEqual([]);
  });
});
