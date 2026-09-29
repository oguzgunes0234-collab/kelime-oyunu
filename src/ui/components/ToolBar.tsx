import { TOOL_INFO, TOOL_ORDER } from '../../core/economy';
import type { Inventory, ToolId } from '../../core/types';
import { TOOL_ICONS } from './Icons';

interface Props {
  inventory: Inventory;
  /** Aracın şu an işe yarayıp yaramadığı (ör. boş cevapta geri al). */
  usable: Record<ToolId, boolean>;
  onUse: (tool: ToolId) => void;
  onInfo: () => void;
  /** Eğitimde haklar harcanmaz. */
  free?: boolean;
  pulse?: ToolId | null;
}

/**
 * Oyun ekranının altındaki dört dairesel araç. Hak sıfırken düğme devre dışı
 * BIRAKILMAZ: dokununca oyunu engellemeyen bir bilgi penceresi açılır.
 */
export function ToolBar({ inventory, usable, onUse, onInfo, free, pulse }: Props) {
  return (
    <div className="toolbar" role="toolbar" aria-label="Yardım araçları">
      {TOOL_ORDER.map((tool) => {
        const Icon = TOOL_ICONS[tool];
        const info = TOOL_INFO[tool];
        const count = inventory[tool];
        const empty = !free && count === 0;
        const label = `${info.name}: ${info.does} ${free ? 'Eğitimde ücretsiz.' : `Kalan hak: ${count}. Bedel: ${info.cost}.`}`;
        return (
          <button
            key={tool}
            type="button"
            className={`tool tool-${tool}${empty ? ' is-empty' : ''}${!usable[tool] ? ' is-idle' : ''}${pulse === tool ? ' coach-pulse' : ''}`}
            onClick={() => onUse(tool)}
            aria-label={label}
            data-coach={`tool-${tool}`}
          >
            <span className="tool-circle">
              <Icon width={26} height={26} />
              <span className="tool-badge" aria-hidden="true">
                {free ? '∞' : count}
              </span>
            </span>
            <span className="tool-name" aria-hidden="true">
              {info.name}
            </span>
          </button>
        );
      })}
      <button type="button" className="tool-info" onClick={onInfo} aria-label="Araçlar nasıl çalışır ve bedelleri nedir?">
        ?
      </button>
    </div>
  );
}
