import { useState } from 'react';
import { useMonetization } from '../monetization';
import { CoinIcon } from './Icons';

/**
 * İsteğe bağlı ödül teklifi: oyuncu açıkça dokunursa ödüllü reklam izler ve
 * önceden yazan jetonu alır. Reklamsız kullanıcı aynı ödülü reklamsız alır.
 * Yalnızca bulmaca bittikten sonra ve mağazada görünür; kelime çözerken asla.
 * Günlük hak bittiyse ya da ortamda reklam yoksa hiç çizilmez.
 */
export function RewardOffer({ compact = false }: { compact?: boolean }) {
  const m = useMonetization();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  if (!m.rewardOffered) return null;
  if (m.rewardsLeftToday <= 0) {
    return note ? (
      <p className="reward-note" role="status">
        {note}
      </p>
    ) : null;
  }

  const label = m.entitlements.noAds ? `Reklamsız bonus: +${m.rewardCoins} jeton al` : `Reklam izle: +${m.rewardCoins} jeton`;
  return (
    <div className={`reward-offer${compact ? ' compact' : ''}`}>
      <button
        type="button"
        className="btn btn-secondary btn-small"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const got = await m.claimReward();
          setBusy(false);
          setNote(got ? `+${got} jeton eklendi.` : 'Reklam yarıda kaldı; ödül verilmedi.');
        }}
      >
        <CoinIcon width={14} height={14} /> {label}
      </button>
      <span className="muted small">
        bugün {m.rewardsLeftToday} hak{note ? ` · ${note}` : ''}
      </span>
    </div>
  );
}
