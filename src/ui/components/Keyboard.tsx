import { displayLetter } from '../../core/normalize';
import type { LangCode } from '../../core/types';
import { BackspaceIcon } from './Icons';

/** Ekran klavyesi düzenleri (küçük harf). Türkçe Q, İngilizce QWERTY. */
const LAYOUTS: Record<LangCode, string[]> = {
  tr: ['ertyuıopğü', 'asdfghjklşi', 'zcvbnmöç'],
  en: ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'],
};

interface Props {
  lang: LangCode;
  onLetter: (letter: string) => void;
  onBackspace: () => void;
  disabled?: boolean;
}

/**
 * Telefonun kendi klavyesi yerine oyunun klavyesi: ızgarayı kapatmaz, dil
 * değiştirmek gerekmez ve yalnızca hedef dilin harflerini gösterir.
 */
export function Keyboard({ lang, onLetter, onBackspace, disabled }: Props) {
  const rows = LAYOUTS[lang] ?? LAYOUTS.en;
  const widest = Math.max(...rows.map((r) => Array.from(r).length));
  return (
    <div className="kb" role="group" aria-label="Klavye" lang={lang} style={{ ['--kb-cols' as string]: widest }}>
      {rows.map((row, i) => (
        <div className="kb-row" key={row}>
          {Array.from(row).map((ch) => (
            <button
              key={ch}
              type="button"
              className="kb-key"
              disabled={disabled}
              // Dokunmada gecikme olmasın; odak ızgarada kalsın.
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => onLetter(ch)}
            >
              {displayLetter(ch, lang)}
            </button>
          ))}
          {i === rows.length - 1 && (
            <button
              type="button"
              className="kb-key kb-wide"
              disabled={disabled}
              onPointerDown={(e) => e.preventDefault()}
              onClick={onBackspace}
              aria-label="Sil"
            >
              <BackspaceIcon width={22} height={22} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
