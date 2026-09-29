/// <reference types="vitest/config" />
import { readdirSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Derleme sonunda `sw.js` üretir. Vite dosya adlarına hash eklediği için
 * önbelleğe alınacak dosya listesi ancak paketleme bittikten sonra bilinir;
 * elle yazılmış bir liste ilk derlemede eskirdi. Ek bağımlılık (workbox vb.)
 * gerekmesin diye bu küçük eklenti yeterli.
 */
function serviceWorker(): Plugin {
  return {
    name: 'kelime-oyunu-sw',
    apply: 'build',
    generateBundle(_options, bundle) {
      const files = Object.keys(bundle).filter((f) => !f.endsWith('.map'));
      // public/ klasörü pakete girmez, doğrudan kopyalanır — ayrıca ekle.
      const publicFiles = readdirSync('public').filter((f) => !f.startsWith('.'));
      files.push(...publicFiles);
      const assets = ['./', ...files.map((f) => `./${f}`)];
      const version = Date.now().toString(36);
      const source = `// Otomatik üretildi — elle düzenleme.
const CACHE = 'kelime-oyunu-${version}';
const ASSETS = ${JSON.stringify(assets)};

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('kelime-oyunu-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    // Sayfa: önce ağ (güncel sürüm), ağ yoksa önbellekteki kabuk.
    event.respondWith(fetch(req).catch(() => caches.match('./')));
    return;
  }
  event.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
});
`;
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}

export default defineConfig({
  // Göreli taban: uygulama bir alt klasörden de sunulabilsin.
  base: './',
  plugins: [react(), serviceWorker()],
  server: { port: 5174 },
  preview: { port: 4174 },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
});
