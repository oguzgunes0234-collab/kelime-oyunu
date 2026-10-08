import { useEffect, useRef, useState } from 'react';
import { sfx } from '../sound';
import { TOOL_ORDER } from '../../core/economy';
import { languageInfo } from '../../core/languages';
import { displayLetter, displayWord, keyToLetter } from '../../core/normalize';
import { DIFFICULTY_LABEL, POS_LABEL } from '../../core/pack';
import { applyRound, consumeCharge, type Profile, type RoundOutcome } from '../../core/profile';
import {
  MAX_WRONG_ATTEMPTS,
  answerLetters,
  applyTool,
  canUseTool,
  correctPrefix,
  filledCount,
  nextSlot,
  placeLetter,
  placeTile,
  placedWord,
  removeAt,
  skipRound,
  slotCount,
  type RoundEvent,
  type RoundState,
} from '../../core/round';
import {
  nextRound,
  recordSessionRound,
  sessionDifficulty,
  sessionScore,
  startSession,
  type Session,
  type SessionConfig,
} from '../../core/session';
import type { ToolId, WordPack } from '../../core/types';
import { CloseIcon, CoinIcon } from '../components/Icons';
import { Sheet } from '../components/Sheet';
import { ToolBar } from '../components/ToolBar';
import { ToolInfo } from '../components/ToolInfo';
import { Coach, type CoachStep } from './Coach';
import { Exhausted } from './Exhausted';
import { RoundResult } from './RoundResult';
import { Summary } from './Summary';
import { ToolEmpty } from './ToolEmpty';

interface Props {
  pack: WordPack;
  profile: Profile;
  setProfile: (p: Profile) => void;
  config: SessionConfig;
  /** Üstte başka bir katman (mağaza) açıkken klavye girdisi yok sayılır. */
  paused?: boolean;
  onExit: () => void;
  onRestart: (config: SessionConfig) => void;
  onOpenStore: () => void;
  onOpenReview: () => void;
  onTutorialDone: () => void;
}

type Phase = 'round' | 'result' | 'exhausted' | 'summary';
type Dialog = { kind: 'toolEmpty'; tool: ToolId } | { kind: 'toolInfo' } | { kind: 'quit' } | null;
type Note = { text: string; tone: 'good' | 'bad' | 'info'; seq: number } | null;

const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

function describe(event: RoundEvent | null): Omit<NonNullable<Note>, 'seq'> | null {
  if (!event) return null;
  switch (event.kind) {
    case 'wrong':
      return {
        tone: 'bad',
        text: `Bu cevap olmadı. ${event.attemptsLeft} deneme hakkın kaldı — yanlış harfe dokunup geri al.`,
      };
    case 'correct':
      return { tone: 'good', text: 'Doğru!' };
    case 'failed':
      return { tone: 'bad', text: 'Deneme hakların bitti; doğru cevabı birlikte görelim.' };
    case 'shuffle':
      return { tone: 'info', text: 'Taşlar karıştırıldı.' };
    case 'undo':
      return { tone: 'info', text: 'Son harf geri alındı.' };
    case 'removed':
      return { tone: 'info', text: `${event.position + 1}. harf geri alındı.` };
    case 'magnet':
      return {
        tone: 'info',
        text:
          event.removedWrong > 0
            ? `${event.removedWrong} hatalı harf geri alındı, sıradaki harf yerleştirildi.`
            : 'Sıradaki harf yerleştirildi.',
      };
    case 'hint-meaning':
      return { tone: 'info', text: 'Anlam ipucu soru kartında. Tekrar dokunursan sıradaki harfi gösterir.' };
    case 'hint-letter':
      return {
        tone: 'info',
        text:
          `Sıradaki harf: ${event.position + 1}. harf, parlayan taş.` +
          (event.wrongFrom !== null ? ` Dikkat: ${event.wrongFrom + 1}. harften itibaren hata var.` : ''),
      };
    default:
      return null;
  }
}

const IDLE_TEXT: Record<ToolId, string> = {
  shuffle: 'Karıştırılacak yeterli taş yok. Hak harcanmadı.',
  undo: 'Geri alınacak harf yok. Hak harcanmadı.',
  magnet: 'Cevap zaten doğru ilerliyor. Hak harcanmadı.',
  hint: 'Cevap zaten doğru ilerliyor. Hak harcanmadı.',
  // Bulmaca jokerleri hızlı turda yok (araç çubuğunda görünmez).
  synonym: 'Bu joker yalnızca bulmacada kullanılır. Hak harcanmadı.',
  sentence: 'Bu joker yalnızca bulmacada kullanılır. Hak harcanmadı.',
};

