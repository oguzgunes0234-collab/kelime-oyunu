import { dayKey } from '../core/daily';
import { AD_REWARDS_PER_DAY, AD_REWARD_COINS, INTERSTITIAL } from './config';
import { persist, readPersisted } from '../platform/persist';

/**
 * Satın alma ve reklam durumu. İlerlemeden (profil) AYRI saklanır:
 * "İlerlemeyi sıfırla" kalıcı satın alımı (Reklamsız) silmez.
 *
 * Reklamsız sürümün asıl kaynağı App Store'dur: bu kayıt yalnızca önbellek;
 * "Satın alımları geri yükle" App Store'dan yeniden okur.
 */

export const ENTITLEMENT_KEY = 'kelime-oyunu:satinalma:v1';
export const ADS_KEY = 'kelime-oyunu:reklam:v1';

export interface Entitlements {
  noAds: boolean;
}

export interface AdState {
  /** Ödüllü reklam sayacının günü (yerel tarih). */
  day: string;
  rewardsToday: number;
  /** Son geçiş reklamından bu yana tamamlanan bulmaca. */
  puzzlesSinceInterstitial: number;
  lastInterstitialAt: number;
}

export function loadEntitlements(): Entitlements {
  const v = readPersisted<Partial<Entitlements>>(ENTITLEMENT_KEY);
  return { noAds: v?.noAds === true };
}

export function saveEntitlements(e: Entitlements): void {
  persist(ENTITLEMENT_KEY, e);
}

export function initialAdState(now: Date): AdState {
  return { day: dayKey(now), rewardsToday: 0, puzzlesSinceInterstitial: 0, lastInterstitialAt: 0 };
}

export function loadAdState(now: Date): AdState {
  const v = readPersisted<Partial<AdState>>(ADS_KEY);
  return { ...initialAdState(now), ...v };
}

export function saveAdState(s: AdState): void {
  persist(ADS_KEY, s);
}

/** Bugün kalan ödül hakkı (reklamlı ya da reklamsız kullanıcı için aynı sınır). */
export function rewardsLeft(s: AdState, now: Date): number {
  return s.day === dayKey(now) ? Math.max(0, AD_REWARDS_PER_DAY - s.rewardsToday) : AD_REWARDS_PER_DAY;
}

/** Bir ödül sayılır (reklam tamamlandı ya da reklamsız kullanıcı ödülü aldı). Hak yoksa null. */
export function countReward(s: AdState, now: Date): AdState | null {
  if (rewardsLeft(s, now) <= 0) return null;
  const today = dayKey(now);
  return { ...s, day: today, rewardsToday: (s.day === today ? s.rewardsToday : 0) + 1 };
}

export const REWARD_COINS = AD_REWARD_COINS;

/** Tamamlanan bir bulmacayı geçiş reklamı sayacına ekler. */
export function notePuzzleDone(s: AdState): AdState {
  return { ...s, puzzlesSinceInterstitial: s.puzzlesSinceInterstitial + 1 };
}

/**
 * Oturum sonunda geçiş reklamı gösterilsin mi? Reklamsız kullanıcıya, kapalı
 * ayarda ve sınırlar dolmadan asla.
 */
export function shouldShowInterstitial(s: AdState, e: Entitlements, now: Date, cfg = INTERSTITIAL): boolean {
  if (!cfg.enabled || e.noAds) return false;
  return s.puzzlesSinceInterstitial >= cfg.everyPuzzles && now.getTime() - s.lastInterstitialAt >= cfg.minGapMs;
}

export function noteInterstitialShown(s: AdState, now: Date): AdState {
  return { ...s, puzzlesSinceInterstitial: 0, lastInterstitialAt: now.getTime() };
}
