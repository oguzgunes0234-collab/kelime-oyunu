import type { MouseEvent } from 'react';
import type { LangCode } from '../../core/types';
import { speak, useCanSpeak } from '../speech';
import { SpeakerIcon } from './Icons';

interface Props {
  /** Seslendirilecek metin (kelime ya da örnek cümle). */
  text: string;
  lang: LangCode;
  /** Ekran okuyucu için; verilmezse "<metin>: sesli dinle". */
  label?: string;
  size?: number;
}

/**
 * Hoparlör düğmesi: dokununca kelimeyi telefonun sesiyle okur. Seslendirme
 * yoksa hiç çizilmez. Açılır kutunun (details) içinde de kutuyu açıp kapatmaz.
 */
export function SpeakButton({ text, lang, label, size = 18 }: Props) {
  const can = useCanSpeak(lang);
  if (!can || !text) return null;
  const onClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    speak(text, lang);
  };
  return (
    <button type="button" className="speak-btn" onClick={onClick} aria-label={label ?? `${text}: sesli dinle`}>
      <SpeakerIcon width={size} height={size} />
    </button>
  );
}
