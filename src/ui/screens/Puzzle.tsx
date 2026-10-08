import { useEffect, useMemo, useRef, useState } from 'react';
import { clueFullText, clueLabel, wordCells } from '../../core/crossword';
import { CLUE_KIND_LABEL, sentenceFor, synonymsFor } from '../../core/clues';
import { PUZZLE_TOOL_INFO, PUZZLE_TOOL_ORDER, type PuzzleToolId } from '../../core/economy';
import { languageInfo } from '../../core/languages';
import { displayLetter, displayWord, keyToLetter } from '../../core/normalize';
import { DIFFICULTY_LABEL } from '../../core/pack';
import { consumeCharge, type Profile } from '../../core/profile';
import {
  applyPuzzle,
  backspace,
  cellKey,
  finishPuzzle,
  isLocked,
  newPuzzle,
  puzzleFromCrossword,
  revealLetter,
  selectWord,
  selectedCell,
  showMeaning,
  showExtra,
  extraShown,
  solvedCount,
  stepWord,
  tapCell,
  tapClue,
  typeLetter,
  type PuzzleOutcome,
  type PuzzleState,
} from '../../core/puzzle';
import { loadPuzzle, savePuzzle } from '../../core/storage';
import { TUTORIAL_DIRECTION, TUTORIAL_LENGTH, TUTORIAL_STEPS, tutorialCrossword, type TutorialSkill } from '../../core/tutorial';
import { TOPIC_GRID, TOPIC_MODES, topicEntryIds } from '../../core/topics';
import { chapterInfo } from '../../core/campaign';
import type { Difficulty, Direction, WordPack } from '../../core/types';
import { ChevronLeftIcon, ChevronRightIcon, ClueArrow, CloseIcon, CoinIcon, QuestionIcon, TOOL_ICONS } from '../components/Icons';
import { Keyboard } from '../components/Keyboard';
import { Sheet } from '../components/Sheet';
import { ChapterComplete } from './ChapterComplete';
import { PuzzleResult } from './PuzzleResult';
import { Practice } from './Practice';
import { applyPractice, buildPractice, type PracticeItem } from '../../core/practice';
import { sfx } from '../sound';
import { ToolEmpty } from './ToolEmpty';

interface Props {
  pack: WordPack;
  profile: Profile;
  setProfile: (p: Profile) => void;
  direction: Direction;
  difficulty: Difficulty;
  adaptive: boolean;
  /** Üstte başka bir katman (mağaza) açıkken klavye girdisi yok sayılır. */
  paused?: boolean;
  onExit: () => void;
  onNewPuzzle: () => void;
  onOpenStore: () => void;
  onOpenReview: () => void;
  /** Bulmaca eğitiminin adımı (0 = T1); null ise normal bulmaca. */
  tutorialStep: number | null;
  /** Ana kampanyada yeni bulmacanın ızgarası (bölüme göre). */
  gridSize: { rows: number; cols: number };
  /** Konu modu kimliği; null ise ana kampanya. */
  topic: string | null;
  /** Eğitim adımı bitti; bir sonrakine (ya da eğitim bittiyse normal bulmacaya) geç. */
  onTutorialAdvance: (next: number) => void;
  onTutorialSkip: () => void;
  onReplayTutorial: () => void;
}

type Dialog = { kind: 'toolEmpty'; tool: PuzzleToolId } | { kind: 'quit' } | { kind: 'help' } | { kind: 'tutorialDone' } | null;
type Note = { text: string; tone: 'good' | 'bad' | 'info'; seq: number } | null;

/**
 * Eğitimde gerektiği anda çıkan kısa açıklamalar. Her biri tek cümle ve
 * "Anladım" ile kapanır; ilgili eylem yapılınca kendiliğinden kaybolur.
 */
type TipId = TutorialSkill | 'wrong';
const TIPS: Record<TipId, string> = {
  basics: 'Oklu kutu ipucudur: Türkçe bir kelime. Ok, İngilizcesini hangi yöne yazacağını gösterir. Alttaki klavyeyle yaz.',
  crossing: 'İki kelime bir kareyi paylaşıyor. ↓ aşağı yaz demek. Birini çözmek diğerine harf verir.',
  switch: 'Parlayan kare iki kelimenin başı. Ona bir kez daha dokun: yazma yönü değişir.',
  bent: 'Kırık ok: ↳ cevap ipucunun altından başlar, sağa gider. ↴ yanından başlar, aşağı iner.',
  tools: 'Takılırsan: Anlam kelimenin anlamını, Harf aç bir harfi gösterir. Eğitimde ücretsiz, bir dene.',
  wrong: 'Bu kelimede yanlış harf var. Kareye dokunup düzelt.',
};

/** Bulmaca bitince tamamlanan ızgaranın sonuç ekranından önce görünme süresi. */
const CELEBRATE_MS = 1500;

