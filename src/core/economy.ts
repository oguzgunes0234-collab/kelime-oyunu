import type { Inventory, ToolId } from './types';

/**
 * Oyun içi ekonomi. Gerçek para yoktur; jetonlar yalnızca oynayarak kazanılır.
 * Tüm sayılar tek yerde: dengeyi değiştirmek için yalnızca bu dosyayı düzenle.
 */

export const INITIAL_INVENTORY: Inventory = { shuffle: 5, magnet: 3, hint: 3, undo: 8 };

/** Bir aracın turdaki puan bedeli (hak harcamanın yanında). */
export const TOOL_POINT_COST: Record<ToolId, number> = { shuffle: 0, magnet: 4, hint: 3, undo: 0 };
/** İpucu aracının ilk kullanımı anlam ipucudur ve daha ucuzdur. */
export const MEANING_HINT_COST = 2;
export const WRONG_ATTEMPT_COST = 2;

export const COINS_PER_CORRECT = 2;
/** Yardımsız ve ilk denemede doğru cevaba ek jeton. */
export const COINS_CLEAN_BONUS = 1;
/** Jetonla bir araç hakkı almanın bedeli. */
export const COINS_PER_CHARGE = 5;
/** Pekiştirmede cevabı göstermeden anlamı ve cümleyi doğru yapılan kelime başına. */
export const PRACTICE_COINS_PER_WORD = 2;

/** Günlük hedef tamamlanınca verilen hediye (günde bir kez). */
export const DAILY_GOAL_REWARD: { coins: number; tools: Inventory } = {
  coins: 10,
  tools: { shuffle: 1, magnet: 1, hint: 1, undo: 2 },
};

export const TOOL_ORDER: ToolId[] = ['shuffle', 'magnet', 'hint', 'undo'];

/**
 * Jetonla alınan araç paketleri. Gerçek para yok. İçerik önceden görünür,
 * rastgele ödül yok; tek tek almaktan biraz ucuzdur (tek hak COINS_PER_CHARGE).
 */
export interface ToolPack {
  id: string;
  name: string;
  tools: Partial<Inventory>;
  coins: number;
}
export const TOOL_PACKS: ToolPack[] = [
  { id: 'small', name: 'Küçük yardım paketi', tools: { magnet: 5, hint: 5 }, coins: 40 },
  { id: 'large', name: 'Büyük yardım paketi', tools: { magnet: 15, hint: 15, shuffle: 10, undo: 10 }, coins: 180 },
];

/**
 * Bulmacadaki iki araç, harf taşı oyunuyla aynı hakları kullanır:
 * Harf aç → Mıknatıs hakkı, Anlam → İpucu hakkı. Ayrı bir ekonomi yok.
 */
export type PuzzleToolId = Extract<ToolId, 'magnet' | 'hint'>;
export const PUZZLE_TOOL_ORDER: PuzzleToolId[] = ['hint', 'magnet'];
export const PUZZLE_TOOL_INFO: Record<PuzzleToolId, { name: string; does: string; cost: string }> = {
  hint: {
    name: 'Anlam',
    does: 'Seçili kelimenin anlam ipucunu gösterir (kelime başına bir kez).',
    cost: `1 İpucu hakkı · −${MEANING_HINT_COST} puan`,
  },
  magnet: {
    name: 'Harf aç',
    does: 'Seçili kareye doğru harfi yazar; kare doğruysa kelimedeki ilk boş ya da yanlış kareyi açar.',
    cost: `1 Mıknatıs hakkı · −${TOOL_POINT_COST.magnet} puan`,
  },
};

export const TOOL_INFO: Record<ToolId, { name: string; does: string; cost: string }> = {
  shuffle: {
    name: 'Karıştır',
    does: 'Henüz kullanılmamış harf taşlarının sırasını değiştirir.',
    cost: '1 hak · puan kesmez',
  },
  magnet: {
    name: 'Mıknatıs',
    does: 'Sıradaki doğru harfi cevap alanına yerleştirir; hatalı harfleri de geri alır.',
    cost: `1 hak · −${TOOL_POINT_COST.magnet} puan`,
  },
  hint: {
    name: 'İpucu',
    does: 'İlk kullanımda anlam ipucu verir, sonra sıradaki harfi gösterir.',
    cost: `1 hak · anlam −${MEANING_HINT_COST}, harf −${TOOL_POINT_COST.hint} puan`,
  },
  undo: {
    name: 'Geri al',
    does: 'Cevap alanındaki son harfi taşlara geri gönderir.',
    cost: '1 hak · puan kesmez',
  },
};
