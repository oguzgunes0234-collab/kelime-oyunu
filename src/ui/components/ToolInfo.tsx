import { COINS_CLEAN_BONUS, COINS_PER_CHARGE, COINS_PER_CORRECT, DAILY_GOAL_REWARD, TOOL_INFO, TOOL_ORDER } from '../../core/economy';
import type { Inventory } from '../../core/types';
import { TOOL_ICONS } from './Icons';
import { Sheet } from './Sheet';

export function ToolInfo({ inventory, onClose }: { inventory: Inventory; onClose: () => void }) {
  return (
    <Sheet title="Yardım araçları" onClose={onClose}>
      <ul className="tool-info-list">
        {TOOL_ORDER.map((tool) => {
          const Icon = TOOL_ICONS[tool];
          return (
            <li key={tool}>
              <span className={`tool-circle small tool-${tool}`}>
                <Icon width={20} height={20} />
              </span>
              <div>
                <strong>{TOOL_INFO[tool].name}</strong> <span className="muted">· kalan {inventory[tool]}</span>
                <p>{TOOL_INFO[tool].does}</p>
                <p className="cost">{TOOL_INFO[tool].cost}</p>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="note">
        <p>
          <strong>Temizle</strong> ve <strong>Pas geç</strong> her zaman ücretsizdir. Haklar bitse de oyun sürer.
        </p>
        <p>
          Hak kazanmak için oyna: doğru cevap +{COINS_PER_CORRECT} jeton, yardımsız ilk denemede +{COINS_CLEAN_BONUS} jeton daha. Günlük
          hedefte +{DAILY_GOAL_REWARD.coins} jeton ve her araçtan hediye hak. {COINS_PER_CHARGE} jeton = 1 hak.
        </p>
      </div>
      <button type="button" className="btn btn-primary btn-block" onClick={onClose}>
        Anladım
      </button>
    </Sheet>
  );
}
