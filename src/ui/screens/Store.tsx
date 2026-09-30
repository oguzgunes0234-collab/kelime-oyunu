import { useState } from 'react';
import {
  COINS_CLEAN_BONUS,
  COINS_PER_CHARGE,
  COINS_PER_CORRECT,
  DAILY_GOAL_REWARD,
  TOOL_INFO,
  TOOL_ORDER,
  TOOL_PACKS,
  type ToolPack,
} from '../../core/economy';
import { buyChargeWithCoins, buyPackWithCoins, type Profile } from '../../core/profile';
import type { ToolId } from '../../core/types';
import { BackIcon, CoinIcon, TOOL_ICONS } from '../components/Icons';

interface Props {
  profile: Profile;
  setProfile: (p: Profile) => void;
  onClose: () => void;
}

/** "5 Mıknatıs · 5 İpucu" gibi okunur içerik. */
function packContents(p: ToolPack): string {
  return (TOOL_ORDER.filter((t) => p.tools[t]) as ToolId[]).map((t) => `${p.tools[t]} ${TOOL_INFO[t].name}`).join(' · ');
}

export function Store({ profile, setProfile, onClose }: Props) {
  const [flash, setFlash] = useState<string | null>(null);

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
        <h2>Oynayarak kazan</h2>
        <ul className="earn-list">
          <li>Doğru cevap: +{COINS_PER_CORRECT} jeton</li>
          <li>Yardımsız, ilk denemede doğru: +{COINS_CLEAN_BONUS} jeton daha</li>
          <li>Günlük hedef: +{DAILY_GOAL_REWARD.coins} jeton ve her araçtan hediye hak</li>
        </ul>
        <p className="muted small">Oyunun tamamı satın alma yapmadan oynanabilir. Araçlar isteğe bağlıdır.</p>
        <ul className="charge-list">
          {TOOL_ORDER.map((tool) => {
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
