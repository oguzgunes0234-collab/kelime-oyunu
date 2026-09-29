import { currentStreak, dayKey } from '../../core/daily';
import { TOOL_ORDER } from '../../core/economy';
import { languageInfo } from '../../core/languages';
import { DIFFICULTY_CEFR_LABEL, DIFFICULTY_LABEL } from '../../core/pack';
import type { Profile } from '../../core/profile';
import { remainingFresh } from '../../core/select';
import type { DifficultyMode, WordPack } from '../../core/types';
import { BagIcon, BookIcon, CoinIcon, FlameIcon, GearIcon, GridIcon, LettersIcon, QuestionIcon, SwapIcon, TOOL_ICONS } from '../components/Icons';

interface Props {
  pack: WordPack;
  profile: Profile;
  setProfile: (p: Profile) => void;
  /** Ana oyun: çengel bulmaca. */
  onPuzzle: () => void;
  /** Bu yön için yarım kalmış bir bulmaca var mı. */
  puzzleSaved: boolean;
  /** İkinci mod: harf taşlarıyla 10 kelimelik hızlı tur. */
  onPlay: () => void;
  onReview: () => void;
  onSettings: () => void;
  onStore: () => void;
  onHowTo: () => void;
}

const MODES: DifficultyMode[] = ['easy', 'medium', 'hard', 'adaptive'];

export function Home({ pack, profile, setProfile, onPuzzle, puzzleSaved, onPlay, onReview, onSettings, onStore, onHowTo }: Props) {
  const { direction, difficultyMode } = profile.settings;
  const src = languageInfo(direction.source);
  const tgt = languageInfo(direction.target);
  const now = new Date();
  const today = profile.daily.day === dayKey(now) ? profile.daily.todayCorrect : 0;
  const goal = profile.daily.goal;
  const streak = currentStreak(profile.daily, now);
  const pct = Math.min(1, today / goal);
  const effective = difficultyMode === 'adaptive' ? profile.adaptive.difficulty : difficultyMode;
  const fresh = remainingFresh(pack, profile, direction, effective);

  function update(settings: Partial<Profile['settings']>) {
    setProfile({ ...profile, settings: { ...profile.settings, ...settings } });
  }

  return (
    <div className="page home">
      <header className="home-head">
        <div className="brand">
          <span className="brand-tiles" aria-hidden="true">
            <span>K</span>
            <span>K</span>
          </span>
          <h1>Kelime Köprüsü</h1>
        </div>
        <div className="home-head-actions">
          <span className="pill" aria-label={`${profile.coins} jeton`}>
            <CoinIcon width={16} height={16} /> {profile.coins}
          </span>
          <button type="button" className="icon-btn" onClick={onSettings} aria-label="Ayarlar">
            <GearIcon />
          </button>
        </div>
      </header>

      <section className="daily-card" aria-label="Günlük hedef ve seri">
        <div
          className="ring"
          style={{ ['--pct' as string]: pct }}
          role="img"
          aria-label={`Bugün ${today} / ${goal} kelime`}
        >
          <span>
            <strong>{Math.min(today, goal)}</strong>/{goal}
          </span>
        </div>
        <div className="daily-text">
          <p className="daily-title">{today >= goal ? 'Bugünkü hedef tamam!' : 'Günlük hedef'}</p>
          <p className="muted">
            {today >= goal
              ? 'İstersen oynamaya devam et; baskı yok.'
              : `${goal - today} doğru kelime daha. Yanlışlar hiçbir şey eksiltmez.`}
          </p>
          <p className="streak">
            <FlameIcon width={18} height={18} />
            {streak.streak > 0 ? (
              <span>
                {streak.streak} günlük seri
                {streak.restDayNeeded && ' · bugün oynarsan dinlenme günün devreye girer'}
              </span>
            ) : (
              <span>Hedefi tamamladığın gün yeni bir seri başlar</span>
            )}
          </p>
        </div>
      </section>

      <section className="setup" aria-labelledby="dir-title">
        <h2 id="dir-title" className="section-title">
          Oyun yönü
        </h2>
        <div className="direction">
          <span className="dir-lang">
            {src.name}
          </span>
          <button
            type="button"
            className="swap-btn"
            onClick={() => update({ direction: { source: direction.target, target: direction.source } })}
            aria-label={`Yönü çevir (şu an ${src.name} → ${tgt.name})`}
          >
            <SwapIcon />
          </button>
          <span className="dir-lang">{tgt.name}</span>
        </div>
        <p className="muted center small">
          {src.name} kelime gösterilir, {tgt.name} karşılığını kurarsın.
        </p>

        <h2 className="section-title" id="level-title">
          Seviye
        </h2>
        <div className="levels" role="radiogroup" aria-labelledby="level-title">
          {MODES.map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={difficultyMode === m}
              className={`level${difficultyMode === m ? ' selected' : ''}`}
              onClick={() => update({ difficultyMode: m })}
            >
              <strong>{m === 'adaptive' ? 'Uyarlamalı' : DIFFICULTY_LABEL[m]}</strong>
              <small>
                {m === 'adaptive'
                  ? `Performansına göre · şu an ${DIFFICULTY_LABEL[profile.adaptive.difficulty]}`
                  : DIFFICULTY_CEFR_LABEL[m]}
              </small>
            </button>
          ))}
        </div>

        <button type="button" className="btn btn-primary btn-block btn-big play-puzzle" onClick={onPuzzle}>
          <GridIcon width={26} height={26} />
          {puzzleSaved ? 'Bulmacaya devam et' : 'Bulmaca çöz'}
        </button>
        <p className="muted center small">
          {puzzleSaved
            ? 'Yarım kalan bulmacan kaldığı yerde bekliyor.'
            : `${src.name} ipuçlu, ${tgt.name} cevaplı çengel bulmaca · henüz bilmediğin ${fresh} kelime var`}
        </p>
        <button type="button" className="btn btn-secondary btn-block play-quick" onClick={onPlay}>
          <LettersIcon width={22} height={22} />
          Hızlı kelime turu
          <small>10 kelime, harf taşlarıyla</small>
        </button>
      </section>

      <nav className="home-grid" aria-label="Diğer bölümler">
        <button type="button" className="tile-link" onClick={onReview}>
          <BookIcon />
          <span>Tekrar listesi</span>
          {profile.review.length > 0 && <span className="count">{profile.review.length}</span>}
        </button>
        <button type="button" className="tile-link" onClick={onStore}>
          <BagIcon />
          <span>Hak ve paketler</span>
          <span className="mini-tools" aria-label={`Kalan haklar: ${TOOL_ORDER.map((t) => profile.inventory[t]).join(', ')}`}>
            {TOOL_ORDER.map((t) => {
              const I = TOOL_ICONS[t];
              return (
                <span key={t} aria-hidden="true">
                  <I width={12} height={12} />
                  {profile.inventory[t]}
                </span>
              );
            })}
          </span>
        </button>
        <button type="button" className="tile-link" onClick={onHowTo}>
          <QuestionIcon />
          <span>Hızlı tur eğitimi</span>
        </button>
      </nav>

      <footer className="home-foot">
        <p>
          {pack.name}: {pack.entries.length} elle seçilmiş kelime. Kapsamlı bir sözlük değildir; seviyeler yaklaşık CEFR tahminidir.
        </p>
        <p>İlerlemen yalnızca bu cihazda, tarayıcında saklanır. Hesap gerekmez.</p>
      </footer>
    </div>
  );
}

