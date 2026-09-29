import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './ui/App';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Çevrimdışı açılış için service worker (yalnızca derlenmiş sürümde üretilir).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* SW olmadan da oyun çalışır; yalnızca çevrimdışı açılış olmaz. */
    });
  });
}
