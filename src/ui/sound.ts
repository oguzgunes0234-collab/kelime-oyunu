/**
 * Ses: kısa efektler ve neşeli bir arka plan müziği. Hepsi Web Audio ile kodda
 * üretilir; ses dosyası yok (indirme, lisans ve paket boyutu derdi yok).
 *
 * - Tarayıcılar sesi ancak kullanıcı bir yere dokunduktan sonra açar; ilk
 *   dokunuşa kadar hiçbir şey çalmaz (installSoundUnlock).
 * - Efektler ve müzik ayarlardan ayrı ayrı kapatılır (Settings.sound/music).
 * - Sekme arka plana geçince müzik susar, dönünce devam eder.
 * - Web Audio yoksa (çok eski tarayıcı) her şey sessizce hiçbir şey yapmaz.
 */

let ctx: AudioContext | null = null;
let fxBus: GainNode | null = null;
let noise: AudioBuffer | null = null;
let effectsOn = true;
let musicWanted = false;
let unlocked = false;

function audio(): AudioContext | null {
  if (!unlocked) return null;
  if (!ctx) {
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
    // Efektler: hafif sıkıştırma, telefon hoparlöründe net ve dengeli duyulsun.
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 4;
    fxBus = ctx.createGain();
    fxBus.gain.value = 0.9;
    fxBus.connect(comp).connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/** Davul için kısa beyaz gürültü (bir kez üretilir). */
function noiseBuffer(a: AudioContext): AudioBuffer {
  if (!noise) {
    noise = a.createBuffer(1, a.sampleRate * 0.5, a.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noise;
}

interface ToneOpts {
  type?: OscillatorType;
  gain?: number;
  /** Frekans kayması: sona doğru bu frekansa iner/çıkar. */
  slideTo?: number;
  attack?: number;
  dest?: AudioNode;
}

function tone(freq: number, at: number, dur: number, o: ToneOpts = {}) {
  const a = audio();
  if (!a) return;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = o.type ?? 'square';
  const t = a.currentTime + Math.max(0, at);
  osc.frequency.setValueAtTime(freq, t);
  if (o.slideTo) osc.frequency.exponentialRampToValueAtTime(o.slideTo, t + dur);
  const peak = o.gain ?? 0.2;
  const atk = o.attack ?? 0.005;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + atk);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(o.dest ?? fxBus ?? a.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

// Notalar (Hz)
const F = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);
const C4 = 60, D4 = 62, E4 = 64, F4 = 65, G4 = 67, A4 = 69, B4 = 71, C5 = 72, D5 = 74, E5 = 76, F5 = 77, G5 = 79, A5 = 81, C6 = 84;

export const sfx = {
  /** Kelime doğru: kısa, parlak iki nota ("pıling"). */
  correct() {
    if (!effectsOn) return;
    tone(F(86), 0, 0.07, { gain: 0.16 }); // D6
    tone(F(91), 0.06, 0.28, { gain: 0.16 }); // G6
    tone(F(103), 0.06, 0.2, { type: 'triangle', gain: 0.06 }); // parıltı, bir oktav üst
  },
  /** Yanlış: kısa, aşağı kayan "bup". Cezalandırıcı değil. */
  wrong() {
    if (!effectsOn) return;
    tone(300, 0, 0.16, { gain: 0.12, slideTo: 170 });
  },
  /** Bulmaca bitti: hızlı yükselen kısa zafer melodisi. */
  complete() {
    if (!effectsOn) return;
    [C5, E5, G5, C6].forEach((n, i) => tone(F(n), i * 0.08, 0.14, { gain: 0.14 }));
    tone(F(C6), 0.34, 0.5, { gain: 0.13 });
    tone(F(G5), 0.34, 0.5, { type: 'triangle', gain: 0.1 });
    tone(F(E5), 0.34, 0.5, { type: 'triangle', gain: 0.08 });
  },
};

// --- Müzik: neşeli, 120 BPM, 16 ölçülük döngü ------------------------------

const EIGHTH = 0.25; // 120 BPM'de sekizlik
/** Akorlar, ölçü başına (C – G – Am – F), kök notalar. */
const PROGRESSION = [C4 - 12, G4 - 24, A4 - 24, F4 - 12];
/** Akor tonları (melodiye eşlik eden kısa vuruşlar). */
const CHORD_TONES: Record<number, number[]> = {
  [C4 - 12]: [C4, E4, G4],
  [G4 - 24]: [B4 - 12, D4, G4],
  [A4 - 24]: [C4, E4, A4],
  [F4 - 12]: [C4, F4, A4],
};
/**
 * Melodi: 8 sekizlik × 8 ölçü (0 = sus). İlk dört ölçü soru, son dört cevap;
 * sonra döngü başa döner. Akor dizisi iki kez çalınır.
 */
const MELODY: number[] = [
  E5, 0, G5, 0, A5, G5, E5, 0,
  D5, 0, G5, 0, D5, 0, B4, 0,
  C5, 0, E5, A5, 0, G5, E5, 0,
  F5, 0, E5, 0, D5, 0, C5, 0,
  E5, E5, 0, G5, 0, C6, A5, 0,
  G5, 0, F5, 0, D5, 0, G5, 0,
  A5, 0, G5, E5, 0, C5, D5, 0,
  C5, 0, 0, 0, G4, 0, C5, 0,
];

let musicTimer: number | undefined;
let musicBus: GainNode | null = null;
let nextAt = 0;
let step = 0; // sekizlik sayacı, 0 … 63

function drum(kind: 'kick' | 'hat' | 'snare', at: number) {
  const a = audio();
  if (!a || !musicBus) return;
  const t = a.currentTime + at;
  if (kind === 'kick') {
    tone(140, at, 0.18, { type: 'sine', gain: 0.5, slideTo: 45, dest: musicBus });
    return;
  }
  const src = a.createBufferSource();
  src.buffer = noiseBuffer(a);
  const filter = a.createBiquadFilter();
  filter.type = kind === 'hat' ? 'highpass' : 'bandpass';
  filter.frequency.value = kind === 'hat' ? 7000 : 1800;
  const g = a.createGain();
  const dur = kind === 'hat' ? 0.04 : 0.12;
  g.gain.setValueAtTime(kind === 'hat' ? 0.12 : 0.18, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filter).connect(g).connect(musicBus);
  src.start(t);
  src.stop(t + dur + 0.02);
}

function scheduleMusic() {
  const a = audio();
  if (!a || !musicBus) return;
  // 1 sn ileriyi planla: sekme yavaşlasa da müzik takılmaz.
  while (nextAt < a.currentTime + 1) {
    const rel = nextAt - a.currentTime;
    const bar = Math.floor(step / 8);
    const beat = step % 8;
    const root = PROGRESSION[bar % PROGRESSION.length];

    // Bas: kök – kök – oktav – kök, zıplayan sekizlikler.
    const bassNote = beat % 4 === 2 ? root + 12 : root;
    tone(F(bassNote), rel, EIGHTH * 0.9, { type: 'triangle', gain: 0.22, dest: musicBus });

    // Akor vuruşları: vuruş aralarında kısa "çak".
    if (beat % 2 === 1) CHORD_TONES[root].forEach((n) => tone(F(n), rel, 0.09, { type: 'square', gain: 0.025, dest: musicBus! }));

    // Melodi.
    const m = MELODY[step];
    if (m) tone(F(m), rel, EIGHTH * 1.6, { type: 'square', gain: 0.07, attack: 0.01, dest: musicBus });

    // Davul: 1 ve 3'te vuruş, 2 ve 4'te trampet, her sekizlikte hafif zil.
    if (beat === 0 || beat === 4) drum('kick', rel);
    if (beat === 2 || beat === 6) drum('snare', rel);
    drum('hat', rel);

    nextAt += EIGHTH;
    step = (step + 1) % MELODY.length;
  }
}

function startMusic() {
  const a = audio();
  if (!a || musicTimer !== undefined) return;
  musicBus = a.createGain();
  musicBus.gain.value = 0.35;
  // Kare dalganın sertliğini al: telefon hoparlöründe yorucu olmasın.
  const lp = a.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 4500;
  musicBus.connect(lp).connect(a.destination);
  nextAt = a.currentTime + 0.1;
  step = 0;
  scheduleMusic();
  musicTimer = window.setInterval(scheduleMusic, 250);
}

function stopMusic() {
  if (musicTimer !== undefined) window.clearInterval(musicTimer);
  musicTimer = undefined;
  if (musicBus && ctx) {
    const bus = musicBus;
    bus.gain.setTargetAtTime(0, ctx.currentTime, 0.15);
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
