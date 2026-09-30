import { dayKey } from './daily';

/**
 * Aralıklı tekrar (Leitner kutuları). Her kelime bir kutudadır; kutu ne kadar
 * yüksekse bir sonraki soruluşu o kadar uzaktır:
 *
 *   kutu 1 → 1 gün, 2 → 3 gün, 3 → 7 gün, 4 → 21 gün, 5 → 60 gün sonra
 *
 * - Yardımsız ve hatasız bilinen kelime bir kutu yükselir.
 * - Yardımla ya da yanlış denemeyle bilinen kelime kutusunda kalır, ertesi gün
 *   yeniden gelir.
 * - Bilinemeyen kelime 1. kutuya döner, ertesi gün yeniden gelir.
 *
 * Böylece öğrenilen kelime unutulmadan önce tekrar sorulur; bilinen kelimeler
 * seyrekleşir, yeni kelimelere yer açılır.
 */

export const SRS_INTERVALS = [1, 3, 7, 21, 60];
export const SRS_MAX_BOX = SRS_INTERVALS.length;

export interface SrsItem {
  box: number;
  /** Bir sonraki soruluş günü (YYYY-MM-DD). */
  due: string;
}

/** Yön anahtarı ("tr>en") → kelime kimliği → kutu. */
export type SrsState = Record<string, Record<string, SrsItem>>;

export type SrsResult = 'clean' | 'correct' | 'miss';

function addDays(now: Date, days: number): string {
  const d = new Date(now);
  d.setDate(d.getDate() + days);
  return dayKey(d);
}

export function srsNext(item: SrsItem | undefined, result: SrsResult, now: Date): SrsItem {
  if (result === 'miss') return { box: 1, due: addDays(now, 1) };
  if (result === 'correct') return { box: Math.max(1, item?.box ?? 1), due: addDays(now, 1) };
  const box = Math.min(SRS_MAX_BOX, (item?.box ?? 0) + 1);
  return { box, due: addDays(now, SRS_INTERVALS[box - 1]) };
}

export function recordSrs(state: SrsState, dir: string, entryId: string, result: SrsResult, now: Date): SrsState {
  const forDir = state[dir] ?? {};
  return { ...state, [dir]: { ...forDir, [entryId]: srsNext(forDir[entryId], result, now) } };
}

/**
 * Kelimenin tekrar zamanı geldi mi. Aralıklı tekrardan önce öğrenilmiş (kaydı
 * olmayan) kelime hemen tekrar sayılır: eski oyuncuların bildiği kelimeler de
 * sisteme girer.
 */
export function isDue(state: SrsState | undefined, dir: string, entryId: string, learned: boolean, now: Date): boolean {
  const item = state?.[dir]?.[entryId];
  if (!item) return learned;
  return item.due <= dayKey(now);
}

/** Bugün tekrarı gelen kelime sayısı (ana sayfada göstermek için). */
export function dueCount(state: SrsState | undefined, dir: string, learnedIds: string[], now: Date): number {
  return learnedIds.filter((id) => isDue(state, dir, id, true, now)).length;
}
