import { languageInfo } from '../../core/languages';
import { DIFFICULTY_LABEL, POS_LABEL } from '../../core/pack';
import type { RoundOutcome } from '../../core/profile';
import type { Question } from '../../core/types';
import { BookIcon, CheckIcon, CoinIcon } from '../components/Icons';
import { Sheet } from '../components/Sheet';

interface Props {
  question: Question;
  outcome: RoundOutcome;
  isLast: boolean;
  tutorial: boolean;
  onNext: () => void;
}

const REVIEW_REASON: Record<string, string> = {
  wrong: 'Doğru cevaplayamadığın için',
  skipped: 'Pas geçtiğin için',
  helped: 'Yardım aldığın için',
};

/** Tur sonu: doğru cevap, puan ve kısa öğretici bilgi. */
export function RoundResult({ question: q, outcome, isLast, tutorial, onNext }: Props) {
  const src = languageInfo(q.source);
  const tgt = languageInfo(q.target);
  const correct = outcome.status === 'correct';
  const others = q.accepted.slice(1);
  const title = correct ? 'Doğru!' : outcome.status === 'skipped' ? 'Pas geçildi' : 'Bu sefer olmadı';

  return (
    <Sheet title={title} className={`result result-${outcome.status}`} initialFocus=".result-next">
      <div className="result-head" aria-hidden="true">
        <span className="result-icon">{correct ? <CheckIcon width={28} height={28} /> : <BookIcon width={24} height={24} />}</span>
        {correct && (
          <span className="result-points">
            +{outcome.score.total} puan{tutorial && <small> · örnek</small>}
          </span>
        )}
        {outcome.coinsEarned > 0 && (
          <span className="result-coins">
            <CoinIcon width={16} height={16} /> +{outcome.coinsEarned}
          </span>
        )}
      </div>
      {correct && <p className="sr-only">{`${outcome.score.total} puan, ${outcome.coinsEarned} jeton kazandın.`}</p>}

      <div className="word-card">
        <p className="word-pair">
          <span lang={q.source} className="word-src">
            {q.prompt}
          </span>
          <span aria-hidden="true" className="arrow">
            →
          </span>
          <span className="sr-only">{tgt.name} karşılığı:</span>
          <span lang={q.target} className="word-tgt">
            {q.answer}
          </span>
        </p>
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
        {others.length > 0 && (
          <p className="alts">
            <strong>Diğer kabul edilen karşılıklar:</strong> <span lang={q.target}>{others.join(', ')}</span>
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

      {!correct && (
        <p className="teach">
          “{q.prompt}” {tgt.inName} <strong lang={q.target}>“{q.answer}”</strong> demektir.
          {!tutorial && ' Bu kelimeyi tekrar listene ekledik; birazdan ya da sonra yeniden çalışabilirsin.'}
        </p>
      )}
      {correct && outcome.addedToReview && !tutorial && (
        <p className="info-line">{REVIEW_REASON[outcome.addedToReview]} kelime tekrar listene eklendi.</p>
      )}
      {outcome.removedFromReview && <p className="info-line good">Bu kelimeyi artık biliyorsun — tekrar listenden çıkarıldı.</p>}
      {outcome.goalReached && (
        <p className="info-line good">Günlük hedef tamamlandı! Jeton ve her araçtan hediye hak kazandın.</p>
      )}
      {outcome.usedRestDay && <p className="info-line">Dün ara verdin; haftalık dinlenme günün kullanıldı, serin sürüyor.</p>}
      {outcome.levelChange === 'up' && outcome.difficultyAfter && (
        <p className="info-line good">Son turlarda çok iyiydin — zorluk {DIFFICULTY_LABEL[outcome.difficultyAfter]} seviyesine çıktı.</p>
      )}
      {outcome.levelChange === 'down' && outcome.difficultyAfter && (
        <p className="info-line">Zorluğu biraz hafiflettik ({DIFFICULTY_LABEL[outcome.difficultyAfter]}). Pekiştirince yine yükselir.</p>
      )}

      {correct && outcome.score.lines.length > 0 && (
        <details className="score-lines">
          <summary>Puan dökümü</summary>
          <ul>
            {outcome.score.lines.map((l) => (
              <li key={l.label}>
                <span>{l.label}</span>
                <span className={l.points < 0 ? 'neg' : ''}>{l.points > 0 ? `+${l.points}` : l.points}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {tutorial && (
        <p className="coach-inline">
          Her turdan sonra anlamı, kelime türünü, örnek cümleyi ve seviyeyi burada görürsün. Yanlış, pas ya da yardımla çözülen kelimeler
          tekrar listene eklenir.
        </p>
      )}

      <button type="button" className="btn btn-primary btn-block result-next" onClick={onNext}>
        {tutorial ? 'Oynamaya başla' : isLast ? 'Sonuçları gör' : 'Devam'}
      </button>
    </Sheet>
  );
}
