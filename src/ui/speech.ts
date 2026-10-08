import { useEffect, useState } from 'react';
import type { LangCode } from '../core/types';

/**
 * Telaffuz: telefonun kendi seslendirmesi (Web Speech API). Ses dosyası yok,
 * internet gerekmez; ses cihazdaki seslerden gelir. Desteklemeyen tarayıcıda
 * ya da o dilde ses yoksa düğme hiç görünmez.
 */

const LOCALE: Record<string, string> = { en: 'en-US', tr: 'tr-TR' };

function synth(): SpeechSynthesis | null {
  try {
    return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined'
      ? window.speechSynthesis
      : null;
  } catch {
    return null;
  }
}

/** Dile uygun ses: önce cihazdaki (çevrimdışı) ses, ABD sonra İngiltere İngilizcesi. */
function pickVoice(voices: SpeechSynthesisVoice[], lang: LangCode): SpeechSynthesisVoice | null {
  const prefix = lang.toLowerCase();
  const matching = voices.filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith(prefix));
  if (!matching.length) return null;
  const locale = (LOCALE[lang] ?? lang).toLowerCase();
  const score = (v: SpeechSynthesisVoice) =>
    (v.lang.toLowerCase().replace('_', '-') === locale ? 2 : 0) + (v.localService ? 1 : 0) + (v.default ? 0.5 : 0);
  return [...matching].sort((a, b) => score(b) - score(a))[0];
}

/** Metni seslendirir; önceki konuşmayı keser. Desteklenmiyorsa hiçbir şey yapmaz. */
export function speak(text: string, lang: LangCode): void {
  const s = synth();
  if (!s || !text.trim()) return;
  try {
    s.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = LOCALE[lang] ?? lang;
    const voice = pickVoice(s.getVoices(), lang);
    if (voice) u.voice = voice;
    // Öğrenen için biraz yavaş ve net.
    u.rate = 0.85;
    s.speak(u);
  } catch {
    /* seslendirme başarısız: sessizce geç */
  }
}

/**
 * Bu dil seslendirilebilir mi? Ses listesi bazı tarayıcılarda geç yüklenir:
 * liste boşken var sayılır (iPhone ilk anda boş döner), dolunca o dilde ses
 * yoksa düğme gizlenir.
 */
export function useCanSpeak(lang: LangCode): boolean {
  const [ok, setOk] = useState(() => check(lang));
  useEffect(() => {
    const s = synth();
    if (!s) return;
    const update = () => setOk(check(lang));
    update();
    s.addEventListener?.('voiceschanged', update);
    return () => s.removeEventListener?.('voiceschanged', update);
  }, [lang]);
  return ok;
}

function check(lang: LangCode): boolean {
  const s = synth();
  if (!s) return false;
  try {
    const voices = s.getVoices();
    return voices.length === 0 || pickVoice(voices, lang) !== null;
  } catch {
    return false;
  }
}
