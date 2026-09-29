import type { LangCode } from './types';

export interface LanguageInfo {
  code: LangCode;
  /** Arayüzde (Türkçe) görünen ad. */
  name: string;
  /** "…de/da" hâli, ör. "İngilizcede". Türkçe ek uyumu koddan türetilemez. */
  inName: string;
  /** Büyük/küçük harf dönüşümünde kullanılan yerel ayar (Türkçe İ/ı için şart). */
  locale: string;
  /** Zor seviyelerde şaşırtmaca harf seçmek için alfabe (küçük harf). */
  alphabet: string;
}

export const LANGUAGES: Record<LangCode, LanguageInfo> = {
  tr: { code: 'tr', name: 'Türkçe', inName: 'Türkçede', locale: 'tr-TR', alphabet: 'abcçdefgğhıijklmnoöprsştuüvyz' },
  en: { code: 'en', name: 'İngilizce', inName: 'İngilizcede', locale: 'en-US', alphabet: 'abcdefghijklmnopqrstuvwxyz' },
};

export function languageInfo(code: LangCode): LanguageInfo {
  const info = LANGUAGES[code];
  if (!info) throw new Error(`Bilinmeyen dil: ${code}`);
  return info;
}