const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Kısa titreşim (Android). iPhone Safari desteklemez; orada sessizce hiçbir şey olmaz. */
function buzz(pattern: number | number[]) {
  try {
    if (!reducedMotion()) navigator.vibrate?.(pattern);
  } catch {
    /* desteklenmiyor */
  }
}

/**
 * Prototip denemesi için: adreste ?izgara=6 ya da ?izgara=7 varsa yeni
 * bulmacalar 6×6 / 7×7 kurulur (küçük ekran kontrolü). Normal oyunda yok sayılır.
 */
function gridSizeParam(): { rows: number; cols: number } | undefined {
  const n = Number(new URLSearchParams(window.location.search).get('izgara'));
  return n >= 6 && n <= 9 ? { rows: n, cols: n } : undefined;
}

/** Eğitim adımı, konu bulmacası, kayıtlı yarım bulmaca (bu yön için) ya da yeni kampanya bulmacası. */
function initialPuzzle(props: Props): PuzzleState {
  if (props.tutorialStep !== null) {
    const s = puzzleFromCrossword(tutorialCrossword(props.tutorialStep, props.pack), TUTORIAL_DIRECTION, 'easy');
    return selectWord(s, TUTORIAL_STEPS[props.tutorialStep].startWord);
  }
  if (props.topic) {
    // Konu bulmacası kaydedilmez ve kampanyanın yarım bulmacasına dokunmaz.
    const mode = TOPIC_MODES.find((m) => m.id === props.topic)!;
    const topic = { id: mode.id, entryIds: topicEntryIds(mode, props.pack) };
    return newPuzzle(props.pack, props.profile, props.direction, props.difficulty, undefined, TOPIC_GRID, topic);
  }
  const saved = loadPuzzle();
  if (saved && !saved.topic && saved.direction.source === props.direction.source && saved.direction.target === props.direction.target) return saved;
  return newPuzzle(props.pack, props.profile, props.direction, props.difficulty, undefined, gridSizeParam() ?? props.gridSize);
}

/** İpucu karesindeki en uzun sözcüğün harf sayısı; kare yazısı buna göre küçülür, sözcük bölünmez. */
function longestWord(text: string): number {
  return Math.max(4, ...text.split(/\s+/).map((t) => Array.from(t).length));
}

export function hasSavedPuzzle(direction: Direction): boolean {
  const s = loadPuzzle();
  return !!s && s.direction.source === direction.source && s.direction.target === direction.target;
}

