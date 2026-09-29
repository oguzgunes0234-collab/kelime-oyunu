import { languageInfo } from '../../core/languages';
import { DIFFICULTY_LABEL } from '../../core/pack';
import type { SessionConfig } from '../../core/session';
import type { Difficulty } from '../../core/types';

interface Props {
  config: SessionConfig;
  difficulty: Difficulty;
  played: number;
  reviewCount: number;
  onRepeat: () => void;
  onSwitchDirection: () => void;
  onReview: () => void;
  onHome: () => void;
}

/** Seçili seviyede henüz doğru bilinmemiş kelime kalmadı. */
export function Exhausted({ config, difficulty, played, reviewCount, onRepeat, onSwitchDirection, onReview, onHome }: Props) {
  const src = languageInfo(config.direction.source).name;
  const tgt = languageInfo(config.direction.target).name;
  return (
    <div className="page exhausted">
      <div className="empty-art" aria-hidden="true">
        <span>A</span>
        <span>B</span>
        <span>C</span>
      </div>
      <h1>Bu havuzdaki bütün kelimeleri bildin!</h1>
      <p>
        {src} → {tgt}, {DIFFICULTY_LABEL[difficulty]} seviyesinde her kelimeyi en az bir kez doğru cevapladın
        {played > 0 ? ` (bu oturumda ${played} kelime oynadın)` : ''}. Başlangıç paketi küçük tutuldu; yeni kelimeler ileride eklenebilir.
      </p>
      <div className="stack">
        <button type="button" className="btn btn-primary btn-block" onClick={onRepeat} autoFocus>
          Bildiklerimi karışık tekrar et
        </button>
        <button type="button" className="btn btn-secondary btn-block" onClick={onSwitchDirection}>
          Yönü çevir: {tgt} → {src}
        </button>
        {reviewCount > 0 && (
          <button type="button" className="btn btn-secondary btn-block" onClick={onReview}>
            Tekrar listesini çalış ({reviewCount})
          </button>
        )}
        <button type="button" className="btn btn-ghost btn-block" onClick={onHome}>
          Ana sayfa
        </button>
      </div>
    </div>
  );
}
