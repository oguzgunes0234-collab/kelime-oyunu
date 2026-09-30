import type { Difficulty } from './types';

/**
 * Kampanya (bölümler): oyuncunun ana oyundaki ilerlemesi. Uyarlamalı zorluktan
 * bilerek ayrıdır:
 *
 * - Bölüm, tamamlanan bulmaca sayısından hesaplanır. Bulmacanın BOYUNU
 *   (chapterGrid) ve zorluğun çıkabileceği TAVANI (chapterMaxDifficulty)
 *   belirler.
 * - Kelimelerin SEVİYESİNİ (Kolay/Orta/Zor/Uzman) tavanın altında uyarlamalı
 *   zorluk belirler (core/adaptive.ts): iyi oynayan yükselir, zorlanan bir
 *   basamak düşer. Seviye düşmek bölümü geri almaz.
 *
 * Kampanya bir sonla tasarlanmadı; bölüm numarası artmaya devam eder.
 */

export const CHAPTER_SIZE = 5;

export interface CampaignState {
  /** Ana oyunda tamamlanan (tüm kelimeleri çözülmüş) bulmaca sayısı. */
  puzzlesDone: number;
}

export function initialCampaign(): CampaignState {
  return { puzzlesDone: 0 };
}

export interface ChapterInfo {
  /** 1'den başlar. */
  chapter: number;
  /** Bu bölümde tamamlanan bulmaca sayısı (0 … CHAPTER_SIZE-1). */
  done: number;
  size: number;
}

export function chapterInfo(c: CampaignState): ChapterInfo {
  const n = Math.max(0, Math.floor(c.puzzlesDone ?? 0));
  return { chapter: Math.floor(n / CHAPTER_SIZE) + 1, done: n % CHAPTER_SIZE, size: CHAPTER_SIZE };
}

export type PathNodeState = 'done' | 'current' | 'locked';

/**
 * Bölüm yolundaki düğümler (1 … CHAPTER_SIZE): biten bulmacalar "done",
 * sıradaki "current", sonrakiler "locked". Bölüm bitince (done = size) hepsi "done".
 */
export function pathNodes(info: Pick<ChapterInfo, 'done' | 'size'>): PathNodeState[] {
  return Array.from({ length: info.size }, (_, i) => (i < info.done ? 'done' : i === info.done ? 'current' : 'locked'));
}

/**
 * Bölümün ızgara boyu: Bölüm 1 eğitimden sonra yumuşak geçiş (7×7), sonrası 9×8.
 * İleri bölümlerde daha çok kelime denendi (en çok 14): 9×8 ızgara zaten
 * 11–12 kelimede doluyor, kelime ve kesişim sayısı değişmedi (ölçüldü).
 * Izgarayı büyütmek telefonda kareleri okunamayacak kadar küçültüyor; ileri
 * bölümlerde zorlaşma kelime seviyesinden gelir (chapterMaxDifficulty).
 */
export function chapterGrid(chapter: number): { rows: number; cols: number } {
  return chapter <= 1 ? { rows: 7, cols: 7 } : { rows: 9, cols: 8 };
}

/**
 * Bölümün zorluk tavanı: uyarlamalı zorluk bu basamağın üstüne çıkmaz.
 * Bölüm 1–2 en çok Orta, 3–5 en çok Zor, 6+ Uzman (B2–C1). Tavan yalnızca
 * yükselmeyi sınırlar; oyuncu zorlanınca yine bir basamak düşer.
 */
export function chapterMaxDifficulty(chapter: number): Difficulty {
  if (chapter <= 2) return 'medium';
  if (chapter <= 5) return 'hard';
  return 'expert';
}

/** Tamamlanan bir ana oyun bulmacasını sayar; bölüm biterse biten bölümün numarasını döner. */
export function recordCampaignPuzzle(c: CampaignState): { state: CampaignState; chapterCompleted: number | null } {
  const before = chapterInfo(c);
  const state = { puzzlesDone: (c.puzzlesDone ?? 0) + 1 };
  const after = chapterInfo(state);
  return { state, chapterCompleted: after.chapter > before.chapter ? before.chapter : null };
}
