import { afterEach, describe, expect, it } from 'vitest';
import { speak } from '../src/ui/speech';

type Voice = { lang: string; name: string; localService: boolean; default: boolean };

function fakeSpeech(voices: Voice[]) {
  const spoken: { text: string; lang: string; voice: Voice | null; rate: number }[] = [];
  let cancelled = 0;
  class Utterance {
    lang = '';
    voice: Voice | null = null;
    rate = 1;
    constructor(public text: string) {}
  }
  const g = globalThis as Record<string, unknown>;
  g.SpeechSynthesisUtterance = Utterance;
  g.window = {
    speechSynthesis: {
      getVoices: () => voices,
      cancel: () => cancelled++,
      speak: (u: Utterance) => spoken.push({ text: u.text, lang: u.lang, voice: u.voice, rate: u.rate }),
    },
  };
  return { spoken, cancelled: () => cancelled };
}

afterEach(() => {
  const g = globalThis as Record<string, unknown>;
  delete g.window;
  delete g.SpeechSynthesisUtterance;
});

describe('telaffuz', () => {
  it('İngilizce kelimeyi cihazdaki ABD İngilizcesi sesiyle, biraz yavaş okur; öncekini keser', () => {
    const voices: Voice[] = [
      { lang: 'tr-TR', name: 'Yelda', localService: true, default: true },
      { lang: 'en-GB', name: 'Daniel', localService: true, default: false },
      { lang: 'en-US', name: 'Online', localService: false, default: false },
      { lang: 'en-US', name: 'Samantha', localService: true, default: false },
    ];
    const f = fakeSpeech(voices);
    speak('delete', 'en');
    expect(f.cancelled()).toBe(1);
    expect(f.spoken).toHaveLength(1);
    expect(f.spoken[0].text).toBe('delete');
    expect(f.spoken[0].lang).toBe('en-US');
    expect(f.spoken[0].voice?.name).toBe('Samantha');
    expect(f.spoken[0].rate).toBeLessThan(1);
  });

  it('ses listesi boşsa da dil koduyla okur (iPhone ilk anda boş döndürür)', () => {
    const f = fakeSpeech([]);
    speak('apple', 'en');
    expect(f.spoken[0]).toMatchObject({ text: 'apple', lang: 'en-US', voice: null });
  });

  it('seslendirme yoksa hata vermez', () => {
    expect(() => speak('apple', 'en')).not.toThrow();
  });
});
