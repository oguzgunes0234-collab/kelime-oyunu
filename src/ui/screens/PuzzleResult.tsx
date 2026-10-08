import { useEffect } from 'react';
import { toCase } from '../../core/campaign';
import { DAILY_PUZZLE_GOAL, currentStreak, goalDoneToday } from '../../core/daily';
import { languageInfo } from '../../core/languages';
import { displayWord } from '../../core/normalize';
import { DIFFICULTY_LABEL, POS_LABEL } from '../../core/pack';
import { PRACTICE_COINS_PER_WORD } from '../../core/economy';
import type { Profile } from '../../core/profile';
import type { PuzzleOutcome, PuzzleState } from '../../core/puzzle';
import { SpeakButton } from '../components/SpeakButton';
import { CheckIcon, CoinIcon, CrossIcon, FlameIcon } from '../components/Icons';

interface Props {
  puzzle: PuzzleState;
  outcome: PuzzleOutcome;
  profile: Profile;
  onAgain: () => void;
  onHome: () => void;
  onReview: () => void;
  /** Pekiştirilecek kelimeler (hedef dilde; boşsa pekiştirme kartı yok). */
  practiceWords: string[];
  practiceDone: { coins: number; mastered: number; total: number } | null;
  onPractice: () => void;
}

/** Bulmaca sonu: kelimelerin anlamları, örnek cümleler ve kazanılanlar. */
export function PuzzleResult({ puzzle, outcome, profile, onAgain, onHome, onReview, practiceWords, practiceDone, onPractice }: Props) {
  // Telefonda sonuç en üstten başlasın (bulmaca ekranı kaydırılmış olabilir).
  // Süslü parantez şart: scrollTo yeni Chrome'da Promise döndürüyor; React onu temizlik işlevi sanıp
  // ekran kapanırken çöküyordu ("n is not a function").
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  const src = languageInfo(puzzle.direction.source);
  const tgt = languageInfo(puzzle.direction.target);
  const total = outcome.results.length;
  const correct = outcome.results.filter((r) => r.status === 'correct').length;
  const clean = outcome.results.filter((r) => r.status === 'correct' && !r.helped && r.wrongAttempts === 0).length;
  const streak = currentStreak(profile.daily, new Date());
  const practicePending = !practiceDone && practiceWords.length > 0;
  const heading = correct === total ? (clean === total ? 'Kusursuz bulmaca!' : 'Bulmaca tamam!') : correct >= total / 2 ? 'Güzel iş!' : 'Her bulmaca bir adım';

  // Bölüm satırı: biten bölüm ya da bölümün neden ilerlemediği (konu bulmacasında yok).
  const notes: { text: string; good?: boolean }[] = [];
  if (outcome.chapterCompleted !== null) {
    notes.push({ text: `Bölüm ${outcome.chapterCompleted} tamamlandı! Sırada Bölüm ${outcome.chapterCompleted + 1}.`, good: true });
  } else if (!puzzle.topic) {
    notes.push({ text: 'Bölümü geçmek için bulmacanın tüm kelimelerini çöz (yardım serbest).' });
  }
  if (outcome.goalReached) notes.push({ text: 'Günlük hedef tamam: jeton ve hediye haklar kazandın.', good: true });
  if (outcome.usedRestDay) notes.push({ text: 'Dün ara verdin; haftalık dinlenme günün kullanıldı, serin sürüyor.' });
  if (outcome.levelChange === 'up' && outcome.difficultyAfter) {
    notes.push({ text: `Çok iyi gidiyorsun — sıradaki bulmaca ${DIFFICULTY_LABEL[outcome.difficultyAfter]} seviyesinde.`, good: true });
  }
  if (outcome.levelChange === 'down' && outcome.difficultyAfter) {
    notes.push({ text: `Sıradaki bulmacayı biraz hafiflettik (${DIFFICULTY_LABEL[outcome.difficultyAfter]}).` });
  }
  if (outcome.addedToReview > 0) notes.push({ text: `${outcome.addedToReview} kelime tekrar listene eklendi.` });
  if (outcome.removedFromReview > 0) notes.push({ text: `${outcome.removedFromReview} kelimeyi artık biliyorsun; tekrar listenden çıktı.`, good: true });

  const nextLabel = puzzle.topic
    ? 'Yeni konu bulmacası'
    : outcome.chapterCompleted !== null
      ? `Bölüm ${toCase(outcome.chapterCompleted + 1)} geç`
      : 'Yeni bulmaca';

  // Ekran telefon boyunda sabit (ana sayfa gibi): sayfa kaymaz, kelime listesi
  // kendi kutusunda kayar, sıradaki bulmaca düğmesi her zaman görünür.
  return (
    <div className="page summary result-screen">
      <header className="page-head result-head">
        <h1>{heading}</h1>
        <p className="muted">
          {total} kelimeden {correct} tanesini çözdün{clean > 0 ? `, ${clean} tanesini hiç yardım almadan` : ''}.
        </p>
      </header>

      {/* Pekiştirme oyunun asıl amacı: sonuçların en üstünde, öne çıkan kart. İsteğe bağlı. */}
      {practicePending && (
        <section className="practice-offer" aria-labelledby="practice-title">
          <h2 id="practice-title">Öğrendiğini pekiştir</h2>
          <p className="sr-only">Zorlandığın {practiceWords.length} kelimeyi cümle içinde bir kez daha çalış.</p>
          <ul className="practice-chips" lang={puzzle.direction.target}>
            {practiceWords.map((w) => (
              <li key={w}>{displayWord(w, puzzle.direction.target)}</li>
            ))}
          </ul>
          <button type="button" className="btn btn-primary btn-block btn-big" onClick={onPractice}>
            Pekiştir · {practiceWords.length} kelime
          </button>
          <p className="practice-reward">
            <CoinIcon width={14} height={14} /> Cevaba bakmadan bildiğin her kelime +{PRACTICE_COINS_PER_WORD} jeton. Yanlış hiçbir şey eksiltmez.
          </p>
        </section>
      )}
      {practiceDone && (
        <p className="info-line good">
          Pekiştirme: {practiceDone.total} kelimeden {practiceDone.mastered} tanesini bildin
          {practiceDone.coins > 0 ? ` · +${practiceDone.coins} jeton` : ''}.
        </p>
      )}

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
          <span>{goalDoneToday(profile.daily, new Date()) ? 'seri · bugün ✓' : `seri · 0/${DAILY_PUZZLE_GOAL}`}</span>
        </div>
      </div>

      {notes.length > 0 && (
        <ul className="result-notes">
          {notes.map((n) => (
            <li key={n.text} className={n.good ? 'good' : ''}>
              {n.text}
            </li>
          ))}
        </ul>
      )}

      <section className="result-words" aria-labelledby="result-words-title">
        <h2 id="result-words-title">
          Kelimeler <small>dokun: anlamı ve örnek cümleler</small>
        </h2>
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
                    {q.source === 'en' && <SpeakButton text={q.prompt} lang="en" />}
                    <span aria-hidden="true" className="arrow">
                      →
                    </span>
                    <strong lang={q.target}>{displayWord(r.answer, q.target)}</strong>
                    {q.target === 'en' && <SpeakButton text={r.answer} lang="en" />}
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
                            {q.target === 'en' && <SpeakButton text={q.targetExample} lang="en" label="Örnek cümleyi sesli dinle" />}
                          </p>
                        )}
                        {q.sourceExample && (
                          <p>
                            <span className="ex-lang">{src.name}</span> <span lang={q.source}>{q.sourceExample}</span>
                            {q.source === 'en' && <SpeakButton text={q.sourceExample} lang="en" label="Örnek cümleyi sesli dinle" />}
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
      </section>

      <div className="result-actions">
        <button type="button" className={`btn ${practicePending ? 'btn-secondary' : 'btn-primary'} btn-block`} onClick={onAgain}>
          {nextLabel}
        </button>
        <div className="result-actions-row">
          {profile.review.length > 0 && (
            <button type="button" className="btn btn-secondary btn-small" onClick={onReview}>
              Tekrar listesi ({profile.review.length})
            </button>
          )}
          <button type="button" className="btn btn-ghost btn-small" onClick={onHome}>
            Ana sayfa
          </button>
        </div>
      </div>
    </div>
  );
}
