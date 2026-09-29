import { dayKey } from './daily';
import { INITIAL_INVENTORY } from './economy';
import { defaultProfile, type Profile } from './profile';
import type { PuzzleState } from './puzzle';

/**
 * Tarayıcıda saklama. Özel pencere, kapalı depolama ya da kota hatasında oyun
 * yine çalışır; yalnızca ilerleme kalıcı olmaz.
 */

export const STORAGE_KEY = 'kelime-oyunu:profil:v1';

export function loadProfile(now: Date = new Date()): Profile {
  const fresh = defaultProfile(now);
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fresh;
    const data = JSON.parse(raw) as Partial<Profile>;
    if (data.version !== 1) return fresh;
    // Eksik alanları varsayılanlarla tamamla (eski kayıtlar için).
    return {
      ...fresh,
      ...data,
      settings: { ...fresh.settings, ...data.settings },
      inventory: { ...INITIAL_INVENTORY, ...data.inventory },
      daily: { ...fresh.daily, ...data.daily, day: data.daily?.day ?? dayKey(now) },
      adaptive: { ...fresh.adaptive, ...data.adaptive },
      stats: { ...fresh.stats, ...data.stats },
      review: Array.isArray(data.review) ? data.review : [],
      learned: data.learned ?? {},
    } as Profile;
  } catch {
    return fresh;
  }
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
      s.sel.word < n;
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
