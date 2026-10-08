import { capacitorPlugin, isNativeApp, persistRaw } from './persist';

/**
 * iCloud yedeği (yalnızca iPhone uygulaması). Profil — ilerleme ve satın
 * alınan jetonlar dahil — kullanıcının KENDİ iCloud'una (Apple'ın anahtar-değer
 * deposu, NSUbiquitousKeyValueStore) yedeklenir; aynı Apple Kimliğiyle yeni
 * telefonda geri gelir. Bizim sunucumuz yok; veri Apple'da, kullanıcının hesabında.
 *
 * Yerel eklenti: docs/ios/ICloudKVPlugin.swift (Xcode'a eklenir; iCloud →
 * Key-value storage yeteneği açılır). Eklenti yoksa (web) hiçbir şey yapmaz.
 *
 * Veri kaybını önleyen kurallar:
 * - Her cihaz YALNIZCA kendi anahtarına yazar (`kelime-oyunu.yedek.<cihaz>`): bir
 *   telefon diğerinin yedeğini asla ezmez. (Yeni telefonda iCloud verisi geç
 *   inerse boş profil eski telefonun yedeğinin üzerine yazılamaz.)
 * - Açılışta telefondaki profil YOKSA ya da hiç oynanmamışsa, en ileri yedek
 *   kendiliğinden yüklenir (iCloud geç inerse sonraki açılışta). Oynanmış bir
 *   profilin üzerine asla kendiliğinden yazılmaz; oyuncu isterse Ayarlar →
 *   "Yedekten geri yükle" (onay penceresiyle).
 */

interface KVPlugin {
  get(o: { key: string }): Promise<{ value?: string | null }>;
  set(o: { key: string; value: string }): Promise<void>;
  keys(o: { prefix: string }): Promise<{ keys?: string[] }>;
}

export const CLOUD_PREFIX = 'kelime-oyunu.yedek.';
export const DEVICE_KEY = 'kelime-oyunu:cihaz:v1';
/** "İlerlemeyi sıfırla" sonrası: bu cihazda yedek kendiliğinden geri gelmez. */
export const AUTO_RESTORE_OFF_KEY = 'kelime-oyunu:yedek-otomatik-kapali';

export interface CloudBackup {
  v: 1;
  savedAt: number;
  device: string;
  /** Profilin ham JSON metni (localStorage'daki ile aynı). */
  profile: string;
}

interface ProgressLike {
  coins?: number;
  campaign?: { puzzlesDone?: number };
  stats?: { rounds?: number; correct?: number };
  totalScore?: number;
}

function kv(): KVPlugin | null {
  return isNativeApp() ? capacitorPlugin<KVPlugin>('ICloudKV') : null;
}

export function cloudAvailable(): boolean {
  return kv() !== null;
}

/** Bu cihazın kalıcı, rastgele kimliği (yalnızca yedek anahtarını ayırmak için). */
export function deviceId(): string {
  try {
    const have = localStorage.getItem(DEVICE_KEY);
    if (have) return have;
  } catch {
    /* depolama kapalı */
  }
  const id = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  persistRaw(DEVICE_KEY, id);
  return id;
}

/** Profil hiç oynanmamış mı (üzerine yazılınca kaybedilecek bir şey yok)? */
export function isPristine(raw: string | null): boolean {
  if (raw === null) return true;
  try {
    const p = JSON.parse(raw) as ProgressLike;
    return (p.campaign?.puzzlesDone ?? 0) === 0 && (p.stats?.rounds ?? 0) === 0 && (p.totalScore ?? 0) === 0 && (p.coins ?? 0) === 0;
  } catch {
    return false;
  }
}

/** İlerleme ölçüsü: önce biten bölüm, sonra puan, sonra yedek zamanı. */
function rank(b: CloudBackup): [number, number, number] {
  try {
    const p = JSON.parse(b.profile) as ProgressLike;
    return [p.campaign?.puzzlesDone ?? 0, p.totalScore ?? 0, b.savedAt];
  } catch {
    return [-1, -1, b.savedAt];
  }
}

export function bestBackup(list: CloudBackup[]): CloudBackup | null {
  return list.reduce<CloudBackup | null>((best, b) => {
    if (!best) return b;
    const [x, y] = [rank(b), rank(best)];
    return x[0] !== y[0] ? (x[0] > y[0] ? b : best) : x[1] !== y[1] ? (x[1] > y[1] ? b : best) : x[2] > y[2] ? b : best;
  }, null);
}

let timer: ReturnType<typeof setTimeout> | undefined;

/** Profil kaydını bu cihazın iCloud anahtarına yedekler (art arda kayıtları birleştirir). */
export function scheduleCloudBackup(rawProfile: string, delayMs = 3000): void {
  const plugin = kv();
  if (!plugin) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    const device = deviceId();
    const backup: CloudBackup = { v: 1, savedAt: Date.now(), device, profile: rawProfile };
    plugin.set({ key: CLOUD_PREFIX + device, value: JSON.stringify(backup) }).catch(() => undefined);
  }, delayMs);
}

/** iCloud'daki bütün cihazların yedekleri. */
export async function readCloudBackups(): Promise<CloudBackup[]> {
  const plugin = kv();
  if (!plugin) return [];
  try {
    const { keys = [] } = await plugin.keys({ prefix: CLOUD_PREFIX });
    const out: CloudBackup[] = [];
    for (const key of keys) {
      const { value } = await plugin.get({ key });
      if (!value) continue;
      try {
        const b = JSON.parse(value) as CloudBackup;
        if (b?.v === 1 && typeof b.profile === 'string') out.push(b);
      } catch {
        /* bozuk yedek atlanır */
      }
    }
    return out;
  } catch {
    return [];
  }
}

/** Açılışta: telefondaki profil yoksa ya da hiç oynanmamışsa en ileri yedeği yükler. */
export async function restoreCloudIfEmpty(profileKey: string, timeoutMs = 2500): Promise<boolean> {
  if (!kv()) return false;
  let current: string | null;
  try {
    current = localStorage.getItem(profileKey);
  } catch {
    return false;
  }
  if (!isPristine(current)) return false;
  try {
    if (localStorage.getItem(AUTO_RESTORE_OFF_KEY) === '1') return false;
  } catch {
    return false;
  }
  const list = await Promise.race([readCloudBackups(), new Promise<CloudBackup[]>((r) => setTimeout(() => r([]), timeoutMs))]);
  const best = bestBackup(list.filter((b) => !isPristine(b.profile)));
  if (!best) return false;
  return persistRaw(profileKey, best.profile);
}

/** Oyuncunun açık isteğiyle (onaydan sonra) yedeği telefondaki profilin yerine koyar. */
export function applyCloudBackup(profileKey: string, backup: CloudBackup): boolean {
  persistRaw(AUTO_RESTORE_OFF_KEY, null);
  return persistRaw(profileKey, backup.profile);
}
