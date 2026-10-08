import { languageInfo } from '../../core/languages';
import { POS_LABEL } from '../../core/pack';
import { removeReview, type Profile, type ReviewReason } from '../../core/profile';
import { reviewQuestion } from '../../core/select';
import type { WordPack } from '../../core/types';
import { BackIcon, BookIcon } from '../components/Icons';
import { SpeakButton } from '../components/SpeakButton';

interface Props {
  pack: WordPack;
  profile: Profile;
  setProfile: (p: Profile) => void;
  onBack: () => void;
  onStudy: () => void;
}

const REASON: Record<ReviewReason, string> = { wrong: 'Yanlış', skipped: 'Pas', helped: 'Yardımla' };

export function Review({ pack, profile, setProfile, onBack, onStudy }: Props) {
  const items = profile.review
    .map((item) => ({ item, q: reviewQuestion(pack, item) }))
    .filter((x) => x.q)
    .sort((a, b) => b.item.misses - a.item.misses || b.item.addedAt - a.item.addedAt);

  return (
    <div className="page review">
      <header className="page-bar">
        <button type="button" className="icon-btn" onClick={onBack} aria-label="Geri">
          <BackIcon />
        </button>
        <h1>Tekrar listesi</h1>
      </header>

      {items.length === 0 ? (
        <div className="empty">
          <span className="empty-icon" aria-hidden="true">
            <BookIcon width={40} height={40} />
          </span>
          <h2>Tekrar listen boş</h2>
          <p>Yanlış yaptığın, pas geçtiğin ya da yardımla çözdüğün kelimeler buraya gelir. Yardımsız bilince listeden çıkar.</p>
          <button type="button" className="btn btn-primary" onClick={onBack}>
            Oynamaya dön
          </button>
        </div>
      ) : (
        <>
          <p className="muted">
            {items.length} kelime. Tekrar çalışmasında her birini yeniden sorarız; yardımsız doğru bilirsen listeden çıkar.
          </p>
          <button type="button" className="btn btn-primary btn-block" onClick={onStudy}>
            Tekrar çalış ({Math.min(items.length, 10)} kelime)
          </button>
          <ul className="review-list">
            {items.map(({ item, q }) => (
              <li key={`${item.dir}:${item.entryId}`}>
                <div className="rv-main">
                  <p className="rv-pair">
                    <span lang={q!.source}>{q!.prompt}</span>
                    {q!.source === 'en' && <SpeakButton text={q!.prompt} lang="en" />}
                    <span aria-hidden="true" className="arrow">
                      →
                    </span>
                    <strong lang={q!.target}>{q!.answer}</strong>
                    {q!.target === 'en' && <SpeakButton text={q!.answer} lang="en" />}
                  </p>
                  <p className="rv-meta">
                    <span className={`chip reason-${item.reason}`}>{REASON[item.reason]}</span>
                    <span className="chip">{POS_LABEL[q!.pos]}</span>
                    <span className="chip">≈ {q!.level}</span>
                    <span className="muted small">
                      {languageInfo(q!.source).name} → {languageInfo(q!.target).name}
                      {item.misses > 1 ? ` · ${item.misses} kez` : ''}
                    </span>
                  </p>
                  {q!.targetExample && (
                    <p className="rv-ex" lang={q!.target}>
                      {q!.targetExample}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-small"
                  onClick={() => setProfile(removeReview(profile, item.dir, item.entryId))}
                  aria-label={`${q!.prompt} kelimesini listeden çıkar`}
                >
                  Çıkar
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
