import { useEffect } from 'react';
import { chapterInfo } from '../../core/campaign';
import { DAILY_PUZZLE_GOAL, currentStreak, goalDoneToday } from '../../core/daily';
import { languageInfo } from '../../core/languages';
import { displayWord } from '../../core/normalize';
import { DIFFICULTY_LABEL, POS_LABEL } from '../../core/pack';
import type { Profile } from '../../core/profile';
import type { PuzzleOutcome, PuzzleState } from '../../core/puzzle';
import { CheckIcon, CoinIcon, CrossIcon, FlameIcon } from '../components/Icons';

interface Props {
  puzzle: PuzzleState;
  outcome: PuzzleOutcome;
  profile: Profile;
  onAgain: () => void;
  onHome: () => void;
  onReview: () => void;
}

/** Bulmaca sonu: kelimelerin anlamları, örnek cümleler ve kazanılanlar. */
export function PuzzleResult({ puzzle, outcome, profile, onAgain, onHome, onReview }: Props) {
  // Telefonda sonuç en üstten başlasın (bulmaca ekranı kaydırılmış olabilir).
  useEffect(() => window.scrollTo(0, 0), []);
  const chapter = chapterInfo(profile.campaign);
  const src = languageInfo(puzzle.direction.source);
  const tgt = languageInfo(puzzle.direction.target);
  const total = outcome.results.length;
  const correct = outcome.results.filter((r) => r.status === 'correct').length;
  const clean = outcome.results.filter((r) => r.status === 'correct' && !r.helped && r.wrongAttempts === 0).length;
  const streak = currentStreak(profile.daily, new Date());
  const heading = correct === total ? (clean === total ? 'Kusursuz bulmaca!' : 'Bulmaca tamam!') : correct >= total / 2 ? 'Güzel iş!' : 'Her bulmaca bir adım';

  return (
    <div className="page summary">
      <header className="page-head">
        <h1>{heading}</h1>
        <p className="muted">
          {total} kelimeden {correct} tanesini çözdün{clean > 0 ? `, ${clean} tanesini hiç yardım almadan` : ''}.
        </p>
      </header>

      <div className="summary-stats">
        <div className="big-stat">
          <strong>{outcome.scoreTotal}</strong>
          <span>puan</span>
        </div>
        <div className="big-stat">
          <strong>
            <CoinIcon width={20} height={20} /> +{outcome.coinsEarned}
          </strong>
          <span>jeton</span>
        </div>
        <div className="big-stat">
          <strong>
            <FlameIcon width={20} height={20} /> {streak.streak}
          </strong>
          <span>günlük seri · {goalDoneToday(profile.daily, new Date()) ? 'bugün tamam' : `0/${DAILY_PUZZLE_GOAL} bulmaca`}</span>
        </div>
      </div>

      {outcome.chapterCompleted !== null ? (
        <p className="info-line good">
          Bölüm {outcome.chapterCompleted} tamamlandı! Sırada Bölüm {outcome.chapterCompleted + 1}.
        </p>
      ) : outcome.campaignCounted ? (
        <p className="info-line">
          Bölüm {chapter.chapter}: {chapter.done}/{chapter.size} bulmaca
        </p>
      ) : (
        !puzzle.topic && <p className="info-line">Bölümde ilerlemek için bulmacanın tüm kelimelerini çöz (yardım serbest).</p>
      )}
      {outcome.goalReached && <p className="info-line good">Günlük hedef tamamlandı! Jeton ve her araçtan hediye hak kazandın.</p>}
      {outcome.usedRestDay && <p className="info-line">Dün ara verdin; haftalık dinlenme günün kullanıldı, serin sürüyor.</p>}
      {outcome.levelChange === 'up' && outcome.difficultyAfter && (
        <p className="info-line good">Çok iyi gidiyorsun — sıradaki bulmaca {DIFFICULTY_LABEL[outcome.difficultyAfter]} seviyesinde.</p>
      )}
      {outcome.levelChange === 'down' && outcome.difficultyAfter && (
        <p className="info-line">Sıradaki bulmacayı biraz hafiflettik ({DIFFICULTY_LABEL[outcome.difficultyAfter]}).</p>
      )}

      <ul className="cw-results" aria-label="Bulmacadaki kelimeler">
        {outcome.results.map((r) => {
          const q = r.question;
          const ok = r.status === 'correct';
          return (
            <li key={r.word} className={ok ? 's-correct' : 's-failed'}>
              <details>
                <summary>
                  <span className="s-icon" aria-hidden="true">
                    {ok ? <CheckIcon width={18} height={18} /> : <CrossIcon width={18} height={18} />}
                  </span>
                  <span className="sr-only">{ok ? 'Çözüldü' : 'Çözülmedi'}:</span>
                  <span lang={q.source}>{q.prompt}</span>
                  <span aria-hidden="true" className="arrow">
                    →
                  </span>
                  <strong lang={q.target}>{displayWord(r.answer, q.target)}</strong>
                  {ok && r.helped && <span className="chip reason-helped">yardımla</span>}
                  <span className="s-points">{r.score.total > 0 ? `+${r.score.total}` : ''}</span>
                </summary>
                <div className="cw-result-body">
                  <p className="q-meta">
                    <span className="chip">{POS_LABEL[q.pos]}</span>
                    <span className="chip">Seviye ≈ {q.level}</span>
                    <span className="chip chip-soft">{q.topic}</span>
                  </p>
                  {q.meaningHint && (
                    <p className="meaning">
                      <strong>Anlamı:</strong> {q.meaningHint}
                    </p>
                  )}
                  {q.accepted.length > 1 && (
                    <p className="alts">
                      <strong>Diğer karşılıklar:</strong>{' '}
                      <span lang={q.target}>{q.accepted.filter((a) => a !== r.answer).join(', ')}</span>
                    </p>
                  )}
                  {(q.targetExample || q.sourceExample) && (
                    <div className="examples">
                      {q.targetExample && (
                        <p>
                          <span className="ex-lang">{tgt.name}</span> <span lang={q.target}>{q.targetExample}</span>
                        </p>
                      )}
                      {q.sourceExample && (
                        <p>
                          <span className="ex-lang">{src.name}</span> <span lang={q.source}>{q.sourceExample}</span>
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </details>
            </li>
          );
        })}
      </ul>
      <p className="muted small center">Bir kelimeye dokun: anlamı ve örnek cümleler açılır.</p>

      {outcome.addedToReview > 0 && (
        <p className="info-line">{outcome.addedToReview} kelime tekrar listene eklendi. İstediğin zaman çalışabilirsin; acelesi yok.</p>
      )}
      {outcome.removedFromReview > 0 && (
        <p className="info-line good">{outcome.removedFromReview} kelimeyi artık biliyorsun — tekrar listenden çıkarıldı.</p>
      )}

      <div className="stack">
        <button type="button" className="btn btn-primary btn-block" onClick={onAgain}>
          {puzzle.topic ? 'Yeni konu bulmacası' : 'Sıradaki bulmaca'}
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
