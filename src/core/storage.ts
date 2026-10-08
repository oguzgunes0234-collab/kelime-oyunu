import { dayKey } from './daily';
import { INITIAL_INVENTORY } from './economy';
import { defaultProfile, GAME_DIRECTION, type Profile, type ReviewItem } from './profile';
import type { PuzzleState } from './puzzle';

/**
 * Tarayıcıda saklama. Özel pencere, kapalı depolama ya da kota hatasında oyun
 * yine çalışır; yalnızca ilerleme kalıcı olmaz.
 */

export const STORAGE_KEY = 'kelime-oyunu:profil:v1';

/**
 * Eski kayıtlarda kalan ve artık olmayan ayarlar: tema seçimi (yalnızca koyu
 * tema var) ve oyun yönü (yalnızca Türkçe → İngilizce).
 */
function cleanSettings<T extends object>(s: T): T {
  const { theme: _theme, direction: _direction, ...rest } = s as T & { theme?: unknown; direction?: unknown };
  return rest as T;
}

const GAME_DIR_KEY = `${GAME_DIRECTION.source}>${GAME_DIRECTION.target}`;

/**
 * Kaldırılan yönde (İngilizce → Türkçe) tekrar listesine girmiş kelimeler
 * silinmez, oyunun yönüne taşınır; aynı kelime iki kez yer almaz (hata sayıları toplanır).
 */
export function migrateReview(review: ReviewItem[]): ReviewItem[] {
  const out: ReviewItem[] = [];
  for (const r of review) {
    const item = r.dir === GAME_DIR_KEY ? r : { ...r, dir: GAME_DIR_KEY };
    const i = out.findIndex((o) => o.entryId === item.entryId);
    if (i < 0) out.push(item);
    else out[i] = { ...out[i], misses: out[i].misses + item.misses, addedAt: Math.min(out[i].addedAt, item.addedAt) };
  }
  return out;
}

export function loadProfile(now: Date = new Date()): Profile {
  const fresh = defaultProfile(now);
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fresh;
    const data = JSON.parse(raw) as Partial<Profile>;
    if (data.version !== 1) return fresh;
    // Eksik alanları varsayılanlarla tamamla (eski kayıtlar için).
    const merged = {
      ...fresh,
      ...data,
      settings: cleanSettings({ ...fresh.settings, ...data.settings }),
      inventory: { ...INITIAL_INVENTORY, ...data.inventory },
      daily: { ...fresh.daily, ...data.daily, day: data.daily?.day ?? dayKey(now) },
      adaptive: { ...fresh.adaptive, ...data.adaptive },
      stats: { ...fresh.stats, ...data.stats },
      review: Array.isArray(data.review) ? migrateReview(data.review) : [],
      learned: data.learned ?? {},
      campaign: { ...fresh.campaign, ...data.campaign },
    } as Profile;
    return data.campaign ? merged : migrateToCampaign(merged);
  } catch {
    return fresh;
  }
}

/**
 * Bölüm sisteminden önceki kaydı aktarır (yalnızca bir kez: `campaign` alanı
 * yoksa). Kural:
 * - Eski sürümler tamamlanan bulmaca sayısını tutmadığı için bölüm tahmin
 *   edilmez: oyuncu Bölüm 1, 0 bulmacadan başlar.
 * - Jeton, haklar, seri, tekrar listesi, öğrenilen kelimeler ve seviye korunur.
 * - Oyuncu eskiden seviyeyi elle seçtiyse (Kolay/Orta/Zor), uyarlamalı zorluk
 *   o seviyeden devam eder; seçim artık oyuncuya sorulmaz.
 */
export function migrateToCampaign(p: Profile): Profile {
  const mode = p.settings.difficultyMode;
  const adaptive = mode === 'adaptive' ? p.adaptive : { ...p.adaptive, difficulty: mode };
  return {
    ...p,
    campaign: { puzzlesDone: 0 },
    adaptive,
    settings: { ...p.settings, difficultyMode: 'adaptive' },
  };
}

export function saveProfile(profile: Profile): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    return true;
  } catch {
    return false;
  }
}

/** Yarım kalan bulmaca; sayfa kapansa da kaldığı yerden devam eder. */
export const PUZZLE_KEY = 'kelime-oyunu:bulmaca:v1';

export function loadPuzzle(): PuzzleState | null {
  try {
    const raw = localStorage.getItem(PUZZLE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as PuzzleState;
    const n = s?.cw?.words?.length;
    const ok =
      s.status === 'playing' &&
      n > 0 &&
      [s.solved, s.wrong, s.lettersRevealed, s.meaningShown].every((a) => Array.isArray(a) && a.length === n) &&
      s.sel.word < n &&
      // Kaldırılan yönde (İngilizce → Türkçe) yarım kalmış bulmaca açılmaz.
      s.direction?.source === GAME_DIRECTION.source &&
      s.direction?.target === GAME_DIRECTION.target;
    return ok ? { ...s, event: null } : null;
  } catch {
    return null;
  }
}

export function savePuzzle(state: PuzzleState | null): void {
  try {
    if (state && state.status === 'playing') localStorage.setItem(PUZZLE_KEY, JSON.stringify({ ...state, event: null }));
    else localStorage.removeItem(PUZZLE_KEY);
  } catch {
    /* depolama kapalıysa bulmaca yalnızca bu oturumda yaşar */
  }
}

export function clearProfile(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(PUZZLE_KEY);
  } catch {
    /* depolama kapalıysa silinecek bir şey de yok */
  }
}
