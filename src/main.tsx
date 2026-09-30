import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './ui/App';
import './styles.css';
import './puzzle.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

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

// Çevrimdışı açılış için service worker (yalnızca derlenmiş sürümde üretilir).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* SW olmadan da oyun çalışır; yalnızca çevrimdışı açılış olmaz. */
    });
  });
}
