import { COINS_CLEAN_BONUS, COINS_PER_CHARGE, COINS_PER_CORRECT, DAILY_GOAL_REWARD, TOOL_INFO } from '../../core/economy';
import { buyChargeWithCoins, type Profile } from '../../core/profile';
import type { ToolId } from '../../core/types';
import { Sheet } from '../components/Sheet';

interface Props {
  tool: ToolId;
  profile: Profile;
  setProfile: (p: Profile) => void;
  onClose: () => void;
  onOpenStore: () => void;
}

/**
 * Hak bitince açılan bilgi penceresi. Oyunu durdurmaz, ödeme ekranına
 * yönlendirmez; paketler yalnızca oyuncu açıkça isterse görünür.
 */
export function ToolEmpty({ tool, profile, setProfile, onClose, onOpenStore }: Props) {
  const info = TOOL_INFO[tool];
  const canBuy = profile.coins >= COINS_PER_CHARGE;

  return (
    <Sheet title={`${info.name} hakkın kalmadı`} onClose={onClose}>
      <p>Oyuna araçsız devam edebilirsin; hiçbir tur buna bağlı değil. Temizle ve Pas geç her zaman ücretsiz.</p>
      <div className="note">
        <p>
          <strong>Oynayarak kazan:</strong> doğru cevap +{COINS_PER_CORRECT} jeton, yardımsız ilk denemede +{COINS_CLEAN_BONUS}. Günlük
          hedefte +{DAILY_GOAL_REWARD.coins} jeton ve {info.name} dahil her araçtan hediye hak.
        </p>
      </div>
      <button
        type="button"
        className="btn btn-primary btn-block"
        disabled={!canBuy}
        onClick={() => {
          const next = buyChargeWithCoins(profile, tool);
          if (next) {
            setProfile(next);
            onClose();
          }
        }}
      >
        {COINS_PER_CHARGE} jetonla +1 {info.name} hakkı al
        <small> (jetonun: {profile.coins})</small>
      </button>
      <div className="btn-row">
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Araçsız devam et
        </button>
        <button type="button" className="btn btn-ghost" onClick={onOpenStore}>
          Hak ve paketler
        </button>
      </div>
    </Sheet>
  );
}
