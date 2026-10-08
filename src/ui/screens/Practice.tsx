import { useMemo, useState } from 'react';
import { languageInfo } from '../../core/languages';
import { displayLetter, displayWord } from '../../core/normalize';
import { PRACTICE_COINS_PER_WORD } from '../../core/economy';
import { practiceMastered, type PracticeItem, type PracticeResult } from '../../core/practice';
import type { Direction } from '../../core/types';
import { CheckIcon, CloseIcon, CoinIcon, CrossIcon } from '../components/Icons';
import { SpeakButton } from '../components/SpeakButton';
import { Keyboard } from '../components/Keyboard';
import { sfx } from '../sound';

interface Props {
  items: PracticeItem[];
  direction: Direction;
  /** Tur bitince ya da oyuncu erken çıkınca: o ana kadarki sonuçlar. */
  onDone: (results: PracticeResult[]) => void;
}

type Phase = 'meaning' | 'cloze' | 'end';

/**
 * Pekiştirme turu (bulmaca sonrası, isteğe bağlı). Her kelimede önce anlam
 * seçme, sonra cümle tamamlama. Yanlış cevap bir şey eksiltmez; "Cevabı
 * göster" her zaman serbest (o kelime için jeton verilmez).
 */
export function Practice({ items, direction, onDone }: Props) {
  const src = languageInfo(direction.source);
  const tgt = languageInfo(direction.target);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('meaning');
  const [picked, setPicked] = useState<number | null>(null);
  const [typed, setTyped] = useState<string[]>([]);
  const [clozeState, setClozeState] = useState<'typing' | 'wrong' | 'right' | 'revealed'>('typing');
  const [results, setResults] = useState<PracticeResult[]>([]);
  const [current, setCurrent] = useState<PracticeResult | null>(null);

  const item = items[index];
  const mastered = useMemo(() => results.filter(practiceMastered).length, [results]);

  function pick(i: number) {
    if (picked !== null) return;
    setPicked(i);
    const ok = i === item.correctChoice;
    if (ok) sfx.correct();
    else sfx.wrong();
    setCurrent({ entryId: item.entryId, meaningOk: ok, clozeOk: false, revealed: false });
  }

  function toCloze() {
    setPhase('cloze');
    setTyped([]);
    setClozeState('typing');
  }

  function onLetter(letter: string) {
    if (clozeState === 'right' || clozeState === 'revealed') return;
    // Kutular doluyken yeni harf eklenmez: önce silmek gerekir.
    const next = [...typed, letter].slice(0, item.letters.length);
    setTyped(next);
    if (next.length === item.letters.length) {
      if (next.join('') === item.letters.join('')) {
        setClozeState('right');
        sfx.correct();
        setCurrent((c) => (c ? { ...c, clozeOk: true } : c));
      } else {
        setClozeState('wrong');
        sfx.wrong();
      }
    } else if (clozeState === 'wrong') setClozeState('typing');
  }

  function onBackspace() {
    if (clozeState === 'right' || clozeState === 'revealed') return;
    setTyped((t) => t.slice(0, -1));
    setClozeState('typing');
  }

  function reveal() {
    setTyped(item.letters);
    setClozeState('revealed');
    setCurrent((c) => (c ? { ...c, revealed: true } : c));
  }

  function nextWord() {
    const done = [...results, current!];
    setResults(done);
    setCurrent(null);
    setPicked(null);
    if (index + 1 < items.length) {
      setIndex(index + 1);
      setPhase('meaning');
    } else {
      setPhase('end');
      if (done.some(practiceMastered)) sfx.complete();
    }
  }

  function quit() {
    // Yarım kalan kelime sayılmaz; tamamlananların ödülü verilir.
    onDone(results);
  }

  if (phase === 'end') {
    return (
      <div className="page practice">
        <header className="page-head">
          <h1>Pekiştirme tamam</h1>
          <p className="muted">
            {items.length} kelimeden {mastered} tanesini cevaba bakmadan bildin.
          </p>
        </header>
        {mastered > 0 && (
          <p className="info-line good">
            <CoinIcon width={16} height={16} /> +{mastered * PRACTICE_COINS_PER_WORD} jeton
          </p>
        )}
        <ul className="practice-list">
          {results.map((r, i) => (
            <li key={r.entryId} className={practiceMastered(r) ? 'ok' : ''}>
              {practiceMastered(r) ? <CheckIcon width={16} height={16} /> : <CrossIcon width={16} height={16} />}
              <strong lang={direction.target}>{displayWord(items[i].answer, direction.target)}</strong>
              {direction.target === 'en' && <SpeakButton text={items[i].answer} lang="en" />}
              <span lang={direction.source}>{items[i].prompt}</span>
              {direction.source === 'en' && <SpeakButton text={items[i].prompt} lang="en" />}
            </li>
          ))}
        </ul>
        <p className="muted small">Bu kelimeler önümüzdeki günlerde bulmacalarda yeniden karşına çıkacak.</p>
        <button type="button" className="btn btn-primary btn-block" onClick={() => onDone(results)}>
          Tamam
        </button>
      </div>
    );
  }

  const blanks = item.letters.map((_, i) => typed[i] ?? '');

  return (
    <div className="page practice">
      <header className="page-bar">
        <button type="button" className="icon-btn" onClick={quit} aria-label="Pekiştirmeden çık">
          <CloseIcon />
        </button>
        <h1>
          Pekiştir · {index + 1}/{items.length}
        </h1>
      </header>

      {phase === 'meaning' ? (
        <section className="practice-card" aria-live="polite">
          <p className="muted small">Bu kelimenin {src.name} anlamı ne?</p>
          <p className="practice-word" lang={direction.target}>
            {displayWord(item.answer, direction.target)}
            {direction.target === 'en' && <SpeakButton text={item.answer} lang="en" size={22} />}
          </p>
          <div className="practice-choices">
            {item.choices.map((c, i) => {
              const state = picked === null ? '' : i === item.correctChoice ? 'is-right' : i === picked ? 'is-wrong' : 'is-dim';
              return (
                <button key={c} type="button" className={`btn btn-secondary btn-block ${state}`} onClick={() => pick(i)} lang={direction.source}>
                  {c}
                </button>
              );
            })}
          </div>
          {picked !== null && (
            <>
              <p className={`info-line ${picked === item.correctChoice ? 'good' : ''}`}>
                {picked === item.correctChoice ? 'Doğru!' : `Doğrusu: ${item.choices[item.correctChoice]}`}
              </p>
              <button type="button" className="btn btn-primary btn-block" onClick={toCloze}>
                Cümlede kullan
              </button>
            </>
          )}
        </section>
      ) : (
        <>
          <section className="practice-card" aria-live="polite">
            {item.cloze ? (
              <>
                <p className="muted small">Boşluğa gelen {tgt.name} kelimeyi yaz.</p>
                <p className="practice-sentence" lang={direction.target}>
                  {item.cloze}
                </p>
                {item.sourceExample && (
                  <p className="muted small" lang={direction.source}>
                    {item.sourceExample}
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="muted small">Bu kelimenin {tgt.name} karşılığını yaz.</p>
                <p className="practice-word" lang={direction.source}>
                  {item.prompt}
                  {direction.source === 'en' && <SpeakButton text={item.prompt} lang="en" size={22} />}
                </p>
              </>
            )}
            <div className={`practice-slots ${clozeState === 'wrong' ? 'shake' : ''}`} aria-label={`${item.letters.length} harf`}>
              {blanks.map((ch, i) => (
                <span key={i} className={`practice-slot ${clozeState === 'right' ? 'is-right' : clozeState === 'wrong' ? 'is-wrong' : ''}`}>
                  {ch ? displayLetter(ch, direction.target) : ''}
                </span>
              ))}
            </div>
            {clozeState === 'wrong' && <p className="info-line">Olmadı; harfleri silip yeniden dene. Hiçbir şey eksilmez.</p>}
            {clozeState === 'right' && (
              <p className="info-line good">
                Doğru!
                {direction.target === 'en' && <SpeakButton text={item.answer} lang="en" />}
              </p>
            )}
            {clozeState === 'revealed' && (
              <p className="info-line">
                Cevap: {displayWord(item.answer, direction.target)}
                {direction.target === 'en' && <SpeakButton text={item.answer} lang="en" />}
              </p>
            )}
            {clozeState === 'right' || clozeState === 'revealed' ? (
              <button type="button" className="btn btn-primary btn-block" onClick={nextWord}>
                {index + 1 < items.length ? 'Sıradaki kelime' : 'Bitir'}
              </button>
            ) : (
              <button type="button" className="btn btn-ghost btn-block" onClick={reveal}>
                Cevabı göster
              </button>
            )}
          </section>
          <Keyboard lang={direction.target} onLetter={onLetter} onBackspace={onBackspace} disabled={clozeState === 'right' || clozeState === 'revealed'} />
        </>
      )}
    </div>
  );
}
