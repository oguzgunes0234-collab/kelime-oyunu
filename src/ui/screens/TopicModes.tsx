import { MIN_TOPIC_WORDS, topicStatuses } from '../../core/topics';
import type { WordPack } from '../../core/types';
import { BackIcon } from '../components/Icons';

interface Props {
  pack: WordPack;
  onBack: () => void;
  onPlay: (topicId: string) => void;
}

/**
 * Konu modları. Yalnızca yeterli sayıda gözden geçirilmiş kelimesi olan mod
 * oynanabilir; diğerleri durumlarıyla birlikte "Hazırlanıyor" diye görünür.
 * Konu bulmacaları bölüm ilerlemesini değiştirmez.
 */
export function TopicModes({ pack, onBack, onPlay }: Props) {
  const statuses = topicStatuses(pack);
  return (
    <div className="page topics">
      <header className="page-bar">
        <button type="button" className="icon-btn" onClick={onBack} aria-label="Geri">
          <BackIcon />
        </button>
        <h1>Konu modları</h1>
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
                <small>{s.reviewed} kelime</small>
              ) : (
                <small>
                  Hazırlanıyor · {s.reviewed}/{MIN_TOPIC_WORDS} gözden geçirilmiş kelime
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
        Bir mod, en az {MIN_TOPIC_WORDS} kelimesi gözden geçirilince açılır. Bu sayı, aynı kelimeler çabuk tekrar etmesin diye seçildi.
      </p>
    </div>
  );
}