export function Game(props: Props) {
  const { pack, profile, setProfile, config } = props;
  const tutorial = config.mode === 'tutorial';

  const [init] = useState(() => {
    const s = startSession(config, profile);
    return { session: s, next: nextRound(s, pack, profile) };
  });
  const [session, setSession] = useState<Session>(init.session);
  const [round, setRound] = useState<RoundState | null>(init.next.kind === 'round' ? init.next.round : null);
  const [phase, setPhase] = useState<Phase>(
    init.next.kind === 'round' ? 'round' : init.next.kind === 'exhausted' ? 'exhausted' : 'summary',
  );
  const [outcome, setOutcome] = useState<RoundOutcome | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [note, setNote] = useState<Note>(null);
  const [coach, setCoach] = useState<CoachStep>(tutorial ? 'intro' : null);
  const noteSeq = useRef(0);
  const timer = useRef<number>();

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function say(n: Omit<NonNullable<Note>, 'seq'> | null) {
    noteSeq.current += 1;
    setNote(n ? { ...n, seq: noteSeq.current } : null);
  }

  // Anlık değerler: aynı karede art arda gelen dokunuş ya da tuşlar React yeniden
  // çizmeden önce işlenebilir; eski durumu okuyup harf kaybetmesinler.
  const live = useRef({ round, profile, coach });
  live.current = { round, profile, coach };

  function saveProfile(p: Profile) {
    live.current.profile = p;
    setProfile(p);
  }

  function moveCoach(step: CoachStep) {
    live.current.coach = step;
    setCoach(step);
  }

  function finish(done: RoundState, base: Profile) {
    const res = applyRound(base, done, { mode: config.mode, adaptive: config.difficultyMode === 'adaptive' }, new Date());
    saveProfile(res.profile);
    setSession((s) => recordSessionRound(s, done, res.outcome));
    setOutcome(res.outcome);
    if (tutorial) moveCoach('result');
    // Doğru/yanlış animasyonu kısa bir an görünsün, sonra tur sonu açılsın.
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setPhase('result'), reducedMotion() ? 0 : 650);
  }

  function commit(next: RoundState, base: Profile = live.current.profile) {
    const prev = live.current.round;
    if (!prev || next === prev) return;
    live.current.round = next;
    setRound(next);
    if (next.seq !== prev.seq) {
      say(describe(next.event));
      if (next.event?.kind === 'correct') sfx.correct();
      else if (next.event?.kind === 'wrong' || next.event?.kind === 'failed') sfx.wrong();
    }
    if (tutorial) {
      const step = live.current.coach;
      if (step === 'tap' && filledCount(next) > 0) moveCoach('tools');
      if (step === 'tools' && next.event?.kind === 'magnet') moveCoach('finish');
    }
    if (prev.status === 'playing' && next.status !== 'playing') finish(next, base);
    else if (base !== live.current.profile) saveProfile(base);
  }

  function onTile(id: number) {
    const r = live.current.round;
    if (r) commit(placeTile(r, id));
  }

  function onTool(tool: ToolId) {
    const { round: r, profile: p } = live.current;
    if (!r || r.status !== 'playing') return;
    if (!tutorial && p.inventory[tool] <= 0) {
      setDialog({ kind: 'toolEmpty', tool });
      return;
    }
    const res = applyTool(r, tool);
    if (!res.applied) {
      say({ tone: 'info', text: IDLE_TEXT[tool] });
      return;
    }
    commit(res.state, tutorial ? p : consumeCharge(p, tool));
  }

  /** Cevap alanındaki bir harfe dokunmak onu taşlara geri gönderir (ücretsiz, denetim yok). */
  function onSlot(position: number) {
    const r = live.current.round;
    if (r) commit(removeAt(r, position));
  }

  function onSkip() {
    const r = live.current.round;
    if (r) commit(skipRound(r));
  }

  function goNext() {
    if (tutorial) {
      props.onTutorialDone();
      return;
    }
    const n = nextRound(session, pack, profile);
    setOutcome(null);
    say(null);
    if (n.kind === 'round') {
      setRound(n.round);
      setPhase('round');
    } else {
      setRound(null);
      setPhase(n.kind === 'exhausted' ? 'exhausted' : 'summary');
    }
  }

  function allowRepeats() {
    const s = { ...session, allowRepeats: true };
    setSession(s);
    const n = nextRound(s, pack, profile);
    if (n.kind === 'round') {
      setRound(n.round);
      setPhase('round');
    } else setPhase('summary');
  }

  // Donanım klavyesi (ör. tablete bağlı): harf yaz, ⌫ geri al (hak harcar).
  const keyHandler = useRef<(e: KeyboardEvent) => void>();
  keyHandler.current = (e: KeyboardEvent) => {
    const r = live.current.round;
    if (props.paused || phase !== 'round' || dialog || !r || r.status !== 'playing') return;
    if (live.current.coach === 'intro' || live.current.coach === 'question') return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target instanceof Element && e.target.closest('input, textarea, select')) return;
    if (e.key === 'Backspace') {
      e.preventDefault();
      onTool('undo');
      return;
    }
    const letter = keyToLetter(e.key, r.question.target);
    if (letter) {
      const next = placeLetter(r, letter);
      if (next === r) say({ tone: 'info', text: `Boşta “${displayLetter(letter, r.question.target)}” taşı yok.` });
      else commit(next);
    }
  };
  useEffect(() => {
    const h = (e: KeyboardEvent) => keyHandler.current?.(e);
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const difficulty = sessionDifficulty(session, profile);
  const played = session.rounds.length;
  const score = sessionScore(session);

  if (phase === 'summary') {
    return (
      <Summary
        session={session}
        profile={profile}
        onHome={props.onExit}
        onAgain={() => props.onRestart(config)}
        onReview={props.onOpenReview}
      />
    );
  }

  if (phase === 'exhausted') {
    return (
      <Exhausted
        config={config}
        difficulty={difficulty}
        played={played}
        onRepeat={allowRepeats}
        onHome={props.onExit}
        onReview={props.onOpenReview}
        reviewCount={profile.review.length}
      />
    );
  }

  if (!round) return null;

  const q = round.question;
  const letters = answerLetters(round);
  const slots = slotCount(round);
  const src = languageInfo(q.source);
  const tgt = languageInfo(q.target);
  const usable = Object.fromEntries(TOOL_ORDER.map((t) => [t, canUseTool(round, t)])) as Record<ToolId, boolean>;
  const shake = round.event?.kind === 'wrong' || round.event?.kind === 'failed';
  const coachTile =
    coach === 'tap' ? round.order.find((id) => !round.placed.includes(id) && round.tiles[id].letter === letters[correctPrefix(round)]) : undefined;
  const modeLabel =
    config.mode === 'review'
      ? 'Tekrar çalışması'
      : tutorial
        ? 'Örnek tur'
        : `Hızlı tur · ${DIFFICULTY_LABEL[difficulty]}`;

  return (
    <div className={`game ${round.status !== 'playing' ? `is-${round.status}` : ''}`}>
      <header className="game-top">
        <button
          type="button"
          className="icon-btn"
          onClick={() => (tutorial ? props.onTutorialDone() : setDialog({ kind: 'quit' }))}
          aria-label={tutorial ? 'Eğitimi atla' : 'Oturumu bitir'}
        >
          <CloseIcon />
        </button>
        <div className="game-progress">
          <div className="progress-label">
            <span>{modeLabel}</span>
            <span>
              {Math.min(played + (round.status === 'playing' ? 1 : 0), session.length)}/{session.length}
            </span>
          </div>
          <div
            className="progress-bar"
            role="progressbar"
            aria-label="Oturum ilerlemesi"
            aria-valuemin={0}
            aria-valuemax={session.length}
            aria-valuenow={played}
          >
            <span style={{ width: `${(played / session.length) * 100}%` }} />
          </div>
        </div>
        <div className="game-stats">
          <span className="stat" aria-label={`Oturum puanı ${score}`}>
            <strong>{score}</strong>
            <small>puan</small>
          </span>
          <span className="stat coin" aria-label={`${profile.coins} jeton`}>
            <CoinIcon width={16} height={16} />
            <strong>{profile.coins}</strong>
          </span>
        </div>
      </header>

      <main className="game-main">
        <section className="question-card" data-coach="question" aria-live="polite">
          <p className="q-direction">
            {src.name} → {tgt.name}
          </p>
          <p className="q-word" lang={q.source}>
            {q.prompt}
          </p>
          {q.promptContext && <p className="q-context">({q.promptContext})</p>}
          <p className="q-meta">
            <span className="chip">{POS_LABEL[q.pos]}</span>
            <span className="chip">≈ {q.level}</span>
            <span className="chip chip-soft">{q.topic}</span>
          </p>
          {round.meaningHintShown && q.meaningHint && (
            <p className="q-hint">
              <strong>İpucu:</strong> {q.meaningHint}
            </p>
          )}
        </section>

        <div
          key={shake ? `shake-${round.seq}` : 'slots'}
          className={`slots${shake ? ' shake' : ''}${round.status === 'correct' ? ' is-correct' : ''}`}
          role="group"
          aria-label={`Cevap alanı, ${slots} harf. Şu ana kadar: ${filledCount(round) ? displayWord(placedWord(round), q.target) : 'boş'}. Bir harfi geri almak için ona dokun.`}
          lang={q.target}
          style={{ ['--slots' as string]: slots }}
        >
          {letters.map((_, i) => {
            const id = round.placed[i];
            const cls = `slot${id !== null ? ' filled' : ''}${i === nextSlot(round) && round.status === 'playing' ? ' next' : ''}`;
            if (id === null) return <span key={i} className={cls} />;
            const letter = displayLetter(round.tiles[id].letter, q.target);
            // Dolu kutuya dokunmak harfi taşlara geri gönderir; denetim yapılmaz.
            return (
              <button
                key={i}
                type="button"
                className={cls}
                onClick={() => onSlot(i)}
                disabled={round.status !== 'playing'}
                aria-label={`${i + 1}. harf ${letter}. Geri almak için dokun.`}
              >
                {letter}
              </button>
            );
          })}
        </div>

        <div className="attempts" aria-label={`Deneme hakkı: ${MAX_WRONG_ATTEMPTS - round.wrongAttempts} / ${MAX_WRONG_ATTEMPTS}`}>
          {Array.from({ length: MAX_WRONG_ATTEMPTS }, (_, i) => (
            <span key={i} className={`dot${i < MAX_WRONG_ATTEMPTS - round.wrongAttempts ? ' on' : ''}`} aria-hidden="true" />
          ))}
          <span className="attempts-label" aria-hidden="true">
            deneme
          </span>
        </div>

        {coach === 'tap' || coach === 'tools' || coach === 'finish' ? (
          // Eğitim balonu akışın içinde durur; soru kartını ve cevap alanını örtmez.
          <Coach step={coach} question={q} onNext={moveCoach} onSkip={props.onTutorialDone} />
        ) : (
          <p className={`note note-${note?.tone ?? 'info'}`} role="status" aria-live="polite" key={note?.seq ?? 0}>
            {note?.text ?? '\u00a0'}
          </p>
        )}

        <div className="tiles" role="group" aria-label="Harf taşları" lang={q.target} data-coach="tiles">
          {round.order.map((id) => {
            const placed = round.placed.includes(id);
            const tile = round.tiles[id];
            if (placed) return <span key={id} className="tile ghost" aria-hidden="true" />;
            const letter = displayLetter(tile.letter, q.target);
            return (
              <button
                key={id}
                type="button"
                className={`tile${round.highlight === id ? ' hinted' : ''}${coachTile === id ? ' coach-pulse' : ''}`}
                onClick={() => onTile(id)}
                disabled={round.status !== 'playing'}
                aria-label={`${letter} harfi`}
              >
                {letter}
              </button>
            );
          })}
        </div>

        <div className="round-actions">
          {filledCount(round) > 0 && round.status === 'playing' && <p className="slot-help">Harfe dokun, geri alırsın.</p>}
          <button type="button" className="btn btn-ghost" onClick={onSkip} disabled={round.status !== 'playing'}>
            Pas geç
          </button>
        </div>
      </main>

      <ToolBar
        inventory={profile.inventory}
        usable={usable}
        onUse={onTool}
        onInfo={() => setDialog({ kind: 'toolInfo' })}
        free={tutorial}
        pulse={coach === 'tools' ? 'magnet' : null}
      />

      {(coach === 'intro' || coach === 'question') && phase === 'round' && (
        <Coach step={coach} question={q} onNext={moveCoach} onSkip={props.onTutorialDone} />
      )}

      {phase === 'result' && outcome && (
        <RoundResult
          question={q}
          outcome={outcome}
          isLast={session.rounds.length >= session.length}
          tutorial={tutorial}
          onNext={goNext}
        />
      )}

      {dialog?.kind === 'toolInfo' && <ToolInfo inventory={profile.inventory} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'toolEmpty' && (
        <ToolEmpty
          tool={dialog.tool}
          profile={profile}
          setProfile={saveProfile}
          onClose={() => setDialog(null)}
          onOpenStore={() => {
            setDialog(null);
            props.onOpenStore();
          }}
        />
      )}
      {dialog?.kind === 'quit' && (
        <Sheet title="Oturumu bitir?" onClose={() => setDialog(null)}>
          <p>
            Şu ana kadar {played} kelime oynadın. Bitirirsen bu kelime sayılmaz; kazandığın puan ve jetonlar korunur.
          </p>
          <div className="btn-row">
            <button type="button" className="btn btn-secondary" onClick={() => setDialog(null)}>
              Oynamaya devam
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setDialog(null);
                if (played > 0) setPhase('summary');
                else props.onExit();
              }}
            >
              Bitir
            </button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
