/**
 * Kalıcı kayıt katmanı.
 *
 * - Tarayıcıda (web/PWA) yalnızca localStorage kullanılır; davranış eskisiyle aynı.
 * - iPhone uygulamasında (Capacitor) iOS, yer daralınca web görünümünün
 *   localStorage'ını silebilir. Bu yüzden her yazma, Capacitor Preferences
 *   eklentisine (iOS UserDefaults) de AYNEN yansıtılır; açılışta localStorage'da
 *   olmayan anahtar oradan geri yüklenir (restoreNativeBackup).
 * - Hiçbir veri sessizce silinmez ya da üzerine yazılmaz: geri yükleme yalnızca
 *   localStorage'da OLMAYAN anahtar için yapılır; localStorage her zaman öncelikli.
 *
 * Capacitor bu depoya henüz eklenmedi (paket kurulumu oyun sahibinin onayını
 * bekliyor). Kod, eklenti çalışma anında varsa kullanır; yoksa yalnızca
 * localStorage ile çalışır. Bkz. docs/ios/MAC-YONERGESI.md.
 */

interface PreferencesPlugin {
  get(o: { key: string }): Promise<{ value: string | null }>;
  set(o: { key: string; value: string }): Promise<void>;
  remove(o: { key: string }): Promise<void>;
}

interface CapacitorGlobal {
  isNativePlatform?: () => boolean;
  Plugins?: { Preferences?: PreferencesPlugin };
}

function capacitor(): CapacitorGlobal | undefined {
  return typeof window !== 'undefined' ? (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor : undefined;
}

/** iPhone/Android uygulaması içinde mi (Capacitor yerel kabuğu)? */
export function isNativeApp(): boolean {
  try {
    return capacitor()?.isNativePlatform?.() === true;
  } catch {
    return false;
  }
}

function nativePrefs(): PreferencesPlugin | null {
  return isNativeApp() ? (capacitor()?.Plugins?.Preferences ?? null) : null;
}

/** Ham metni yazar (localStorage + yerel yedek). Başarısızsa false. */
export function persistRaw(key: string, value: string | null): boolean {
  let ok = true;
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    ok = false;
  }
  const prefs = nativePrefs();
  if (prefs) {
    // Yedeğe yazma arka planda; hata oyunu durdurmaz.
    (value === null ? prefs.remove({ key }) : prefs.set({ key, value })).catch(() => undefined);
  }
  return ok;
}

export function persist(key: string, value: unknown): boolean {
  return persistRaw(key, JSON.stringify(value));
}

export function readPersisted<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/**
 * Uygulama açılışında, oyun çizilmeden önce çağrılır: localStorage'da olmayan
 * anahtarları yerel yedekten geri yükler. Var olan veriye dokunmaz. Web'de
 * hiçbir şey yapmaz. En çok `timeoutMs` bekler.
 */
export async function restoreNativeBackup(keys: string[], timeoutMs = 1500): Promise<string[]> {
  const prefs = nativePrefs();
  if (!prefs) return [];
  const restored: string[] = [];
  const work = (async () => {
    for (const key of keys) {
      let current: string | null = null;
      try {
        current = localStorage.getItem(key);
      } catch {
        return;
      }
      if (current !== null) {
        // localStorage öncelikli; yedek eksikse tamamla (ilk açılışta eski veri yedeğe geçer).
        await prefs.set({ key, value: current }).catch(() => undefined);
        continue;
      }
      const { value } = await prefs.get({ key }).catch(() => ({ value: null }));
      if (value !== null) {
        try {
          localStorage.setItem(key, value);
          restored.push(key);
        } catch {
          /* depolama kapalı */
        }
      }
    }
  })();
  await Promise.race([work, new Promise((r) => setTimeout(r, timeoutMs))]);
  return restored;
}
