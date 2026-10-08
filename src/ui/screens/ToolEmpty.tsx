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
  /** Bulmacada gösterilecek ad (araç adları her yerde aynı: Anlam, Harf aç). */
  name?: string;
  /** Hangi eylemlerin her zaman ücretsiz olduğunu anlatan cümle. */
  freeNote?: string;
}

/**
 * Hak bitince, yalnızca oyuncu o araca dokunduğunda açılan pencere. Oyunu
 * durdurmaz; yanlış cevapta ya da takılınca kendiliğinden açılmaz.
 *
 * Seçenekler oyuncunun jetonuna göre sıralanır:
 * - Jeton yetiyorsa: tek hak al (öne çıkan), Hak ve paketler, araçsız devam.
 * - Yetmiyorsa: araçsız devam (öne çıkan) ve jetonun nasıl kazanılacağı;
 *   Hak ve paketler yine görünür. İşe yaramayacak "satın al" gösterilmez.
 * Mağaza jetonla çalışır; gerçek para yoktur.
 */
export function ToolEmpty({ tool, profile, setProfile, onClose, onOpenStore, name, freeNote }: Props) {
  const info = { ...TOOL_INFO[tool], name: name ?? TOOL_INFO[tool].name };
  const canBuy = profile.coins >= COINS_PER_CHARGE;

  const buy = (
    <button
      type="button"
      className="btn btn-primary btn-block"
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
  );
  const store = (
    <button type="button" className="btn btn-secondary btn-block" onClick={onOpenStore}>
      Hak ve paketler · jetonla
    </button>
  );
  const goOn = (primary: boolean) => (
    <button type="button" className={`btn ${primary ? 'btn-primary' : 'btn-secondary'} btn-block`} onClick={onClose}>
      Araçsız devam et
    </button>
  );

  return (
    <Sheet title={`${info.name} hakkın kalmadı`} onClose={onClose}>
      <p>Oyuna araçsız devam edebilirsin; hiçbir bulmaca buna bağlı değil. {freeNote ?? 'Harfe dokunup geri almak ve “Pas geç” her zaman ücretsiz.'}</p>
      <div className="note">
        <p>
          <strong>Oynayarak kazan:</strong> doğru cevap +{COINS_PER_CORRECT} jeton, yardımsız ilk denemede +{COINS_CLEAN_BONUS}. Günlük
          hedefte +{DAILY_GOAL_REWARD.coins} jeton ve {info.name} dahil her araçtan hediye hak.
        </p>
        {!canBuy && (
          <p>
            Jetonun {profile.coins}; bir hak {COINS_PER_CHARGE} jeton. Bu bulmacayı bitirince jeton kazanırsın.
          </p>
        )}
      </div>
      <div className="stack">
        {canBuy ? (
          <>
            {buy}
            {store}
            {goOn(false)}
          </>
        ) : (
          <>
            {goOn(true)}
            {store}
          </>
        )}
      </div>
    </Sheet>
  );
}
