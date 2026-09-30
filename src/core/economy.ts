import type { Inventory, ToolId } from './types';

/**
 * Oyun içi ekonomi. Gerçek para yoktur; jetonlar yalnızca oynayarak kazanılır.
 * Tüm sayılar tek yerde: dengeyi değiştirmek için yalnızca bu dosyayı düzenle.
 */

export const INITIAL_INVENTORY: Inventory = { shuffle: 5, magnet: 3, hint: 3, undo: 8, synonym: 3, sentence: 3 };

/** Bir aracın turdaki puan bedeli (hak harcamanın yanında). */
export const TOOL_POINT_COST: Record<ToolId, number> = { shuffle: 0, magnet: 4, hint: 3, undo: 0, synonym: 2, sentence: 2 };
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
  tools: { shuffle: 1, magnet: 1, hint: 1, undo: 2, synonym: 1, sentence: 1 },
};

/** Hızlı turdaki araçlar (harf taşları). */
export const TOOL_ORDER: ToolId[] = ['shuffle', 'magnet', 'hint', 'undo'];
/** Mağazada tek tek satılan haklar: hızlı tur araçları ve bulmaca jokerleri. */
export const STORE_TOOL_ORDER: ToolId[] = ['hint', 'sentence', 'synonym', 'magnet', 'shuffle', 'undo'];

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
  { id: 'words', name: 'Kelime jokeri paketi', tools: { synonym: 5, sentence: 5 }, coins: 40 },
  { id: 'large', name: 'Büyük yardım paketi', tools: { magnet: 15, hint: 15, synonym: 10, sentence: 10, shuffle: 10, undo: 10 }, coins: 250 },
];

/**
 * Bulmaca jokerleri. Anlam ve Harf aç, harf taşı oyunuyla aynı hakları kullanır
 * (Anlam → İpucu hakkı, Harf aç → Mıknatıs hakkı). Cümle ve Eş anlamlı yalnız
 * bulmacada vardır ve kendi hakları vardır. Hepsi kelime başına bir kez
 * gösterilir; kullanılan kelime "yardımla çözüldü" sayılır.
 */
export type PuzzleToolId = Extract<ToolId, 'magnet' | 'hint' | 'synonym' | 'sentence'>;
export const PUZZLE_TOOL_ORDER: PuzzleToolId[] = ['hint', 'sentence', 'synonym', 'magnet'];
export const PUZZLE_TOOL_INFO: Record<PuzzleToolId, { name: string; does: string; cost: string }> = {
  hint: {
    name: 'Anlam',
    does: 'Seçili kelimenin anlam ipucunu gösterir (kelime başına bir kez).',
    cost: `1 İpucu hakkı · −${MEANING_HINT_COST} puan`,
  },
  sentence: {
    name: 'Cümle',
    does: 'Seçili kelimeyi örnek cümle içinde, yeri boş bırakılarak gösterir; altında cümlenin çevirisi olur.',
    cost: `1 Cümle hakkı · −${TOOL_POINT_COST.sentence} puan`,
  },
  synonym: {
    name: 'Eş anlamlı',
    does: 'Aranan kelimeyle aynı anlama gelen, kabul edilen diğer karşılıkları gösterir (ör. amaç için: hedef, gaye).',
    cost: `1 Eş anlamlı hakkı · −${TOOL_POINT_COST.synonym} puan`,
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
  sentence: {
    name: 'Cümle',
    does: 'Bulmacada seçili kelimeyi örnek cümle içinde gösterir.',
    cost: `1 hak · −${TOOL_POINT_COST.sentence} puan`,
  },
  synonym: {
    name: 'Eş anlamlı',
    does: 'Bulmacada aranan kelimenin eş anlamlılarını gösterir.',
    cost: `1 hak · −${TOOL_POINT_COST.synonym} puan`,
  },
};
