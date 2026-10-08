import { chapterInfo } from '../../core/campaign';
import { DAILY_PUZZLE_GOAL, currentStreak, goalDoneToday } from '../../core/daily';
import { languageInfo } from '../../core/languages';
import type { Profile } from '../../core/profile';
import { topicStatuses } from '../../core/topics';
import type { WordPack } from '../../core/types';
import { ChapterPath } from '../components/ChapterPath';
import { BagIcon, BookIcon, CheckIcon, CoinIcon, FlameIcon, GearIcon, GridIcon, LettersIcon, SwapIcon } from '../components/Icons';

interface Props {
  pack: WordPack;
  profile: Profile;
  setProfile: (p: Profile) => void;
  /** Ana oyun: bölümlü çengel bulmaca. */
  onPuzzle: () => void;
  /** Bu yön için yarım kalmış bir ana oyun bulmacası var mı. */
  puzzleSaved: boolean;
  /** Bulmaca eğitimi henüz bitmedi (ana düğme eğitimi açar). */
  tutorialPending: boolean;
  /** Hızlı tur: harf taşlarıyla 10 kelime. */
  onPlay: () => void;
  /** Konu bulmacasını doğrudan başlatır (konu kimliği). */
  onPlayTopic: (topicId: string) => void;
  onReview: () => void;
  onSettings: () => void;
  onStore: () => void;
}

/**
 * Ana sayfa. Öncelik sırası: bölüm ve ilerleme → tek ana eylem → konu modları
 * (ana sayfada, kendi içinde kayan liste; dokununca bulmaca başlar) → yön →
 * hızlı tur / tekrar / haklar. Sayfanın kendisi kaymaz. Zorluk seçimi yok: kelime
 * seviyesini uyarlamalı zorluk, bulmaca boyunu bölüm belirler.
 */
export function Home({ pack, profile, setProfile, onPuzzle, puzzleSaved, tutorialPending, onPlay, onPlayTopic, onReview, onSettings, onStore }: Props) {
  const { direction } = profile.settings;
  const src = languageInfo(direction.source);
  const tgt = languageInfo(direction.target);
  const now = new Date();
  const { chapter, done, size } = chapterInfo(profile.campaign);
  const goalDone = goalDoneToday(profile.daily, now);
  const streak = currentStreak(profile.daily, now);
  // Hiç kelimesi olmayan mod gösterilmez (bkz. TopicModes).
  const topics = topicStatuses(pack).filter((t) => t.total > 0);
  const openTopics = topics.filter((t) => t.enabled).length;

  const action = tutorialPending
    ? { label: 'Başla', sub: '5 kısa eğitim bulmacası. İstersen atla.' }
    : puzzleSaved
      ? { label: 'Devam et', sub: 'Yarım kalan bulmacan seni bekliyor.' }
      : { label: profile.campaign.puzzlesDone > 0 ? 'Sıradaki bulmaca' : 'Başla', sub: `${src.name} ipucu, ${tgt.name} cevap` };

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

      <section className="campaign-card paper" aria-labelledby="chapter-title">
        <div className="campaign-top">
          <h2 id="chapter-title" className="ink-title">Bölüm {chapter}</h2>
          <span className="campaign-count">
            {done}/{size} bulmaca
          </span>
        </div>
        <ChapterPath info={{ chapter, done, size }} />
        <p className="campaign-meta">
          <span className={`daily-chip${goalDone ? ' done' : ''}`}>
            {goalDone ? <CheckIcon width={14} height={14} /> : null}
            {goalDone ? 'Bugünkü hedef tamam' : `Bugünkü hedef: 0/${DAILY_PUZZLE_GOAL} bulmaca`}
          </span>
          <span className="streak-chip" aria-label={`${streak.streak} günlük seri`}>
            <FlameIcon width={15} height={15} /> {streak.streak}
          </span>
        </p>
        <button type="button" className="btn btn-primary btn-block btn-big play-puzzle" onClick={onPuzzle}>
          <GridIcon width={24} height={24} />
          {action.label}
        </button>
        <p className="muted small center">{action.sub}</p>
      </section>

      <section className="topic-panel" aria-labelledby="topics-title">
        <h2 id="topics-title">
          Konular <small>{openTopics} açık · konuya dokun</small>
        </h2>
        <ul className="topic-scroll">
          {topics.map((t) => (
            <li key={t.mode.id}>
              <button type="button" className="topic-tile" disabled={!t.enabled} onClick={() => onPlayTopic(t.mode.id)}>
                <strong>{t.mode.name}</strong>
                {!t.enabled && <small>Hazırlanıyor</small>}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="direction-row" aria-label="Oyun yönü">
        <span className="dir-lang">{src.name}</span>
        <button
          type="button"
          className="swap-btn"
          onClick={() => setProfile({ ...profile, settings: { ...profile.settings, direction: { source: direction.target, target: direction.source } } })}
          aria-label={`Yönü çevir (şu an ${src.name} → ${tgt.name})`}
        >
          <SwapIcon />
        </button>
        <span className="dir-lang">{tgt.name}</span>
      </section>

      <nav className="home-links" aria-label="Diğer bölümler">
        <button type="button" className="link-btn" onClick={onPlay} aria-label="Hızlı tur: 10 kelime, harf taşlarıyla">
          <LettersIcon width={18} height={18} />
          Hızlı tur
        </button>
        <button type="button" className="link-btn" onClick={onReview} aria-label="Tekrar listesi">
          <BookIcon width={18} height={18} />
          Tekrar
          {profile.review.length > 0 && <span className="count">{profile.review.length}</span>}
        </button>
        <button type="button" className="link-btn" onClick={onStore}>
          <BagIcon width={18} height={18} />
          Paketler
        </button>
      </nav>
    </div>
  );
}
