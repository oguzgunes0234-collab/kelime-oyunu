/**
 * Gelir modeli ayarları (TASLAK). Ana oyun ve öğrenme özellikleri ücretsizdir;
 * gelir isteğe bağlı ödüllü reklamdan, küçük jeton paketlerinden ve tek
 * seferlik "Reklamsız" sürümden gelir. Ayrıntı: docs/gelir-modeli.md.
 *
 * Bu sürümde gerçek reklam ve gerçek ödeme YOK:
 * - "off"  : web/test sürümü. Reklam yok; satın alma düğmeleri "App Store
 *            sürümünde" der. (Varsayılan.)
 * - "mock" : yerel deneme. Reklam yerine 5 saniyelik deneme ekranı, satın alma
 *            yerine "gerçek ödeme yok" onay penceresi. Yalnızca
 *            VITE_ADS=mock / VITE_IAP=mock ile derlenince açılır.
 * Gerçek sağlayıcılar (AdMob, StoreKit) oyun sahibinin onayıyla eklenecek.
 */

export type ProviderMode = 'off' | 'mock';

const env = (import.meta as { env?: Record<string, string | undefined> }).env ?? {};
export const ADS_MODE: ProviderMode = env.VITE_ADS === 'mock' ? 'mock' : 'off';
export const IAP_MODE: ProviderMode = env.VITE_IAP === 'mock' ? 'mock' : 'off';

/**
 * App Store Connect ürün kimlikleri: YER TUTUCU. Gerçek kimlikler (ör.
 * "<bundle id>.coins.small") App Store Connect'te ürün oluşturulunca yazılacak.
 */
export const PRODUCT_IDS = {
  noAds: 'YER_TUTUCU.reklamsiz',
  coinsSmall: 'YER_TUTUCU.jeton.kucuk',
  coinsMedium: 'YER_TUTUCU.jeton.orta',
  coinsLarge: 'YER_TUTUCU.jeton.buyuk',
} as const;

export interface CoinPack {
  productId: string;
  name: string;
  coins: number;
  /** Yalnızca taslak/deneme için; gerçek fiyat StoreKit'in yerelleştirilmiş fiyatıdır. */
  draftUsd: number;
}

/**
 * Jeton paketleri (TASLAK). Büyük bakiye bırakmasın diye en büyüğü 600 jeton
 * (bkz. docs/gelir-modeli.md: kazanma/harcama hesabı). "Bonus" iddiası yok.
 */
export const COIN_PACKS: CoinPack[] = [
  { productId: PRODUCT_IDS.coinsSmall, name: 'Küçük kese', coins: 100, draftUsd: 0.99 },
  { productId: PRODUCT_IDS.coinsMedium, name: 'Kese', coins: 250, draftUsd: 1.99 },
  { productId: PRODUCT_IDS.coinsLarge, name: 'Büyük kese', coins: 600, draftUsd: 3.99 },
];

/** Ödüllü reklam: önceden söylenen ödül ve günlük sınır. */
export const AD_REWARD_COINS = 10;
export const AD_REWARDS_PER_DAY = 3;

/**
 * Geçiş reklamı (oturum sonu): ilk sürümde KAPALI. Açılırsa yalnızca sonuç
 * ekranından "Sıradaki bölüm"e geçerken, en erken 3 tamamlanan bulmacada bir
 * ve en az 5 dakika arayla gösterilir.
 */
export const INTERSTITIAL = { enabled: false, everyPuzzles: 3, minGapMs: 5 * 60 * 1000 };
