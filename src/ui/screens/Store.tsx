import { useState } from 'react';
import { COINS_CLEAN_BONUS, COINS_PER_CHARGE, COINS_PER_CORRECT, DAILY_GOAL_REWARD, TOOL_INFO, TOOL_ORDER } from '../../core/economy';
import { buyChargeWithCoins, type Profile } from '../../core/profile';
import { BackIcon, CoinIcon, TOOL_ICONS } from '../components/Icons';
import { Sheet } from '../components/Sheet';

interface Props {
  profile: Profile;
  setProfile: (p: Profile) => void;
  onClose: () => void;
}

/**
 * PROTOTİP paketler. Fiyatlar örnektir; "Satın al" hiçbir ödeme başlatmaz ve
 * hesaba hiçbir şey eklemez, yalnızca bunun prototip olduğunu açıklar.
 * İçerik ve fiyat önceden görünür; rastgele ödül yoktur.
 */
const MOCK_PACKS = [
  { id: 'small', name: 'Küçük yardım paketi', contents: '5 Mıknatıs · 5 İpucu', price: '₺19,99' },
  { id: 'large', name: 'Büyük yardım paketi', contents: '15 Mıknatıs · 15 İpucu · 10 Karıştır · 10 Geri al', price: '₺49,99' },
  { id: 'theme', name: 'Görsel tema: Gece Bahçesi', contents: 'Yalnızca görünüm değişir; oyuna avantaj sağlamaz', price: '₺14,99' },
];

export function Store({ profile, setProfile, onClose }: Props) {
  const [mock, setMock] = useState<(typeof MOCK_PACKS)[number] | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  return (
    <div
      className="page store overlay-page"
      role="dialog"
      aria-modal="true"
      aria-labelledby="store-title"
      onKeyDown={(e) => e.key === 'Escape' && !mock && onClose()}
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

      <section className="store-section mock">
        <h2>
          Paketler <span className="badge-proto">Prototip</span>
        </h2>
        <p className="proto-banner">
          Bu bölüm yalnızca tasarım prototipidir. Gerçek ödeme yoktur: düğmeler para çekmez ve hesabına bir şey eklemez. Fiyatlar
          örnektir.
        </p>
        <ul className="pack-list">
          {MOCK_PACKS.map((p) => (
            <li key={p.id}>
              <div>
                <strong>{p.name}</strong>
                <p className="small">{p.contents}</p>
                <p className="small muted">Örnek fiyat: {p.price} · içerik sabittir, rastgele ödül yok</p>
              </div>
              <button type="button" className="btn btn-secondary btn-small" onClick={() => setMock(p)}>
                İncele
              </button>
            </li>
          ))}
        </ul>
      </section>

      {mock && (
        <Sheet title={mock.name} onClose={() => setMock(null)}>
          <p>
            <strong>İçerik:</strong> {mock.contents}
          </p>
          <p>
            <strong>Örnek fiyat:</strong> {mock.price}
          </p>
          <p className="proto-banner">
            Bu bir prototip. Satın alma bu sürümde devre dışı; ödeme alınmaz ve hesabına hak eklenmez.
          </p>
          <button type="button" className="btn btn-primary btn-block" onClick={() => setMock(null)}>
            Anladım, kapat
          </button>
        </Sheet>
      )}
    </div>
  );
}
