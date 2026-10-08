import type { ReactNode } from 'react';

/**
 * Konu kartlarının arka planındaki soluk çizimler. Hepsi bu oyun için çizildi
 * (özgün); ortak dil: 48×48 ızgara, 2 birim çizgi, yuvarlak uç, dolgu yok, tek
 * renk. Renkler koyu temanın mevcut renklerinden; opaklık CSS'te (%22): çizgi
 * yazının altına denk gelse bile kontrast en kötü 8,7:1 (ölçüldü).
 *
 * Sağlıkta kırmızı haç bilerek yok: o işaret uluslararası hukukla korunur.
 */
const ART: Record<string, { color: string; paths: ReactNode }> = {
  seyahat: {
    // Kâğıt uçak ve arkasında kesikli rota
    color: '#6fd3c9',
    paths: (
      <>
        <path d="M10 30 L42 12 L32 38 L26 29 Z" />
        <path d="M26 29 L42 12" />
        <path d="M6 44 C10 40 14 41 18 36" strokeDasharray="2 4" />
        <circle cx="6" cy="44" r="1.5" />
      </>
    ),
  },
  yemek: {
    // İnce belli çay bardağı, tabak ve buhar
    color: '#ff9a52',
    paths: (
      <>
        <path d="M18 16 C15 24 20 27 18 34 H30 C28 27 33 24 30 16 Z" />
        <path d="M11 39 H37" />
        <path d="M21 11 c-2 -2 2 -4 0 -6 M27 11 c-2 -2 2 -4 0 -6" />
      </>
    ),
  },
  alisveris: {
    // Alışveriş çantası ve jeton
    color: '#f5c451',
    paths: (
      <>
        <path d="M9 18 H35 L32 42 H12 Z" />
        <path d="M16 18 V14 a6 6 0 0 1 12 0 V18" />
        <circle cx="37" cy="36" r="6" />
        <path d="M37 33 V39" />
      </>
    ),
  },
  ev: {
    // Ev silueti, içinde kalp
    color: '#ff8fa6',
    paths: (
      <>
        <path d="M8 24 L24 10 L40 24 V42 H8 Z" />
        <path d="M24 37 L18 31 a3.6 3.6 0 0 1 6 -4 a3.6 3.6 0 0 1 6 4 Z" />
      </>
    ),
  },
  is: {
    // Evrak çantası
    color: '#93c5fd',
    paths: (
      <>
        <rect x="7" y="16" width="34" height="24" rx="3" />
        <path d="M18 16 V12 H30 V16 M7 26 H41 M22 26 V30 H26 V26" />
      </>
    ),
  },
  saglik: {
    // Kalp ve nabız çizgisi
    color: '#7ee29d',
    paths: (
      <>
        <path d="M24 41 L10 27 a8 8 0 0 1 14 -11 a8 8 0 0 1 14 11 Z" />
        <path d="M5 29 H15 L18 23 L22 33 L25 27 H43" />
      </>
    ),
  },
  teknoloji: {
    // Deney şişesi ve kabarcıklar
    color: '#c4a7ff',
    paths: (
      <>
        <path d="M19 7 H29 M21 7 V20 L11 38 a3 3 0 0 0 3 4 H34 a3 3 0 0 0 3 -4 L27 20 V7" />
        <path d="M15 32 H33" />
        <circle cx="22" cy="37" r="1.5" />
        <circle cx="28" cy="35" r="1" />
      </>
    ),
  },
  hukuk: {
    // Adalet terazisi
    color: '#f6d4a2',
    paths: (
      <>
        <path d="M24 8 V40 M15 41 H33 M9 14 H39" />
        <path d="M9 14 L4 26 M9 14 L14 26 M4 26 a5 3 0 0 0 10 0" />
        <path d="M39 14 L34 26 M39 14 L44 26 M34 26 a5 3 0 0 0 10 0" />
      </>
    ),
  },
  gecmis: {
    // Saat ve geriye dönen ok
    color: '#ffb07a',
    paths: (
      <>
        <circle cx="26" cy="26" r="14" />
        <path d="M26 18 V26 L31 30" />
        <path d="M8 20 A19 19 0 0 1 15 10" />
        <path d="M8 13 V20 H15" />
      </>
    ),
  },
  okul: {
    // Açık kitap ve kalem
    color: '#93c5fd',
    paths: (
      <>
        <path d="M24 16 C19 12 12 12 6 14 V38 C12 36 19 36 24 40 C29 36 36 36 42 38 V14 C36 12 29 12 24 16 Z" />
        <path d="M24 16 V40" />
        <path d="M34 4 L40 10 L30 20 L25 21 L26 16 Z" />
      </>
    ),
  },
  duygular: {
    // Biri gülen, biri düşünceli iki konuşma balonu
    color: '#ff8fa6',
    paths: (
      <>
        <path d="M6 10 H28 V26 H14 L8 31 V26 H6 Z" />
        <path d="M12 19 c2 3 8 3 10 0" />
        <path d="M22 30 H42 V44 H40 V48 L35 44 H22 Z" />
        <path d="M28 38 H36" />
      </>
    ),
  },
  doga: {
    // Yaprak, bulut ve yağmur damlası
    color: '#7ee29d',
    paths: (
      <>
        <path d="M8 40 C8 24 18 16 32 16 C32 30 24 40 8 40 Z" />
        <path d="M8 40 L24 24" />
        <path d="M30 12 a5 5 0 0 1 9 -2 a4 4 0 0 1 4 7 H30 a3 3 0 0 1 0 -5" />
        <path d="M38 24 v4 M42 26 v4" />
      </>
    ),
  },
};

/** Konu kartının köşesindeki soluk çizim; çizimi olmayan konu için hiçbir şey çizmez. */
export function CategoryArt({ id }: { id: string }) {
  const art = ART[id];
  if (!art) return null;
  return (
    <svg className="topic-art" viewBox="0 0 48 48" aria-hidden="true" focusable={false} style={{ color: art.color }}>
      {art.paths}
    </svg>
  );
}

/** Test için: çizimi olan konu kimlikleri. */
export const CATEGORY_ART_IDS = Object.keys(ART);
