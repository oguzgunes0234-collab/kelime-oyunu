import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { COIN_PACKS, PRODUCT_IDS } from '../monetization/config';
import {
  countReward,
  loadAdState,
  loadEntitlements,
  noteInterstitialShown,
  notePuzzleDone,
  REWARD_COINS,
  rewardsLeft,
  saveAdState,
  saveEntitlements,
  shouldShowInterstitial,
  type AdState,
  type Entitlements,
} from '../monetization/state';
import { ads } from '../platform/ads';
import { purchases, type PurchaseResult } from '../platform/purchases';
import type { Profile } from '../core/profile';

/**
 * Gelir modelinin ekranlara açılan yüzü: ödüllü reklam, Reklamsız sürüm, jeton
 * paketleri ve geri yükleme. Ana oyun ve öğrenme özellikleri bunların hiçbirine
 * bağlı değildir.
 */
interface Monetization {
  entitlements: Entitlements;
  /** Bugün kalan ödül hakkı. */
  rewardsLeftToday: number;
  /** Ödül teklifi bu ortamda gösterilsin mi (reklam var ya da kullanıcı reklamsız)? */
  rewardOffered: boolean;
  rewardCoins: number;
  /**
   * Oyuncunun açıkça başlattığı ödül: reklamlı kullanıcıda ödüllü reklam,
   * reklamsız kullanıcıda doğrudan ödül. Verilen jeton (0 = verilmedi).
   */
  claimReward: () => Promise<number>;
  purchasesAvailable: boolean;
  buyNoAds: () => Promise<PurchaseResult>;
  buyCoins: (productId: string) => Promise<PurchaseResult>;
  /** Kalıcı satın alımları geri yükler; Reklamsız bulunduysa true. */
  restore: () => Promise<boolean>;
  /** Tamamlanan bulmaca (geçiş reklamı sayacı için). */
  notePuzzleDone: () => void;
  /** Sonuç ekranından sonraki bulmacaya geçerken; gerekirse geçiş reklamını gösterip bekler. */
  beforeNextPuzzle: () => Promise<void>;
}

const Ctx = createContext<Monetization | null>(null);

export function MonetizationProvider({ profile, setProfile, children }: { profile: Profile; setProfile: (p: Profile) => void; children: ReactNode }) {
  const [entitlements, setEntitlements] = useState<Entitlements>(() => loadEntitlements());
  const [adState, setAdState] = useState<AdState>(() => loadAdState(new Date()));
  // Reklam/satın alma birkaç saniye sürer: jeton, o anki en güncel profile eklenir.
  const latest = useRef(profile);
  latest.current = profile;
  const addCoins = useCallback((n: number) => setProfile({ ...latest.current, coins: latest.current.coins + n }), [setProfile]);

  const updateAds = useCallback((s: AdState) => {
    saveAdState(s);
    setAdState(s);
  }, []);
  const updateEntitlements = useCallback((e: Entitlements) => {
    saveEntitlements(e);
    setEntitlements(e);
  }, []);

  const value = useMemo<Monetization>(() => {
    const now = new Date();
    const offered = entitlements.noAds || ads.rewardedAvailable();
    return {
      entitlements,
      rewardsLeftToday: rewardsLeft(adState, now),
      rewardOffered: offered,
      rewardCoins: REWARD_COINS,
      claimReward: async () => {
        const counted = countReward(adState, new Date());
        if (!counted) return 0;
        // Reklamsız kullanıcıya reklam asla gösterilmez; ödül normal oyunla verilir.
        if (!entitlements.noAds) {
          const r = await ads.showRewarded();
          if (r !== 'rewarded') return 0;
        }
        updateAds(counted);
        addCoins(REWARD_COINS);
        return REWARD_COINS;
      },
      purchasesAvailable: purchases.available(),
      buyNoAds: async () => {
        const r = await purchases.purchase(PRODUCT_IDS.noAds);
        if (r === 'purchased') updateEntitlements({ ...entitlements, noAds: true });
        return r;
      },
      buyCoins: async (productId) => {
        const pack = COIN_PACKS.find((p) => p.productId === productId);
        if (!pack) return 'failed';
        const r = await purchases.purchase(productId);
        if (r === 'purchased') addCoins(pack.coins);
        return r;
      },
      restore: async () => {
        const owned = await purchases.restore();
        const noAds = owned.includes(PRODUCT_IDS.noAds);
        // Geri yükleme yalnızca hak EKLER; App Store'a ulaşılamadıysa var olan hakkı silmez.
        if (noAds && !entitlements.noAds) updateEntitlements({ ...entitlements, noAds: true });
        return noAds;
      },
      notePuzzleDone: () => updateAds(notePuzzleDone(adState)),
      beforeNextPuzzle: async () => {
        if (!shouldShowInterstitial(adState, entitlements, new Date())) return;
        await ads.showInterstitial();
        updateAds(noteInterstitialShown(adState, new Date()));
      },
    };
  }, [entitlements, adState, addCoins, updateAds, updateEntitlements]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useMonetization(): Monetization {
  const v = useContext(Ctx);
  if (!v) throw new Error('MonetizationProvider eksik');
  return v;
}
