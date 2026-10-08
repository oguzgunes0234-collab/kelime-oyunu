import { ADS_MODE } from '../monetization/config';
import { closeMock, openMock } from './mockBus';

/**
 * Reklam sağlayıcısı. Şu an yalnızca "off" (reklam yok) ve "mock" (deneme ekranı)
 * var. Gerçek sağlayıcı (Google AdMob, @capacitor-community/admob) oyun
 * sahibinin onayıyla eklenecek; kişiselleştirilmemiş reklam istenecek ve ATT
 * (uygulamalar arası takip) izni sorulmayacak. Bkz. docs/gelir-modeli.md.
 */
export type RewardedResult = 'rewarded' | 'dismissed' | 'unavailable';

export interface AdProvider {
  readonly mode: 'off' | 'mock';
  /** Ödüllü reklam bu ortamda var mı (oyuncuya teklif gösterilsin mi)? */
  rewardedAvailable(): boolean;
  /** Oyuncunun açıkça başlattığı ödüllü reklam. Sonuna kadar izlenirse "rewarded". */
  showRewarded(): Promise<RewardedResult>;
  /** Oturum sonu geçiş reklamı (ilk sürümde kapalı). */
  showInterstitial(): Promise<void>;
}

const off: AdProvider = {
  mode: 'off',
  rewardedAvailable: () => false,
  showRewarded: async () => 'unavailable',
  showInterstitial: async () => undefined,
};

const mock: AdProvider = {
  mode: 'mock',
  rewardedAvailable: () => true,
  showRewarded: () =>
    new Promise((resolve) => {
      openMock({
        kind: 'ad',
        label: 'Deneme ödüllü reklamı',
        seconds: 5,
        rewarded: true,
        resolve: (completed) => {
          closeMock();
          resolve(completed ? 'rewarded' : 'dismissed');
        },
      });
    }),
  showInterstitial: () =>
    new Promise((resolve) => {
      openMock({
        kind: 'ad',
        label: 'Deneme geçiş reklamı',
        seconds: 3,
        rewarded: false,
        resolve: () => {
          closeMock();
          resolve();
        },
      });
    }),
};

export const ads: AdProvider = ADS_MODE === 'mock' ? mock : off;
