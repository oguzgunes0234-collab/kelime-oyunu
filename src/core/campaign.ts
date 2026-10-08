import type { Difficulty } from './types';

/**
 * Kampanya (bölümler): oyuncunun ana oyundaki ilerlemesi. Uyarlamalı zorluktan
 * bilerek ayrıdır:
 *
 * - Her tamamen çözülen bulmaca bir bölümdür: Bölüm 3 bitince Bölüm 4 gelir.
 *   Bölümler kendi içinde bulmacalara bölünmez.
 * - Bölüm, bulmacanın BOYUNU (chapterGrid) ve zorluğun çıkabileceği TAVANI
 *   (chapterMaxDifficulty) belirler.
 * - Kelimelerin SEVİYESİNİ (Kolay/Orta/Zor/Uzman) tavanın altında uyarlamalı
 *   zorluk belirler (core/adaptive.ts): iyi oynayan yükselir, zorlanan bir
 *   basamak düşer. Seviye düşmek bölümü geri almaz.
 *
 * Kampanya bir sonla tasarlanmadı; bölüm numarası artmaya devam eder.
 */

export interface CampaignState {
  /** Ana oyunda tamamlanan (tüm kelimeleri çözülmüş) bulmaca sayısı = biten bölüm sayısı. */
  puzzlesDone: number;
}

export function initialCampaign(): CampaignState {
  return { puzzlesDone: 0 };
}

export interface ChapterInfo {
  /** Oynanacak bölüm, 1'den başlar. */
  chapter: number;
}

export function chapterInfo(c: CampaignState): ChapterInfo {
  return { chapter: Math.max(0, Math.floor(c.puzzlesDone ?? 0)) + 1 };
}

export type PathNodeState = 'done' | 'current' | 'locked';

/**
 * Bölüm yolu: oynanan bölümün çevresindeki bölüm numaraları (önce en çok iki
 * biten bölüm, sonra oynanacak ve kilitliler).
 */
export function chapterWindow(chapter: number, count = 5): { n: number; state: PathNodeState }[] {
  const start = Math.max(1, chapter - 2);
  return Array.from({ length: count }, (_, i) => {
    const n = start + i;
    const state: PathNodeState = n < chapter ? 'done' : n === chapter ? 'current' : 'locked';
    return { n, state };
  });
}

/** Eğitimden sonra yumuşak geçiş: ilk bölümler küçük ızgarada. */
export const WARMUP_CHAPTERS = 5;

/**
 * Bölümün ızgara boyu: ilk 5 bölüm 7×7, sonrası 9×8. İleri bölümlerde daha
 * çok kelime denendi (en çok 14): 9×8 ızgara zaten 11–12 kelimede doluyor
 * (ölçüldü). Izgarayı büyütmek telefonda kareleri okunamayacak kadar
 * küçültüyor; ileri bölümlerde zorlaşma kelime seviyesinden gelir.
 */
export function chapterGrid(chapter: number): { rows: number; cols: number } {
  return chapter <= WARMUP_CHAPTERS ? { rows: 7, cols: 7 } : { rows: 9, cols: 8 };
}

/**
 * Bölümün zorluk tavanı: uyarlamalı zorluk bu basamağın üstüne çıkmaz.
 * Bölüm 1–10 en çok Orta, 11–25 en çok Zor, 26+ Uzman (B2–C1). Bölümler
 * eskiden 5 bulmacaydı; tempo değişmesin diye eşikler aynı sayıda bulmacaya
 * denk gelir. Tavan yalnızca yükselmeyi sınırlar; zorlanan yine bir basamak düşer.
 */
export function chapterMaxDifficulty(chapter: number): Difficulty {
  if (chapter <= 10) return 'medium';
  if (chapter <= 25) return 'hard';
  return 'expert';
}

/** Tamamlanan bir ana oyun bulmacasını sayar: oynanan bölüm biter, numarası döner. */
export function recordCampaignPuzzle(c: CampaignState): { state: CampaignState; chapterCompleted: number } {
  const done = chapterInfo(c).chapter;
  return { state: { puzzlesDone: (c.puzzlesDone ?? 0) + 1 }, chapterCompleted: done };
}

/** Sayıya gelen yönelme eki: 2'ye, 3'e, 6'ya, 10'a, 20'ye … (sayının okunuşuna göre). */
export function toCase(n: number): string {
  const ones = ['', "'e", "'ye", "'e", "'e", "'e", "'ya", "'ye", "'e", "'a"];
  const tens = ['', "'a", "'ye", "'a", "'a", "'ye", "'a", "'e", "'e", "'a"];
  if (n % 10 !== 0) return `${n}${ones[n % 10]}`;
  if (n % 100 !== 0) return `${n}${tens[(n / 10) % 10]}`;
  return `${n}'e`; // yüz, bin
}
