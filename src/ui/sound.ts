/**
 * Ses: kısa efektler ve sakin bir arka plan müziği. Hepsi Web Audio ile kodda
 * üretilir; ses dosyası yok (indirme, lisans ve paket boyutu derdi yok).
 *
 * - Tarayıcılar sesi ancak kullanıcı bir yere dokunduktan sonra açar; ilk
 *   dokunuşa kadar hiçbir şey çalmaz (unlock()).
 * - Efektler ve müzik ayarlardan ayrı ayrı kapatılır (Settings.sound/music).
 * - Sekme arka plana geçince müzik susar, dönünce devam eder.
 * - Web Audio yoksa (çok eski tarayıcı) her şey sessizce hiçbir şey yapmaz.
 */

type Ctx = AudioContext;
let ctx: Ctx | null = null;
let effectsOn = true;
let musicWanted = false;
let unlocked = false;

function audio(): Ctx | null {
  if (!unlocked) return null;
  if (!ctx) {
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/** Tek nota: yumuşak başlayıp sönen ton. */
function tone(freq: number, at: number, dur: number, gain: number, type: OscillatorType = 'triangle', dest?: AudioNode) {
  const a = audio();
  if (!a) return;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t = a.currentTime + at;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + Math.min(0.02, dur / 4));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(dest ?? a.destination);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

// Notalar (Hz): Do majör pentatonik, akıl karıştırmayan tatlı aralıklar.
const N = { C4: 261.63, D4: 293.66, E4: 329.63, G4: 392.0, A4: 440.0, C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, C6: 1046.5 };

export const sfx = {
  /** Kelime doğru: yükselen üç nota, küçük bir "ding". */
  correct() {
    if (!effectsOn) return;
    tone(N.C5, 0, 0.18, 0.18);
    tone(N.E5, 0.08, 0.18, 0.16);
    tone(N.G5, 0.16, 0.35, 0.16);
    tone(N.C6, 0.16, 0.35, 0.05, 'sine');
  },
  /** Kelime yanlış: kısa, yumuşak, alçak iki nota. Cezalandırıcı değil. */
  wrong() {
    if (!effectsOn) return;
    tone(N.E4, 0, 0.14, 0.12, 'sine');
    tone(N.C4, 0.1, 0.22, 0.12, 'sine');
  },
  /** Bulmaca bitti: kısa bir melodi. */
  complete() {
    if (!effectsOn) return;
    [N.C5, N.E5, N.G5, N.C6].forEach((f, i) => tone(f, i * 0.11, 0.3, 0.15));
    tone(N.G5, 0.5, 0.6, 0.12);
    tone(N.C6, 0.5, 0.8, 0.1);
    tone(N.E5, 0.5, 0.8, 0.08, 'sine');
  },
};

// --- Müzik: seyrek, sakin bir pentatonik döngü ---------------------------

let musicTimer: number | undefined;
let musicBus: GainNode | null = null;
let nextAt = 0;
let step = 0;
/** Akorlar (kök notalar) ve üstünde seyrek tınılar; 16 adımda bir döner. */
const CHORDS = [
  [N.C4, N.E4, N.G4],
  [N.A4 / 2, N.C4, N.E4],
  [N.D4, N.G4, N.A4],
  [N.G4 / 2, N.D4, N.G4],
];
const BELLS = [N.C5, N.D5, N.E5, N.G5, N.A4 * 2];
const STEP_SEC = 0.75;

function scheduleMusic() {
  const a = audio();
  if (!a || !musicBus) return;
  // 1,5 sn ileriyi planla: sekme yavaşlasa da müzik takılmaz.
  while (nextAt < a.currentTime + 1.5) {
    const rel = nextAt - a.currentTime;
    if (step % 4 === 0) {
      const chord = CHORDS[(step / 4) % CHORDS.length];
      chord.forEach((f) => tone(f, rel, STEP_SEC * 4, 0.05, 'sine', musicBus!));
    }
    // Her adımda değil: rastgele, seyrek çan sesi.
    if (Math.random() < 0.35) tone(BELLS[Math.floor(Math.random() * BELLS.length)], rel, 1.2, 0.035, 'triangle', musicBus!);
    nextAt += STEP_SEC;
    step = (step + 1) % 16;
  }
}

function startMusic() {
  const a = audio();
  if (!a || musicTimer !== undefined) return;
  musicBus = a.createGain();
  musicBus.gain.value = 0.6;
  // Yumuşatma: tiz sesleri kıs.
  const lp = a.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 1800;
  musicBus.connect(lp).connect(a.destination);
  nextAt = a.currentTime + 0.1;
  step = 0;
  scheduleMusic();
  musicTimer = window.setInterval(scheduleMusic, 400);
}

function stopMusic() {
  if (musicTimer !== undefined) window.clearInterval(musicTimer);
  musicTimer = undefined;
  if (musicBus && ctx) {
    const bus = musicBus;
    bus.gain.setTargetAtTime(0, ctx.currentTime, 0.2);
    window.setTimeout(() => bus.disconnect(), 800);
  }
  musicBus = null;
}

function syncMusic() {
  if (musicWanted && unlocked && document.visibilityState === 'visible') startMusic();
  else stopMusic();
}

/** Ayarları uygula (Settings değişince ve açılışta). */
export function configureSound(opts: { effects: boolean; music: boolean }) {
  effectsOn = opts.effects;
  musicWanted = opts.music;
  syncMusic();
}

/** İlk dokunuşta sesi aç (tarayıcı kuralı). Uygulama başlarken bir kez çağrılır. */
export function installSoundUnlock() {
  const unlock = () => {
    unlocked = true;
    audio();
    syncMusic();
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
  document.addEventListener('visibilitychange', syncMusic);
}
