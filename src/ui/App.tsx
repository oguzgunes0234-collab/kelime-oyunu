import { useEffect, useState } from 'react';
import type { SessionConfig } from '../core/session';
import { PACK } from '../data/packs';
import { Game } from './screens/Game';
import { Home } from './screens/Home';
import { Review } from './screens/Review';
import { Settings } from './screens/Settings';
import { Store } from './screens/Store';
import { useProfile } from './useProfile';

type Screen =
  | { name: 'home' }
  | { name: 'game'; config: SessionConfig; key: number }
  | { name: 'review' }
  | { name: 'settings' };

export function App() {
  const { profile, setProfile, reset } = useProfile();
  const [screen, setScreen] = useState<Screen>(() =>
    profile.tutorialDone
      ? { name: 'home' }
      : { name: 'game', key: Date.now(), config: { mode: 'tutorial', direction: profile.settings.direction, difficultyMode: 'easy' } },
  );
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

  const play = (config: SessionConfig) => setScreen({ name: 'game', config, key: Date.now() });
  const playNormal = () =>
    play({ mode: 'normal', direction: profile.settings.direction, difficultyMode: profile.settings.difficultyMode });
  const home = () => setScreen({ name: 'home' });
  const tutorial = () => play({ mode: 'tutorial', direction: profile.settings.direction, difficultyMode: 'easy' });

  return (
    <div className="app">
      {/* Mağaza açıkken alttaki ekran erişilebilirlik ağacından ve odaktan çıkar. */}
      <div className="app-inner" aria-hidden={storeOpen || undefined} {...(storeOpen ? { inert: '' } : {})}>
        {screen.name === 'home' && (
          <Home
            pack={PACK}
            profile={profile}
            setProfile={setProfile}
            onPlay={playNormal}
            onReview={() => setScreen({ name: 'review' })}
            onSettings={() => setScreen({ name: 'settings' })}
            onStore={() => setStoreOpen(true)}
            onHowTo={tutorial}
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
