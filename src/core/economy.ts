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

/** Günlük hedef tamamlanınca verilen hediye (günde bir kez). */
export const DAILY_GOAL_REWARD: { coins: number; tools: Inventory } = {
  coins: 10,
  tools: { shuffle: 1, magnet: 1, hint: 1, undo: 2 },
};

export const TOOL_ORDER: ToolId[] = ['shuffle', 'magnet', 'hint', 'undo'];

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
