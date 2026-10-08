import { MIN_TOPIC_WORDS, topicStatuses } from '../../core/topics';
import type { WordPack } from '../../core/types';
import { BackIcon } from '../components/Icons';

interface Props {
  pack: WordPack;
  onBack: () => void;
  onPlay: (topicId: string) => void;
}

/**
 * Konu modları. Yeterli kelimesi olan mod oynanabilir; eksik olan kaç kelime
 * kaldığıyla birlikte "Hazırlanıyor" diye görünür; hiç kelimesi olmayan görünmez.
 * Konu bulmacaları bölüm ilerlemesini değiştirmez.
 */
export function TopicModes({ pack, onBack, onPlay }: Props) {
  // Hiç kelimesi olmayan mod gösterilmez (ör. içeriği henüz onay bekleyen Geçmiş zaman).
  const statuses = topicStatuses(pack).filter((s) => s.total > 0);
  return (
    <div className="page topics">
      <header className="page-bar">
        <button type="button" className="icon-btn" onClick={onBack} aria-label="Geri">
          <BackIcon />
        </button>
        <h1>Konular</h1>
      </header>
      <p className="muted">
        Tek bir kelime grubuyla bulmaca çöz. Konu bulmacaları bölüm ilerlemeni değiştirmez; tamamladığın bulmaca günlük hedefe sayılır.
      </p>
      <ul className="topic-list">
        {statuses.map((s) => (
          <li key={s.mode.id} className={s.enabled ? 'is-open' : 'is-locked'}>
            <div className="topic-text">
              <strong>{s.mode.name}</strong>
              {s.enabled ? (
                <small>{s.total} kelime</small>
              ) : (
                <small>
                  Hazırlanıyor · {s.total}/{MIN_TOPIC_WORDS} kelime
                </small>
              )}
            </div>
            {s.enabled ? (
              <button type="button" className="btn btn-primary btn-small" onClick={() => onPlay(s.mode.id)}>
                Oyna
              </button>
            ) : (
              <span className="chip chip-soft">Yakında</span>
            )}
          </li>
        ))}
      </ul>
      <p className="muted small">
        Bir mod en az {MIN_TOPIC_WORDS} kelimeyle açılır. Bu sayı, aynı kelimeler çabuk tekrar etmesin diye seçildi.
      </p>
    </div>
  );
}
