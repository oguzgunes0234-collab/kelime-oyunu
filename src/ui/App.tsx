import { useEffect, useState } from 'react';
import type { SessionConfig } from '../core/session';
import { PACK } from '../data/packs';
import { Game } from './screens/Game';
import { Home } from './screens/Home';
import { chapterGrid, chapterInfo } from '../core/campaign';
import { TUTORIAL_LENGTH } from '../core/tutorial';
import { hasSavedPuzzle, Puzzle } from './screens/Puzzle';
import { TopicModes } from './screens/TopicModes';
import { Review } from './screens/Review';
import { Settings } from './screens/Settings';
import { Store } from './screens/Store';
import { useProfile } from './useProfile';
import { configureSound, installSoundUnlock } from './sound';

type Screen =
  | { name: 'home' }
  | { name: 'game'; config: SessionConfig; key: number }
  /**
   * tutorialStep: bulmaca eğitiminin adımı (0 = T1) ya da null.
   * topic: konu modu kimliği ya da null (ana kampanya).
   */
  | { name: 'puzzle'; key: number; tutorialStep: number | null; topic: string | null }
  | { name: 'topics' }
  | { name: 'review' }
  | { name: 'settings' };

export function App() {
  const { profile, setProfile, reset } = useProfile();
  // Ana oyun bulmaca; ilk açılışta ana sayfa gelir, bulmacanın kendi kısa tanıtımı var.
  const [screen, setScreen] = useState<Screen>({ name: 'home' });
  // Mağaza bir katman olarak açılır: altındaki oyun turu kaybolmaz.
  const [storeOpen, setStoreOpen] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    if (profile.settings.theme === 'auto') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', profile.settings.theme);
  }, [profile.settings.theme]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [screen]);

  // Ses: ilk dokunuşta açılır (tarayıcı kuralı); ayarlar değişince uygulanır.
  useEffect(() => {
    installSoundUnlock();
  }, []);
  useEffect(() => {
    configureSound({ effects: profile.settings.sound !== false, music: profile.settings.music === true });
  }, [profile.settings.sound, profile.settings.music]);

  const play = (config: SessionConfig) => setScreen({ name: 'game', config, key: Date.now() });
  // Zorluk oyuncuya seçtirilmez: kelime seviyesini hep uyarlamalı zorluk belirler.
  const playNormal = () => play({ mode: 'normal', direction: profile.settings.direction, difficultyMode: 'adaptive' });
  const home = () => setScreen({ name: 'home' });
  const tutorial = () => play({ mode: 'tutorial', direction: profile.settings.direction, difficultyMode: 'easy' });
  // Harf taşı turunu ilk kez açan oyuncu önce örnek turu görür.
  const playQuick = () => (profile.tutorialDone ? playNormal() : tutorial());
  const { direction } = profile.settings;
  const puzzleSaved = hasSavedPuzzle(direction);
  // Eğitim bitmediyse ana düğme eğitimi açar. Yarım kalmış bir bulmaca varsa
  // önce o sürer (eğitim "?" → "Eğitimi baştan oynat" ile her zaman açılabilir).
  const tutorialPending = profile.puzzleTutorialStep < TUTORIAL_LENGTH && !puzzleSaved;
  const openPuzzle = (tutorialStep: number | null, topic: string | null = null) =>
    setScreen({ name: 'puzzle', key: Date.now(), tutorialStep, topic });
  const playPuzzle = () => openPuzzle(tutorialPending ? profile.puzzleTutorialStep : null);
  const setTutorialStep = (step: number) => setProfile({ ...profile, puzzleTutorialStep: step });

  return (
    <div className="app">
      {/* Mağaza açıkken alttaki ekran erişilebilirlik ağacından ve odaktan çıkar. */}
      <div className="app-inner" aria-hidden={storeOpen || undefined} {...(storeOpen ? { inert: '' } : {})}>
        {screen.name === 'home' && (
          <Home
            pack={PACK}
            profile={profile}
            setProfile={setProfile}
            onPuzzle={playPuzzle}
            puzzleSaved={puzzleSaved}
            tutorialPending={tutorialPending}
            onPlay={playQuick}
            onPlayTopic={(id) => openPuzzle(null, id)}
            onReview={() => setScreen({ name: 'review' })}
            onSettings={() => setScreen({ name: 'settings' })}
            onStore={() => setStoreOpen(true)}
          />
        )}
        {screen.name === 'topics' && <TopicModes pack={PACK} onBack={home} onPlay={(id) => openPuzzle(null, id)} />}
        {screen.name === 'puzzle' && (
          <Puzzle
            key={screen.key}
            pack={PACK}
            profile={profile}
            setProfile={setProfile}
            direction={profile.settings.direction}
            difficulty={profile.adaptive.difficulty}
            adaptive
            gridSize={chapterGrid(chapterInfo(profile.campaign).chapter)}
            topic={screen.topic}
            paused={storeOpen}
            onExit={home}
            onNewPuzzle={() => openPuzzle(null, screen.topic)}
            onOpenStore={() => setStoreOpen(true)}
            onOpenReview={() => setScreen({ name: 'review' })}
            tutorialStep={screen.tutorialStep}
            onTutorialAdvance={(next) => {
              setTutorialStep(Math.max(profile.puzzleTutorialStep, next));
              openPuzzle(next < TUTORIAL_LENGTH ? next : null);
            }}
            onTutorialSkip={() => {
              setTutorialStep(TUTORIAL_LENGTH);
              openPuzzle(null);
            }}
            onReplayTutorial={() => openPuzzle(0)}
          />
        )}
        {screen.name === 'game' && (
          <Game
            key={screen.key}
            pack={PACK}
            profile={profile}
            setProfile={setProfile}
            config={screen.config}
            onExit={home}
            paused={storeOpen}
            onRestart={(config) => {
              if (config.mode === 'review' && profile.review.length === 0) return playNormal();
              if (config.direction !== screen.config.direction) {
                setProfile({ ...profile, settings: { ...profile.settings, direction: config.direction } });
              }
              play(config);
            }}
            onOpenStore={() => setStoreOpen(true)}
            onOpenReview={() => setScreen({ name: 'review' })}
            onTutorialDone={() => {
              setProfile({ ...profile, tutorialDone: true });
              home();
            }}
          />
        )}
        {screen.name === 'review' && (
          <Review
            pack={PACK}
            profile={profile}
            setProfile={setProfile}
            onBack={home}
            onStudy={() => play({ mode: 'review', direction: profile.settings.direction, difficultyMode: 'easy' })}
          />
        )}
        {screen.name === 'settings' && (
          <Settings
            pack={PACK}
            profile={profile}
            setProfile={setProfile}
            onBack={home}
            onReplayTutorial={tutorial}
            onReplayPuzzleTutorial={() => openPuzzle(0)}
            onReset={() => {
              reset();
              home();
            }}
          />
        )}
      </div>
      {storeOpen && <Store profile={profile} setProfile={setProfile} onClose={() => setStoreOpen(false)} />}
    </div>
  );
}
