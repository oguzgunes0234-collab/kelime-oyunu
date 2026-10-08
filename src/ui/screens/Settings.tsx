import { useEffect, useState } from 'react';
import { DIFFICULTY_LABEL } from '../../core/pack';
import type { Profile } from '../../core/profile';
import type { WordPack } from '../../core/types';
import { BackIcon } from '../components/Icons';
import { Sheet } from '../components/Sheet';
import { useMonetization } from '../monetization';
import { LEGAL_LINKS } from '../../monetization/legal';
import { applyCloudBackup, bestBackup, cloudAvailable, deviceId, readCloudBackups, type CloudBackup } from '../../platform/cloud';
import { STORAGE_KEY } from '../../core/storage';
import { chapterInfo } from '../../core/campaign';

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
  const [restoreNote, setRestoreNote] = useState<string | null>(null);
  // Yasal metin uygulamanın içinde açılır (iPhone uygulamasında yeni sekme yok).
  const [legal, setLegal] = useState<{ label: string; href: string } | null>(null);
  const m = useMonetization();
  const s = profile.settings;
  // iCloud yedeği (yalnızca iPhone uygulamasında, iCloud açıkken).
  const icloud = cloudAvailable();
  const [backup, setBackup] = useState<CloudBackup | null>(null);
  const [restoreAsk, setRestoreAsk] = useState(false);
  useEffect(() => {
    // Geri yükleme için en ileri yedek (bu cihazınki dahil; bilgi için en son kendi yedeği de görünür).
    if (icloud) readCloudBackups().then((list) => setBackup(bestBackup(list)));
  }, [icloud]);
  const backupSummary = (() => {
    if (!backup) return null;
    try {
      const p = JSON.parse(backup.profile) as Profile;
      return { chapter: chapterInfo(p.campaign ?? { puzzlesDone: 0 }).chapter, coins: p.coins ?? 0, when: new Date(backup.savedAt) };
    } catch {
      return null;
    }
  })();

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
        <h2>Satın alımlar</h2>
        <p className="small">Reklamsız sürüm: {m.entitlements.noAds ? <strong>etkin</strong> : 'yok'}</p>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={!m.purchasesAvailable}
          onClick={async () => {
            setRestoreNote('Geri yükleniyor…');
            const found = await m.restore();
            setRestoreNote(found ? 'Reklamsız sürüm geri yüklendi.' : 'Geri yüklenecek kalıcı satın alma bulunamadı.');
          }}
        >
          Satın alımları geri yükle
        </button>
        <p className="muted small" role="status" aria-live="polite">
          {restoreNote ?? (m.purchasesAvailable ? 'Reklamsız sürüm geri yüklenir. Jetonlar tüketilir; geri yüklenmez.' : 'Satın almalar App Store sürümünde.')}
        </p>
      </section>

      {icloud && (
        <section className="setting">
          <h2>iCloud yedeği</h2>
          <p className="small">
            İlerlemen ve jetonların (satın aldıkların dahil) kendi iCloud hesabına yedeklenir; aynı Apple Kimliğiyle yeni telefonda geri
            gelir. Bizim sunucumuza gitmez.
          </p>
          <p className="muted small">
            {backupSummary
              ? `En ileri yedek: ${backupSummary.when.toLocaleString('tr-TR')} · Bölüm ${backupSummary.chapter} · ${backupSummary.coins} jeton${backup?.device === deviceId() ? ' (bu telefon)' : ''}`
              : 'Henüz yedek yok ya da iCloud kapalı (Ayarlar → Apple Kimliği → iCloud).'}
          </p>
          {backupSummary && backup?.device !== deviceId() && (
            <button type="button" className="btn btn-ghost" onClick={() => setRestoreAsk(true)}>
              Yedekten geri yükle
            </button>
          )}
        </section>
      )}

      <section className="setting">
        <h2>Yasal</h2>
        <ul className="legal-links">
          {LEGAL_LINKS.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                onClick={(e) => {
                  e.preventDefault();
                  setLegal(l);
                }}
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="setting">
        <h2>Verilerin</h2>
        <p className="muted small">
          İlerlemen yalnızca bu cihazda saklanır; hiçbir sunucuya gönderilmez. Uygulamayı ya da tarayıcı verilerini silersen o da silinir.
        </p>
        <button type="button" className="btn btn-danger" onClick={() => setConfirm(true)}>
          İlerlemeyi sıfırla
        </button>
      </section>

      {legal && (
        <Sheet title={legal.label} onClose={() => setLegal(null)} variant="page" className="legal-sheet">
          <iframe className="legal-frame" src={legal.href} title={legal.label} />
          <button type="button" className="btn btn-secondary btn-block" onClick={() => setLegal(null)}>
            Kapat
          </button>
        </Sheet>
      )}

      {restoreAsk && backup && backupSummary && (
        <Sheet title="iCloud yedeği yüklensin mi?" onClose={() => setRestoreAsk(false)}>
          <p>
            Bu telefondaki ilerleme (Bölüm {chapterInfo(profile.campaign).chapter} · {profile.coins} jeton) yedektekiyle değiştirilir: Bölüm{' '}
            {backupSummary.chapter} · {backupSummary.coins} jeton ({backupSummary.when.toLocaleString('tr-TR')}). Bu işlem geri alınamaz.
          </p>
          <div className="btn-row">
            <button type="button" className="btn btn-secondary" onClick={() => setRestoreAsk(false)}>
              Vazgeç
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                if (applyCloudBackup(STORAGE_KEY, backup)) window.location.reload();
              }}
            >
              Yedeği yükle
            </button>
          </div>
        </Sheet>
      )}

      {confirm && (
        <Sheet title="İlerleme sıfırlansın mı?" onClose={() => setConfirm(false)}>
          <p>Puanlar, jetonlar (satın aldıkların dahil), haklar, seri ve tekrar listesi silinir. Bu işlem geri alınamaz. Reklamsız sürüm silinmez.</p>
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
