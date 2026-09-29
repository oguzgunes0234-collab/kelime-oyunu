/**
 * Kampanya (bölümler): oyuncunun ana oyundaki ilerlemesi. Uyarlamalı zorluktan
 * bilerek ayrıdır:
 *
 * - Bölüm, tamamlanan bulmaca sayısından hesaplanır ve yalnızca bulmacanın
 *   BOYUNU belirler (Bölüm 1 küçük ızgara, sonrası normal ızgara).
 * - Kelimelerin SEVİYESİNİ (Kolay/Orta/Zor) uyarlamalı zorluk belirler
 *   (core/adaptive.ts). Bölüm atlamak seviyeyi değiştirmez; seviye düşmek
 *   bölümü geri almaz. İkisi farklı şeyi yönettiği için çelişmez.
 *
 * Bölüm boyu (5 bulmaca) mevcut içeriğe göre seçildi: kolay havuz (91 kelime)
 * 9×8 bulmacalarda ~15 bulmacada yeni kelime bitiriyor (ölçüldü), yani ~3 bölüm.
 * Kampanya bir sonla tasarlanmadı; bölüm numarası artmaya devam eder, ama
 * kelime paketi büyümeden ileri bölümler çoğunlukla bilinen kelimeleri tekrar eder.
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

/** Bölümün ızgara boyu: Bölüm 1 eğitimden sonra yumuşak geçiş (7×7), sonrası 9×8. */
export function chapterGrid(chapter: number): { rows: number; cols: number } {
  return chapter <= 1 ? { rows: 7, cols: 7 } : { rows: 9, cols: 8 };
}

/** Tamamlanan bir ana oyun bulmacasını sayar; bölüm biterse biten bölümün numarasını döner. */
export function recordCampaignPuzzle(c: CampaignState): { state: CampaignState; chapterCompleted: number | null } {
  const before = chapterInfo(c);
  const state = { puzzlesDone: (c.puzzlesDone ?? 0) + 1 };
  const after = chapterInfo(state);
  return { state, chapterCompleted: after.chapter > before.chapter ? before.chapter : null };
}
