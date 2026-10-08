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

export type CoinPackSize = 'small' | 'medium' | 'large';

/**
 * Jeton paketleri (TASLAK). Büyük bakiye bırakmasın diye en büyüğü 600 jeton
 * (bkz. docs/gelir-modeli.md: kazanma/harcama hesabı). "Bonus" iddiası yok.
 */
export const COIN_PACKS: (CoinPack & { size: CoinPackSize })[] = [
  { productId: PRODUCT_IDS.coinsSmall, name: 'Küçük kese', size: 'small', coins: 100, draftUsd: 1.99 },
  { productId: PRODUCT_IDS.coinsMedium, name: 'Orta kese', size: 'medium', coins: 250, draftUsd: 3.99 },
  { productId: PRODUCT_IDS.coinsLarge, name: 'Büyük kese', size: 'large', coins: 600, draftUsd: 7.99 },
];

/**
 * Ödüllü reklam: önceden söylenen ödül. Günlük sınır YOK: oyuncu istediği
 * kadar izleyebilir (oyun sahibinin kararı). Reklamsız sürüm ödüllü reklamı
 * kapatmaz; ödüllü reklam her zaman isteğe bağlıdır.
 */
export const AD_REWARD_COINS = 10;

/**
 * Geçiş reklamı (bölüm sonu): AÇIK (oyun sahibinin kararı, 2026-10-09).
 * Yalnızca sonuç ekranından sonraki bölüme geçerken; en sık 3 tamamlanan
 * bulmacada bir ve en az 5 dakika arayla. Kelime çözerken, eğitimde ve
 * pekiştirmede asla. Reklamsız sürüm bunu kaldırır (ödüllü reklamı kaldırmaz).
 */
export const INTERSTITIAL = { enabled: true, everyPuzzles: 3, minGapMs: 5 * 60 * 1000 };

/** Reklamsız sürümün taslak fiyatı (yalnızca belge/deneme; uygulamada StoreKit fiyatı gösterilir). */
export const NO_ADS_DRAFT_USD = 9.99;
