import { DAILY_PUZZLE_GOAL, currentStreak, goalDoneToday } from '../../core/daily';
import type { Profile } from '../../core/profile';
import { sessionScore, type Session } from '../../core/session';
import { CheckIcon, CrossIcon, FlameIcon } from '../components/Icons';

interface Props {
  session: Session;
  profile: Profile;
  onHome: () => void;
  onAgain: () => void;
  onReview: () => void;
}

export function Summary({ session, profile, onHome, onAgain, onReview }: Props) {
  const correct = session.rounds.filter((r) => r.outcome.status === 'correct').length;
  const total = session.rounds.length;
  const score = sessionScore(session);
  const streak = currentStreak(profile.daily, new Date());
  const newReview = session.rounds.filter((r) => r.outcome.addedToReview).length;
  const heading =
    total === 0 ? 'Oturum bitti' : correct === total ? 'Kusursuz tur!' : correct >= total / 2 ? 'Güzel iş!' : 'Her tur bir adım';

  return (
    <div className="page summary">
      <header className="page-head">
        <h1>{heading}</h1>
        <p className="muted">
          {total > 0 ? `${total} kelimeden ${correct} tanesini bildin.` : 'Bu oturumda kelime oynanmadı.'}
        </p>
      </header>

      <div className="summary-stats">
        <div className="big-stat">
          <strong>{score}</strong>
          <span>puan</span>
        </div>
        <div className="big-stat">
          <strong>{goalDoneToday(profile.daily, new Date()) ? '✓' : `0/${DAILY_PUZZLE_GOAL}`}</strong>
          <span>günlük hedef (bulmaca)</span>
        </div>
        <div className="big-stat">
          <strong>
            <FlameIcon width={20} height={20} /> {streak.streak}
          </strong>
          <span>günlük seri</span>
        </div>
      </div>

      {total > 0 && (
        <ul className="summary-list" aria-label="Oturumdaki kelimeler">
          {session.rounds.map((r, i) => (
            <li key={i} className={`s-${r.outcome.status}`}>
              <span className="s-icon" aria-hidden="true">
                {r.outcome.status === 'correct' ? <CheckIcon width={18} height={18} /> : <CrossIcon width={18} height={18} />}
              </span>
              <span className="sr-only">{r.outcome.status === 'correct' ? 'Doğru' : r.outcome.status === 'skipped' ? 'Pas' : 'Yanlış'}:</span>
              <span lang={r.question.source}>{r.question.prompt}</span>
              <span aria-hidden="true" className="arrow">
                →
              </span>
              <strong lang={r.question.target}>{r.question.answer}</strong>
              <span className="s-points">{r.outcome.score.total > 0 ? `+${r.outcome.score.total}` : ''}</span>
            </li>
          ))}
        </ul>
      )}

      {newReview > 0 && (
        <p className="info-line">
          {newReview} kelime tekrar listene eklendi. İstediğin zaman çalışabilirsin; acelesi yok.
        </p>
      )}

      <div className="stack">
        <button type="button" className="btn btn-primary btn-block" onClick={onAgain} autoFocus>
          Yeni tur
        </button>
        {profile.review.length > 0 && (
          <button type="button" className="btn btn-secondary btn-block" onClick={onReview}>
            Tekrar listesi ({profile.review.length})
          </button>
        )}
        <button type="button" className="btn btn-ghost btn-block" onClick={onHome}>
          Ana sayfa
        </button>
      </div>
    </div>
  );
}
