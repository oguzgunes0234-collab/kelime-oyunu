import { useState } from 'react';
import { DIFFICULTY_LABEL } from '../../core/pack';
import type { Profile } from '../../core/profile';
import type { WordPack } from '../../core/types';
import { BackIcon } from '../components/Icons';
import { Sheet } from '../components/Sheet';

interface Props {
  pack: WordPack;
  profile: Profile;
  setProfile: (p: Profile) => void;
  onBack: () => void;
  onReplayTutorial: () => void;
  onReplayPuzzleTutorial: () => void;
  onReset: () => void;
}

export function Settings({ pack, profile, setProfile, onBack, onReplayTutorial, onReplayPuzzleTutorial, onReset }: Props) {
  const [confirm, setConfirm] = useState(false);
  const s = profile.settings;

  return (
    <div className="page settings">
      <header className="page-bar">
        <button type="button" className="icon-btn" onClick={onBack} aria-label="Geri">
          <BackIcon />
        </button>
        <h1>Ayarlar</h1>
      </header>

      <section className="setting">
        <h2>Kelime seviyesi</h2>
        <p className="small">
          Otomatik ayarlanır · şu an <strong>{DIFFICULTY_LABEL[profile.adaptive.difficulty]}</strong>
        </p>
        <p className="muted small">Son bulmacalardaki başarına göre bir kademe yükselir ya da düşer; seçmen gerekmez.</p>
      </section>

      <section className="setting">
        <h2>Günlük hedef</h2>
        <p className="small">Günde bir bulmacayı tamamla: tüm kelimelerini çöz (Anlam ve Harf aç serbest).</p>
        <p className="muted small">Hedefi kaçırmanın cezası yok; haftada bir boş gün seriyi bozmaz.</p>
      </section>

      <section className="setting">
        <h2>Ses</h2>
        <div className="toggle-list">
          <label className="toggle">
            <input
              type="checkbox"
              role="switch"
              checked={s.sound !== false}
              onChange={(e) => setProfile({ ...profile, settings: { ...s, sound: e.target.checked } })}
            />
            <span>Ses efektleri</span>
          </label>
          <label className="toggle">
            <input
              type="checkbox"
              role="switch"
              checked={s.music === true}
              onChange={(e) => setProfile({ ...profile, settings: { ...s, music: e.target.checked } })}
            />
            <span>Arka plan müziği</span>
          </label>
        </div>
        <p className="muted small">Ses, uygulamada ilk dokunuşundan sonra başlar. Telefon sessizdeyse duyulmayabilir.</p>
      </section>

      <section className="setting">
        <h2>Nasıl oynanır</h2>
        <button type="button" className="btn btn-secondary" onClick={onReplayPuzzleTutorial}>
          Bulmaca eğitimini yeniden oyna
        </button>
        <button type="button" className="btn btn-ghost" onClick={onReplayTutorial}>
          Hızlı tur örneğini yeniden oyna
        </button>
      </section>

      <section className="setting">
        <h2>Kelime paketi</h2>
        <p className="small">
          <strong>{pack.name}</strong> · {pack.entries.length} kelime · Türkçe ↔ İngilizce
        </p>
        <p className="muted small">{pack.description}</p>
      </section>

      <section className="setting">
        <h2>Verilerin</h2>
        <p className="muted small">
          İlerlemen yalnızca bu tarayıcıda saklanır. Tarayıcı verilerini silersen o da silinir.
        </p>
        <button type="button" className="btn btn-danger" onClick={() => setConfirm(true)}>
          İlerlemeyi sıfırla
        </button>
      </section>

      {confirm && (
        <Sheet title="İlerleme sıfırlansın mı?" onClose={() => setConfirm(false)}>
          <p>Puanlar, jetonlar, haklar, seri ve tekrar listesi silinir. Bu işlem geri alınamaz.</p>
          <div className="btn-row">
            <button type="button" className="btn btn-secondary" onClick={() => setConfirm(false)}>
              Vazgeç
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => {
                setConfirm(false);
                onReset();
              }}
            >
              Sıfırla
            </button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
