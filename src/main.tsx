import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './ui/App';
import { PERSISTED_KEYS, STORAGE_KEY } from './core/storage';
import { ADS_KEY, ENTITLEMENT_KEY } from './monetization/state';
import { isNativeApp, restoreNativeBackup } from './platform/persist';
import { restoreCloudIfEmpty } from './platform/cloud';
import './styles.css';
import './puzzle.css';

// iPhone uygulamasında: iOS web deposunu sildiyse kaydı yerel yedekten geri al;
// telefonda hiç profil yoksa (yeni kurulum / yeni telefon) iCloud yedeğini yükle;
// sonra oyunu çiz. Web'de hemen çizer (yedek yok).
restoreNativeBackup([...PERSISTED_KEYS, ENTITLEMENT_KEY, ADS_KEY])
  .then(() => restoreCloudIfEmpty(STORAGE_KEY))
  .catch(() => false)
  .finally(() => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  });

// Açılış ekranı (index.html): oyun hazır olunca kısa bir süre sonra kaybolur.
// Yükleme çubuğu yok; beklenecek bir şey yokken sahte bekleme yapılmaz. En az
// ~0,7 sn görünür ki göz kırpar gibi yanıp sönmesin.
const splash = document.getElementById('splash');
if (splash) {
  const wait = Math.max(0, 700 - performance.now());
  window.setTimeout(() => {
    splash.classList.add('hide');
    window.setTimeout(() => splash.remove(), 350);
  }, wait);
}

// Çevrimdışı açılış için service worker (yalnızca derlenmiş web sürümünde).
// iPhone uygulamasında dosyalar zaten uygulamanın içinde: service worker gerekmez.
if (import.meta.env.PROD && 'serviceWorker' in navigator && !isNativeApp()) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* SW olmadan da oyun çalışır; yalnızca çevrimdışı açılış olmaz. */
    });
  });
}
