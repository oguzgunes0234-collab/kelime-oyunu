import { dayKey } from './daily';
import { INITIAL_INVENTORY } from './economy';
import { defaultProfile, type Profile } from './profile';

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

export function clearProfile(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* depolama kapalıysa silinecek bir şey de yok */
  }
}
