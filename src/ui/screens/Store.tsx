import { useEffect, useState } from 'react';
import {
  COINS_CLEAN_BONUS,
  COINS_PER_CHARGE,
  COINS_PER_CORRECT,
  DAILY_GOAL_REWARD,
  TOOL_INFO,
  STORE_TOOL_ORDER,
  TOOL_PACKS,
  type ToolPack,
} from '../../core/economy';
import { buyChargeWithCoins, buyPackWithCoins, type Profile } from '../../core/profile';
import type { ToolId } from '../../core/types';
import { BackIcon, CoinIcon, TOOL_ICONS } from '../components/Icons';
import { RewardOffer } from '../components/RewardOffer';
import { CoinPouch } from '../components/CoinPouch';
import { useMonetization } from '../monetization';
import { COIN_PACKS, PRODUCT_IDS } from '../../monetization/config';
import { purchases, type StoreProduct } from '../../platform/purchases';

interface Props {
  profile: Profile;
  setProfile: (p: Profile) => void;
  onClose: () => void;
}

/** "5 Anlam · 5 Harf aç" gibi okunur içerik. */
function packContents(p: ToolPack): string {
  return (STORE_TOOL_ORDER.filter((t) => p.tools[t]) as ToolId[]).map((t) => `${p.tools[t]} ${TOOL_INFO[t].name}`).join(' · ');
}