export function Puzzle(props: Props) {
  const { pack, profile, setProfile } = props;
  const [puzzle, setPuzzle] = useState<PuzzleState>(() => initialPuzzle(props));
  const [outcome, setOutcome] = useState<PuzzleOutcome | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [showChapter, setShowChapter] = useState(false);
  // Pekiştirme: bulmaca sonrası isteğe bağlı tur; bir kez oynanır.
  const [practiceItems, setPracticeItems] = useState<PracticeItem[]>([]);
  const [practice, setPractice] = useState<PracticeItem[] | null>(null);
  const [practiceDone, setPracticeDone] = useState<{ coins: number; mastered: number; total: number } | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [note, setNote] = useState<Note>(null);
  const noteSeq = useRef(0);
  const timer = useRef<number>();

  const tutorial = props.tutorialStep !== null;
  const step = tutorial ? TUTORIAL_STEPS[props.tutorialStep!] : null;
  // Eğitimde açık açıklama: adımın becerisiyle başlar; ilk yanlışta "wrong" araya girer.
  const [tip, setTip] = useState<TipId | null>(step?.skill ?? null);
  const wrongTipShown = useRef(false);

  // Anlık değerler: art arda gelen tuşlar React yeniden çizmeden işlense de harf kaybolmasın.
  const live = useRef({ puzzle, profile, tip });
  live.current = { puzzle, profile, tip };

  useEffect(() => () => window.clearTimeout(timer.current), []);
  useEffect(() => {
    // Eğitim ve konu bulmacası kaydedilmez: yarım kalmış kampanya bulmacasının üzerine yazmasın.
    if (!tutorial && !puzzle.topic && puzzle.status === 'playing') savePuzzle(puzzle);
  }, [puzzle, tutorial]);

  function closeTip(id?: TipId) {
    if (id && live.current.tip !== id) return;
    live.current.tip = null;
    setTip(null);
  }

  // T3: iki kelimenin başladığı ortak kare (yön değiştirme bu karede öğretilir).
  const switchCell = useMemo(() => {
    if (step?.skill !== 'switch') return null;
    const starts = puzzle.cw.words.map((w) => cellKey(w.row, w.col));
    return starts.find((k, i) => starts.indexOf(k) !== i) ?? null;
  }, [step, puzzle.cw]);
  // T3'te dikey kelime yalnızca ortak kareye ikinci kez dokunarak seçilir; oyun
  // oraya kendiliğinden geçmez, yoksa adım hiçbir şey öğretmez.
  const switchWord = useMemo(
    () => (switchCell ? puzzle.cw.words.findIndex((w) => w.dir === 'down' && cellKey(w.row, w.col) === switchCell) : -1),
    [switchCell, puzzle.cw],
  );
  const switched = useRef(false);

  /** T3, yön henüz değiştirilmediyse: dikey kelimeye başka yoldan geçişi engeller. */
  function guardSwitch(prev: PuzzleState, next: PuzzleState): PuzzleState {
    if (switchWord < 0 || switched.current) return next;
    if (next.event?.kind === 'solved' && next.seq !== prev.seq && next.status === 'playing') {
      // Kelime çözülünce imleç başka kelimeye atlamaz, çözülen kelimenin ilk karesinde kalır.
      return { ...next, sel: { word: next.event.word, index: 0 } };
    }
    if (next.sel.word !== switchWord || prev.sel.word === switchWord) return next;
    say('Önce parlayan kareye iki kez dokun.');
    return prev;
  }

  function say(text: string | null, tone: 'good' | 'bad' | 'info' = 'info') {
    noteSeq.current += 1;
    setNote(text ? { text, tone, seq: noteSeq.current } : null);
  }

  function saveProfile(p: Profile) {
    live.current.profile = p;
    setProfile(p);
  }

  function finish(done: PuzzleState, base: Profile) {
    window.clearTimeout(timer.current);
    if (tutorial) {
      // Eğitim profili değiştirmez (jeton, hedef, tekrar listesi); yalnızca adım ilerler.
      // Adım, "Devam"a basılmadan da kaydedilir: uygulama kapanırsa aynı adım tekrar oynatılmaz.
      const doneStep = props.tutorialStep! + 1;
      if (base.puzzleTutorialStep < doneStep) saveProfile({ ...base, puzzleTutorialStep: doneStep });
      closeTip();
      timer.current = window.setTimeout(() => setDialog({ kind: 'tutorialDone' }), reducedMotion() ? 0 : 900);
      return;
    }
    if (!done.topic) savePuzzle(null);
    const res = applyPuzzle(base, done, pack, props.adaptive, new Date());
    saveProfile(res.profile);
    setOutcome(res.outcome);
    // Seçenekler bir kez karıştırılır: sonuç ekranı yeniden çizilince değişmesin.
    setPracticeItems(buildPractice(pack, done.direction, res.outcome.results));
    window.clearTimeout(timer.current);
    // Tamamlanan ızgara kutlamayla 1,5 sn görünür; dokunan beklemeden geçer.
    const wait = done.event?.kind === 'complete' ? CELEBRATE_MS : 0;
    timer.current = window.setTimeout(() => setShowResult(true), wait);
  }

  function commit(next: PuzzleState, base: Profile = live.current.profile) {
    const prev = live.current.puzzle;
    if (next === prev) return;
    live.current.puzzle = next;
    setPuzzle(next);
    if (next.seq !== prev.seq && next.event) {
      const e = next.event;
      const w = 'word' in e ? next.cw.words[e.word] : null;
      const tgt = next.direction.target;
      if (e.kind === 'solved' && w) {
        say(`Doğru! ${w.clue} → ${displayWord(w.answer, tgt)}`, 'good');
        buzz(25);
        // Son kelimede "bulmaca bitti" sesi çalar; ikisi üst üste binmesin.
        if (next.status !== 'done') sfx.correct();
      } else if (e.kind === 'wrong' && w) {
        say(`${clueLabel(w)}: yanlış harf var`, 'bad');
        buzz([40, 60, 40]);
        sfx.wrong();
      } else if (e.kind === 'reveal') say('Harf açıldı.');
      else if (e.kind === 'meaning') say('Anlam ipucu üstte.');
      else if (e.kind === 'sentence') say('Örnek cümle üstte.');
      else if (e.kind === 'synonym') say('Eş anlamlılar üstte.');
      else if (e.kind === 'complete') {
        say(tutorial ? 'Tamam!' : 'Bulmaca tamam! Devam için dokun.', 'good');
        buzz([30, 50, 30, 50, 60]);
        sfx.complete();
      }
      if (tutorial) {
        // Açıklamalar, öğrettikleri şey olunca kendiliğinden kapanır.
        if (e.kind === 'solved') {
          closeTip('crossing');
          closeTip('wrong');
          // Kırık ok açıklaması iki türü de anlatır: ikisi de çözülünce kapanır.
          const bent = next.cw.words.map((w, i) => (w.arrow === 'down-right' || w.arrow === 'right-down' ? i : -1)).filter((i) => i >= 0);
          if (bent.every((i) => next.solved[i])) closeTip('bent');
        }
        if ((e.kind === 'reveal' || e.kind === 'meaning') && live.current.tip === 'tools') closeTip('tools');
        if (e.kind === 'wrong' && !wrongTipShown.current) {
          // İlk yanlışta düzeltmeyi anlat; o an başka açıklama açıksa onu bekletme.
          wrongTipShown.current = true;
          live.current.tip = 'wrong';
          setTip('wrong');
        }
      }
    }
    if (prev.status === 'playing' && next.status === 'done') finish(next, base);
    else if (base !== live.current.profile) saveProfile(base);
  }

  function onLetter(letter: string) {
    closeTip('basics');
    const prev = live.current.puzzle;
    commit(guardSwitch(prev, typeLetter(prev, letter)));
  }

  /** Kareye dokunma; T3'te ortak karede yön değişince açıklama kapanır. */
  function onCell(r: number, c: number) {
    const prev = live.current.puzzle;
    const next = tapCell(prev, r, c);
    if (switchCell === cellKey(r, c) && next.sel.word !== prev.sel.word && selectedCell(prev).join() === [r, c].join()) {
      if (live.current.tip === 'switch') say('Yön değişti!', 'good');
      switched.current = true;
      closeTip('switch');
    }
    commit(guardSwitch(prev, next));
  }
  function onBackspace() {
    commit(backspace(live.current.puzzle));
  }
  function moveWord(delta: 1 | -1) {
    const p = live.current.puzzle;
    commit(guardSwitch(p, selectWord(p, stepWord(p, p.sel.word, delta))));
  }

  function onTool(tool: PuzzleToolId) {
    const { puzzle: p, profile: pr } = live.current;
    if (p.status !== 'playing') return;
    if (!tutorial && pr.inventory[tool] <= 0) {
      setDialog({ kind: 'toolEmpty', tool });
      return;
    }
    const word = p.cw.words[p.sel.word];
    const entry = pack.entries.find((e) => e.id === word.entryId);
    // Tanım ipucunda anlam zaten ekranda: Anlam aracı yeni bir şey göstermez.
    const hasMeaning = !!entry?.hint?.tr && word.clueKind !== 'definition';
    // Cümle ipucunda cümle zaten ekranda: Cümle jokeri yeni bir şey göstermez.
    const hasSentence = !!entry && word.clueKind !== 'cloze' && !!sentenceFor(entry, p.direction);
    const hasSynonym = !!entry && synonymsFor(entry, p.direction.target, word.answer).length > 0;
    const res =
      tool === 'hint'
        ? showMeaning(p, hasMeaning)
        : tool === 'sentence'
          ? showExtra(p, 'sentence', hasSentence)
          : tool === 'synonym'
            ? showExtra(p, 'synonym', hasSynonym)
            : revealLetter(p);
    if (!res.applied) {
      const why =
        tool === 'hint'
          ? p.meaningShown[p.sel.word]
            ? 'Bu kelimenin anlam ipucu zaten açık.'
            : word.clueKind === 'definition'
              ? 'İpucu zaten kelimenin tanımı.'
              : 'Bu kelime için anlam ipucu yok.'
          : tool === 'sentence'
            ? extraShown(p, 'sentence', p.sel.word)
              ? 'Cümle zaten açık.'
              : word.clueKind === 'cloze'
                ? 'İpucu zaten bir cümle.'
                : 'Bu kelime için uygun örnek cümle yok.'
            : tool === 'synonym'
              ? extraShown(p, 'synonym', p.sel.word)
                ? 'Eş anlamlılar zaten açık.'
                : 'Bu kelimenin kayıtlı eş anlamlısı yok.'
              : 'Bu kelimede açılacak harf kalmadı.';
      say(tutorial ? why : `${why} Hak harcanmadı.`);
      return;
    }
    // Eğitimde araçlar ücretsiz: hak harcanmaz.
    commit(res.state, tutorial ? pr : consumeCharge(pr, tool));
  }

  // Fiziksel klavye: harf yaz, ⌫ sil, Tab / Enter sıradaki kelime, oklar kare seç.
  const keyHandler = useRef<(e: KeyboardEvent) => void>();
  keyHandler.current = (e: KeyboardEvent) => {
    const p = live.current.puzzle;
    if (props.paused || dialog || showResult || p.status !== 'playing') return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'Backspace') {
      e.preventDefault();
      onBackspace();
      return;
    }
    if (e.key === 'Tab' || e.key === 'Enter') {
      e.preventDefault();
      moveWord(e.shiftKey ? -1 : 1);
      return;
    }
    const letter = keyToLetter(e.key, p.direction.target);
    if (letter && languageInfo(p.direction.target).alphabet.includes(letter)) {
      e.preventDefault();
      onLetter(letter);
    }
  };
  useEffect(() => {
    const h = (e: KeyboardEvent) => keyHandler.current?.(e);
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const { cw } = puzzle;
  const src = languageInfo(puzzle.direction.source);
  const tgt = languageInfo(puzzle.direction.target);
  const selWord = cw.words[puzzle.sel.word];
  const selEntry = pack.entries.find((e) => e.id === selWord?.entryId);
  const selKind = selWord?.clueKind ?? 'translation';
  const [cr, cc] = selectedCell(puzzle);

  // Kare haritası: harf kareleri ve ipucu kareleri.
  const layout = useMemo(() => {
    const letters = new Map<string, { letter: string; words: number[] }>();
    const clues = new Map<string, number[]>();
    cw.words.forEach((w, i) => {
      wordCells(w).forEach(([r, c], k) => {
        const key = cellKey(r, c);
        const cell = letters.get(key) ?? { letter: w.letters[k], words: [] };
        cell.words.push(i);
        letters.set(key, cell);
      });
      const ck = cellKey(w.clueRow, w.clueCol);
      clues.set(ck, [...(clues.get(ck) ?? []), i]);
    });
    return { letters, clues };
  }, [cw]);

  const selCells = new Set(wordCells(selWord).map(([r, c]) => cellKey(r, c)));
  // Tamamen dolu ama çözülmemiş kelime yanlıştır (dolu ve doğru kelime hemen çözülür).
  // Kırmızı işaret, kelimedeki bir kare değişene kadar kalır.
  const wrongMarked = new Set<string>();
  if (puzzle.status === 'playing') {
    cw.words.forEach((w, i) => {
      const cs = wordCells(w).map(([r, c]) => cellKey(r, c));
      if (!puzzle.solved[i] && cs.every((k) => puzzle.fill[k])) cs.forEach((k) => wrongMarked.add(k));
    });
  }
  const flashWrong = puzzle.event?.kind === 'wrong' ? puzzle.event.word : -1;
  const flashSolved = puzzle.event?.kind === 'solved' ? puzzle.event.word : -1;
  const wrongCells = flashWrong >= 0 ? new Set(wordCells(cw.words[flashWrong]).map(([r, c]) => cellKey(r, c))) : null;
  const solvedCells = flashSolved >= 0 ? new Set(wordCells(cw.words[flashSolved]).map(([r, c]) => cellKey(r, c))) : null;
  const solved = solvedCount(puzzle);
  const total = cw.words.length;

  if (showChapter && outcome?.chapterCompleted) {
    return <ChapterComplete chapter={outcome.chapterCompleted} profile={profile} onNext={props.onNewPuzzle} onHome={props.onExit} />;
  }

  if (showResult && outcome && practice) {
    return (
      <Practice
        items={practice}
        direction={puzzle.direction}
        onDone={(results) => {
          // Hiçbir kelime bitmeden çıkıldıysa teklif sonuç ekranında kalır.
          if (!results.length) {
            setPractice(null);
            return;
          }
          const res = applyPractice(live.current.profile, results);
          saveProfile(res.profile);
          setPracticeDone({ coins: res.coins, mastered: res.mastered, total: results.length });
          setPractice(null);
        }}
      />
    );
  }

  if (showResult && outcome) {
    return (
      <PuzzleResult
        practiceWords={practiceItems.map((i) => i.answer)}
        practiceDone={practiceDone}
        onPractice={() => setPractice(practiceItems)}
        puzzle={puzzle}
        outcome={outcome}
        profile={profile}
        // Bölüm bittiyse önce kelime sonuçları, sonra bölüm sonu ekranı.
        onAgain={outcome.chapterCompleted ? () => setShowChapter(true) : props.onNewPuzzle}
        onHome={props.onExit}
        onReview={props.onOpenReview}
      />
    );
  }

  const cells = [];
  for (let r = 0; r < cw.rows; r++) {
    for (let c = 0; c < cw.cols; c++) {
      const key = cellKey(r, c);
      const letter = layout.letters.get(key);
      const clueWords = layout.clues.get(key);
      if (letter) {
        const typed = puzzle.fill[key];
        const locked = isLocked(puzzle, r, c);
        const cls = [
          'cw-cell',
          selCells.has(key) ? 'in-word' : '',
          r === cr && c === cc && puzzle.status === 'playing' ? 'cursor' : '',
          locked ? 'solved' : '',
          puzzle.revealed.includes(key) ? 'revealed' : '',
          wrongCells?.has(key) ? 'flash-wrong' : '',
          wrongMarked.has(key) && !locked ? 'is-wrong' : '',
          solvedCells?.has(key) ? 'flash-solved' : '',
          puzzle.status === 'done' && !locked ? 'missed' : '',
          tip === 'switch' && switchCell === key ? 'coach-pulse' : '',
        ]
          .filter(Boolean)
          .join(' ');
        // Bulmaca bitince çözülmeyen kareler doğru harfle gösterilir.
        const shown = puzzle.status === 'done' && !locked ? letter.letter : typed;
        cells.push(
          <button
            key={key + (wrongCells?.has(key) || solvedCells?.has(key) ? `-${puzzle.seq}` : '')}
            type="button"
            className={cls}
            style={puzzle.status === 'done' ? { ['--wave' as string]: r + c } : undefined}
            onClick={() => onCell(r, c)}
            aria-label={`${letter.words.map((w) => clueLabel(cw.words[w])).join(' / ')} kelimesinin karesi${typed ? `, yazılan ${displayLetter(typed, tgt.code)}` : ', boş'}${locked ? ', çözüldü' : wrongMarked.has(key) ? ', kelimede yanlış harf var' : ''}`}
          >
            {shown ? displayLetter(shown, tgt.code) : ''}
          </button>,
        );
      } else if (clueWords) {
        cells.push(
          <button
            key={key}
            type="button"
            className={`cw-clue${clueWords.length > 1 ? ' two' : ''}`}
            onClick={() => commit(guardSwitch(live.current.puzzle, tapClue(live.current.puzzle, r, c)))}
            aria-label={clueWords.map((w) => `İpucu: ${clueFullText(cw.words[w])}`).join('; ')}
          >
            {clueWords.map((w) => (
              <span
                key={w}
                className={`cw-clue-part${w === puzzle.sel.word ? ' selected' : ''}${puzzle.solved[w] ? ' done' : ''}`}
                lang={src.code}
              >
                <span
                  className={`cw-clue-text${cw.words[w].clueKind && cw.words[w].clueKind !== 'translation' ? ' is-kind' : ''}`}
                  style={{ ['--len' as string]: longestWord(clueLabel(cw.words[w])) }}
                >
                  {clueLabel(cw.words[w])}
                </span>
                <ClueArrow arrow={cw.words[w].arrow} className="cw-arrow" />
              </span>
            ))}
          </button>,
        );
      } else {
        cells.push(<span key={key} className="cw-void" aria-hidden="true" />);
      }
    }
  }

  return (
    <div
      className="cw-page"
      // Kutlama sırasında herhangi bir yere dokunmak sonuç ekranına geçirir.
      onClickCapture={(e) => {
        if (tutorial || !outcome || showResult || puzzle.event?.kind !== 'complete') return;
        e.stopPropagation();
        window.clearTimeout(timer.current);
        setShowResult(true);
      }}
    >
      <header className="game-top">
        <button
          type="button"
          className="icon-btn"
          // Eğitimden çıkınca adım kaybolmaz; kaldığı adımdan devam eder.
          onClick={() => (tutorial ? props.onExit() : setDialog({ kind: 'quit' }))}
          aria-label={tutorial ? 'Eğitimden çık' : 'Bulmacadan çık'}
        >
          <CloseIcon />
        </button>
        <div className="game-progress">
          <div className="progress-label">
            <span>
              {tutorial
                ? `${props.tutorialStep! + 1}/${TUTORIAL_LENGTH} · ${step!.title}`
                : puzzle.topic
                  ? `Konu: ${TOPIC_MODES.find((m) => m.id === puzzle.topic)?.name ?? puzzle.topic}`
                  : `Bölüm ${chapterInfo(profile.campaign).chapter} · ${DIFFICULTY_LABEL[puzzle.difficulty]}`}
            </span>
            <span aria-label={`${total} kelimeden ${solved} tanesi çözüldü`}>
              {solved}/{total}
            </span>
          </div>
          <div className="progress-bar" role="progressbar" aria-label="Çözülen kelimeler" aria-valuemin={0} aria-valuemax={total} aria-valuenow={solved}>
            <span style={{ width: `${(solved / total) * 100}%` }} />
          </div>
        </div>
        <div className="game-stats">
          {tutorial ? (
            <button type="button" className="btn btn-ghost btn-small" onClick={props.onTutorialSkip}>
              Eğitimi atla
            </button>
          ) : (
            <>
              <span className="stat coin" aria-label={`${profile.coins} jeton`}>
                <CoinIcon width={16} height={16} />
                <strong>{profile.coins}</strong>
              </span>
              <button type="button" className="icon-btn small" onClick={() => setDialog({ kind: 'help' })} aria-label="Nasıl oynanır">
                <QuestionIcon width={20} height={20} />
              </button>
            </>
          )}
        </div>
      </header>

      <section className={`cw-cluebar${puzzle.solved[puzzle.sel.word] ? ' is-solved' : ''}`} aria-live="polite">
        <button type="button" className="cw-nav" onClick={() => moveWord(-1)} aria-label="Önceki kelime">
          <ChevronLeftIcon width={20} height={20} />
        </button>
        <div className="cw-clue-main">
          {selKind === 'translation' ? (
            <p className="cw-clue-line">
              <strong lang={src.code}>{selWord.clue}</strong>
              <ClueArrow arrow={selWord.arrow} width={14} height={14} className="cw-arrow" />
              <span className="cw-len">{selWord.letters.length} harf</span>
            </p>
          ) : (
            // Cümle ya da tanım ipucu: tür etiketi, tam metin, ok ve harf sayısı.
            <>
              <p className="cw-clue-kind">
                <span className="chip">{CLUE_KIND_LABEL[selKind]}</span>
                <ClueArrow arrow={selWord.arrow} width={14} height={14} className="cw-arrow" />
                <span className="cw-len">{selWord.letters.length} harf</span>
              </p>
              <p className="cw-clue-long" lang={selKind === 'cloze' ? tgt.code : 'tr'}>
                {clueFullText(selWord)}
              </p>
              {/* Cümle ipucunda kaynak dildeki karşılığı da görünür: boşluk tek anlama iner. */}
              {selKind === 'cloze' && selEntry?.terms[src.code]?.example && (
                <p className="cw-clue-trans" lang={src.code}>
                  {selEntry.terms[src.code].example}
                </p>
              )}
            </>
          )}
          {selKind === 'translation' && selEntry?.terms[src.code]?.context && <p className="cw-clue-sub">({selEntry.terms[src.code].context})</p>}
          {puzzle.meaningShown[puzzle.sel.word] && selEntry?.hint?.tr && selKind !== 'definition' && <p className="cw-clue-hint">{selEntry.hint.tr}</p>}
          {selEntry && extraShown(puzzle, 'synonym', puzzle.sel.word) && (
            <p className="cw-clue-hint">
              Aynı anlamda: <span lang={tgt.code}>{synonymsFor(selEntry, tgt.code, selWord.answer).join(', ')}</span>
              <small> · ızgaradaki kelime bunlardan farklı</small>
            </p>
          )}
          {selEntry && extraShown(puzzle, 'sentence', puzzle.sel.word) && sentenceFor(selEntry, puzzle.direction) && (
            <>
              <p className="cw-clue-hint" lang={tgt.code}>
                {sentenceFor(selEntry, puzzle.direction)!.cloze}
              </p>
              {sentenceFor(selEntry, puzzle.direction)!.translation && (
                <p className="cw-clue-trans" lang={src.code}>
                  {sentenceFor(selEntry, puzzle.direction)!.translation}
                </p>
              )}
            </>
          )}
          {puzzle.solved[puzzle.sel.word] && (
            <p className="cw-clue-sub good">
              Çözüldü: <span lang={tgt.code}>{displayWord(selWord.answer, tgt.code)}</span>
              {selKind !== 'translation' && (
                <>
                  {' '}
                  · <span lang={src.code}>{selWord.clue}</span>
                </>
              )}
            </p>
          )}
          {puzzle.solved[puzzle.sel.word] && selEntry?.grammar && <p className="cw-clue-sub">{selEntry.grammar.note}</p>}
        </div>
        <button type="button" className="cw-nav" onClick={() => moveWord(1)} aria-label="Sonraki kelime">
          <ChevronRightIcon width={20} height={20} />
        </button>
      </section>

      <div className="cw-board">
        <div
          className={`cw-grid${puzzle.status === 'done' ? ' is-done' : ''}`}
          style={{ ['--cols' as string]: cw.cols, ['--rows' as string]: cw.rows }}
          lang={tgt.code}
          role="group"
          aria-label={`${src.name} ipuçlu, ${tgt.name} cevaplı çengel bulmaca`}
        >
          {cells}
        </div>
        {note && (
          <p className={`cw-toast note-${note.tone}`} key={note.seq} aria-hidden="true">
            {note.text}
          </p>
        )}
      </div>
      {/* Açıklama ızgaranın altında kendi yerinde durur: kareleri örtmez, ızgara onun için küçülür. */}
      {tip && puzzle.status === 'playing' && (
        <div className="cw-coach" role="note" key={tip}>
          <p>{TIPS[tip]}</p>
          <button type="button" className="btn btn-secondary btn-small" onClick={() => closeTip()}>
            Anladım
          </button>
        </div>
      )}
      <p className="sr-only" role="status" aria-live="polite">
        {note?.text ?? ''}
      </p>

      <div className="cw-tools" role="toolbar" aria-label="Yardım araçları">
        {PUZZLE_TOOL_ORDER.map((tool) => {
          const Icon = TOOL_ICONS[tool];
          const info = PUZZLE_TOOL_INFO[tool];
          const count = profile.inventory[tool];
          return (
            <button
              key={tool}
              type="button"
              className={`cw-tool tool-${tool}${!tutorial && count === 0 ? ' is-empty' : ''}${tip === 'tools' ? ' coach-pulse' : ''}`}
              onClick={() => onTool(tool)}
              aria-label={`${info.name}: ${info.does} ${
                tutorial ? 'Eğitimde ücretsiz.' : count === 0 ? 'Hakkın kalmadı; dokununca seçenekler açılır.' : `Kalan hak: ${count}. Bedel: ${info.cost}.`
              }`}
            >
              <span className="tool-circle small">
                <Icon width={20} height={20} />
              </span>
              <span>{info.name}</span>
              <span className="cw-tool-count" aria-hidden="true">
                {tutorial ? '∞' : count === 0 ? '+' : count}
              </span>
            </button>
          );
        })}
        {!tutorial && (
          <button type="button" className="btn btn-ghost btn-small cw-finish" onClick={() => setDialog({ kind: 'quit' })}>
            Bitir
          </button>
        )}
      </div>

      <Keyboard lang={tgt.code} onLetter={onLetter} onBackspace={onBackspace} disabled={puzzle.status !== 'playing'} />

      {dialog?.kind === 'tutorialDone' && step && (
        <Sheet title={props.tutorialStep! + 1 < TUTORIAL_LENGTH ? `${step.title}: tamam` : 'Eğitim bitti'}>
          {props.tutorialStep! + 1 < TUTORIAL_LENGTH ? (
            <p>
              Sıradaki: <strong>{TUTORIAL_STEPS[props.tutorialStep! + 1].title}</strong> ({props.tutorialStep! + 2}/{TUTORIAL_LENGTH})
            </p>
          ) : (
            <p>Artık gerçek bulmacalara hazırsın. Yanlışlar puanı biraz düşürür, ama hakkın bitmez.</p>
          )}
          <div className="stack">
            <button type="button" className="btn btn-primary btn-block" onClick={() => props.onTutorialAdvance(props.tutorialStep! + 1)}>
              {props.tutorialStep! + 1 < TUTORIAL_LENGTH ? 'Devam' : 'İlk bulmacaya başla'}
            </button>
            {props.tutorialStep! + 1 < TUTORIAL_LENGTH && (
              <button type="button" className="btn btn-ghost btn-block" onClick={props.onTutorialSkip}>
                Eğitimi atla
              </button>
            )}
          </div>
        </Sheet>
      )}

      {dialog?.kind === 'help' && (
        <Sheet title="Nasıl oynanır" onClose={() => setDialog(null)}>
          <ul className="cw-intro">
            <li>
              Oklu kutular ipucudur: {src.name} bir kelime. Karşılığını {tgt.name} olarak okun gösterdiği yöne yaz.
            </li>
            <li className="cw-intro-arrows">
              <span>
                <ClueArrow arrow="right" /> sağa
              </span>
              <span>
                <ClueArrow arrow="down" /> aşağı
              </span>
              <span>
                <ClueArrow arrow="down-right" /> alttan sağa
              </span>
              <span>
                <ClueArrow arrow="right-down" /> yandan aşağı
              </span>
            </li>
            <li>Bir kareye ya da ipucuna dokun, klavyeyle yaz. Kesişen kareye tekrar dokunursan yön değişir.</li>
            <li>Kelimeler kesişir: bildiğin kelimenin harfleri diğerlerine ipucu olur.</li>
            <li>
              Takılırsan <strong>Anlam</strong> ya da <strong>Harf aç</strong> kullan. Yanlışlar puanı biraz düşürür, ama hakkın bitmez; çözemediğin
              kelimeler tekrar listene eklenir.
            </li>
          </ul>
          <div className="stack">
            <button type="button" className="btn btn-primary btn-block" onClick={() => setDialog(null)}>
              Bulmacaya dön
            </button>
            <button type="button" className="btn btn-secondary btn-block" onClick={props.onReplayTutorial}>
              Eğitimi baştan oynat
            </button>
            <p className="muted small center">Bu bulmaca kaldığı yerde bekler.</p>
          </div>
        </Sheet>
      )}

      {dialog?.kind === 'toolEmpty' && (
        <ToolEmpty
          tool={dialog.tool}
          name={PUZZLE_TOOL_INFO[dialog.tool].name}
          freeNote="Yazmak, silmek ve kelimeler arasında gezinmek her zaman ücretsiz."
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
        <Sheet title="Bulmacayı bitir?" onClose={() => setDialog(null)}>
          <p>
            {total} kelimeden {solved} tanesini çözdün. Bitirirsen kalanların cevabı gösterilir ve tekrar listene eklenir. Puanın ve
            jetonların korunur.
          </p>
          <p className="muted small">“Ana sayfaya dön” dersen bulmaca kaldığı yerde bekler.</p>
          <div className="stack">
            <button type="button" className="btn btn-primary btn-block" onClick={() => setDialog(null)}>
              Çözmeye devam et
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-block"
              onClick={() => {
                setDialog(null);
                commit(finishPuzzle(live.current.puzzle));
              }}
            >
              Bitir ve cevapları gör
            </button>
            <button type="button" className="btn btn-ghost btn-block" onClick={props.onExit}>
              Ana sayfaya dön
            </button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
