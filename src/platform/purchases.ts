import { COIN_PACKS, IAP_MODE, PRODUCT_IDS } from '../monetization/config';
import { closeMock, openMock } from './mockBus';

/**
 * Uygulama içi satın alma sağlayıcısı. Şu an "off" (web: satın alma yok) ve
 * "mock" (yerel deneme: gerçek ödeme yok). Gerçek sağlayıcı StoreKit 2 olacak
 * (@capgo/native-purchases); oyun sahibinin onayı ve App Store Connect ürün
 * kimlikleri gelince eklenecek. Bkz. docs/gelir-modeli.md.
 *
 * Fiyat metni HİÇBİR ZAMAN uygulamada sabit yazılmaz: gerçek sürümde StoreKit'in
 * yerelleştirilmiş fiyatı (ör. "₺49,99") gösterilir. Deneme sürümünde fiyat
 * yerine "deneme" yazar.
 */

export interface StoreProduct {
  id: string;
  /** StoreKit'in yerelleştirilmiş fiyat metni; denemede "Deneme". */
  priceLabel: string;
  kind: 'consumable' | 'non-consumable';
}

export type PurchaseResult = 'purchased' | 'cancelled' | 'failed' | 'unavailable';

export interface PurchaseProvider {
  readonly mode: 'off' | 'mock';
  available(): boolean;
  products(): Promise<StoreProduct[]>;
  purchase(productId: string): Promise<PurchaseResult>;
  /** Kalıcı (non-consumable) satın alımları App Store'dan yeniden okur; sahip olunan kimlikler. */
  restore(): Promise<string[]>;
}

const off: PurchaseProvider = {
  mode: 'off',
  available: () => false,
  products: async () => [],
  purchase: async () => 'unavailable',
  restore: async () => [],
};

/** Denemede "satın alınmış" kalıcı ürünler (gerçek App Store yerine). */
const MOCK_OWNED_KEY = 'kelime-oyunu:deneme-satinalma';

function mockOwned(): string[] {
  try {
    return JSON.parse(localStorage.getItem(MOCK_OWNED_KEY) ?? '[]') as string[];
  } catch {
    return [];
  }
}

const mock: PurchaseProvider = {
  mode: 'mock',
  available: () => true,
  products: async () => [
    { id: PRODUCT_IDS.noAds, priceLabel: 'Deneme', kind: 'non-consumable' },
    ...COIN_PACKS.map((p) => ({ id: p.productId, priceLabel: 'Deneme', kind: 'consumable' as const })),
  ],
  purchase: (productId) =>
    new Promise((resolve) => {
      const pack = COIN_PACKS.find((p) => p.productId === productId);
      openMock({
        kind: 'purchase',
        title: pack ? `${pack.name} · ${pack.coins} jeton` : 'Reklamsız sürüm',
        detail: 'Bu bir deneme satın almasıdır: gerçek ödeme alınmaz, App Store kullanılmaz.',
        resolve: (approved) => {
          closeMock();
          if (approved && productId === PRODUCT_IDS.noAds) {
            try {
              localStorage.setItem(MOCK_OWNED_KEY, JSON.stringify([...new Set([...mockOwned(), productId])]));
            } catch {
              /* depolama kapalı */
            }
          }
          resolve(approved ? 'purchased' : 'cancelled');
        },
      });
    }),
  restore: async () => mockOwned(),
};

export const purchases: PurchaseProvider = IAP_MODE === 'mock' ? mock : off;