export function Store({ profile, setProfile, onClose }: Props) {
  const [flash, setFlash] = useState<string | null>(null);
  const m = useMonetization();
  // Fiyatlar yalnızca mağazadan (StoreKit) gelir; uygulamada sabit fiyat yazılmaz.
  const [products, setProducts] = useState<StoreProduct[]>([]);
  useEffect(() => {
    let alive = true;
    purchases.products().then((p) => alive && setProducts(p));
    return () => {
      alive = false;
    };
  }, []);
  const price = (id: string) => products.find((p) => p.id === id)?.priceLabel ?? null;
  const resultNote = (r: string, ok: string) =>
    r === 'purchased' ? ok : r === 'cancelled' ? 'Satın alma iptal edildi.' : r === 'unavailable' ? 'Satın alma bu sürümde yok.' : 'Satın alma tamamlanamadı.';

  return (
    <div
      className="page store overlay-page"
      role="dialog"
      aria-modal="true"
      aria-labelledby="store-title"
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <header className="page-bar">
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Kapat ve geri dön" autoFocus>
          <BackIcon />
        </button>
        <h1 id="store-title">Hak ve paketler</h1>
        <span className="pill" aria-label={`${profile.coins} jeton`}>
          <CoinIcon width={16} height={16} /> {profile.coins}
        </span>
      </header>

      <section className="store-section">
        <h2>Reklamsız sürüm</h2>
        {m.entitlements.noAds ? (
          <p className="small">
            <strong>Etkin.</strong> Araya giren reklam gösterilmez. Ödüllü reklamı istersen izleyebilirsin.
          </p>
        ) : (
          <div className="offer-card">
            <p className="small">
              Tek seferlik satın alma, süresiz. Araya giren reklamlar gösterilmez. Ödüllü reklamlar her zaman isteğe bağlıdır: istersen
              izleyip jeton kazanmaya devam edersin. Oyunun kendisi zaten ücretsiz; bu, oyunu destekleme seçeneğidir.
            </p>
            <button
              type="button"
              className="btn btn-primary btn-small"
              disabled={!m.purchasesAvailable || !price(PRODUCT_IDS.noAds)}
              onClick={async () => setFlash(resultNote(await m.buyNoAds(), 'Reklamsız sürüm etkin. Teşekkürler!'))}
            >
              {m.purchasesAvailable ? `Reklamsız sürüm · ${price(PRODUCT_IDS.noAds) ?? '…'}` : 'App Store sürümünde'}
            </button>
          </div>
        )}
        <RewardOffer />
      </section>

      <section className="store-section">
        <h2>Jeton keseleri</h2>
        <ul className="pouch-grid">
          {COIN_PACKS.map((p) => (
            <li key={p.productId} className={`pouch-card pouch-${p.size}`}>
              <span className="pouch-art-box">
                <CoinPouch size={p.size} className="pouch-art" />
              </span>
              <strong>{p.name}</strong>
              <span className="pouch-coins">
                {p.coins} <CoinIcon width={14} height={14} />
              </span>
              <span className="muted small">{Math.floor(p.coins / COINS_PER_CHARGE)} joker hakkı</span>
              <button
                type="button"
                className="btn btn-secondary btn-small"
                disabled={!m.purchasesAvailable || !price(p.productId)}
                onClick={async () => setFlash(resultNote(await m.buyCoins(p.productId), `+${p.coins} jeton eklendi.`))}
                aria-label={`${p.name}: ${p.coins} jeton${price(p.productId) ? `, ${price(p.productId)}` : ''}`}
              >
                {m.purchasesAvailable ? (price(p.productId) ?? '…') : 'App Store’da'}
              </button>
            </li>
          ))}
        </ul>
        <p className="muted small">
          Jetonlar ilerlemenle birlikte saklanır. iPhone uygulamasında iCloud açıksa yedeklenir ve aynı Apple Kimliğiyle yeni telefonda
          geri gelir; iCloud kapalıysa uygulamayı silince kaybolur. 1 joker hakkı {COINS_PER_CHARGE} jeton.
        </p>
      </section>

      <section className="store-section">
        <h2>Oynayarak kazan</h2>
        <ul className="earn-list">
          <li>Doğru cevap: +{COINS_PER_CORRECT} jeton</li>
          <li>Yardımsız, ilk denemede doğru: +{COINS_CLEAN_BONUS} jeton daha</li>
          <li>Günlük hedef: +{DAILY_GOAL_REWARD.coins} jeton ve her araçtan hediye hak</li>
        </ul>
        <p className="muted small">Oyunun tamamı ücretsiz oynanır; araçlar isteğe bağlı.</p>
        <ul className="charge-list">
          {STORE_TOOL_ORDER.map((tool) => {
            const Icon = TOOL_ICONS[tool];
            return (
              <li key={tool}>
                <span className={`tool-circle small tool-${tool}`} aria-hidden="true">
                  <Icon width={20} height={20} />
                </span>
                <div className="charge-info">
                  <strong>{TOOL_INFO[tool].name}</strong>
                  <span className="muted small">
                    kalan {profile.inventory[tool]} · {TOOL_INFO[tool].cost}
                  </span>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-small"
                  disabled={profile.coins < COINS_PER_CHARGE}
                  onClick={() => {
                    const next = buyChargeWithCoins(profile, tool);
                    if (next) {
                      setProfile(next);
                      setFlash(`+1 ${TOOL_INFO[tool].name} hakkı eklendi.`);
                    }
                  }}
                  aria-label={`${COINS_PER_CHARGE} jetonla +1 ${TOOL_INFO[tool].name} hakkı al`}
                >
                  +1 · {COINS_PER_CHARGE} <CoinIcon width={14} height={14} />
                </button>
              </li>
            );
          })}
        </ul>
        <p className="note note-good" role="status" aria-live="polite">
          {flash ?? ' '}
        </p>
      </section>

      <section className="store-section">
        <h2>Paketler</h2>
        <p className="muted small">Jetonla alınır; gerçek para yok. Tek tek almaktan daha ucuz.</p>
        <ul className="pack-list">
          {TOOL_PACKS.map((p) => (
            <li key={p.id}>
              <div>
                <strong>{p.name}</strong>
                <p className="small">{packContents(p)}</p>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-small"
                disabled={profile.coins < p.coins}
                onClick={() => {
                  const next = buyPackWithCoins(profile, p);
                  if (next) {
                    setProfile(next);
                    setFlash(`${p.name} alındı: ${packContents(p)}.`);
                  }
                }}
                aria-label={`${p.coins} jetonla ${p.name} al`}
              >
                {p.coins} <CoinIcon width={14} height={14} />
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
