import type { WordPack } from './types';

/**
 * Konu modları: ana kampanya dışında, tek bir kelime grubuyla oynanan isteğe
 * bağlı bulmacalar. Kampanya ilerlemesini (bölüm) ve uyarlamalı zorluğu
 * değiştirmez; yalnızca günlük hedefe sayılır.
 *
 * Bir mod, paketteki o konuya ait kelime sayısı eşiğe ulaşınca açılır.
 * Konu kelimeleri ana oyundaki kuralla pakete girer (bkz. taslak/pakete-ekle.mjs:
 * kişi onayı ya da iki kaynağın uyuşması); ayrıca kişi onayı beklenmez.
 *
 * Eşik (60) ölçümle seçildi: tek konulu 60 kelimelik bir havuz 7×7 ızgarada
 * bulmaca başına ~7,7 kelime veriyor ve ~12 bulmaca boyunca yeni kelime
 * getiriyor; 30 kelimede bu ~7, 20 kelimede ~5 bulmacaya iniyor.
 */

export const MIN_TOPIC_WORDS = 60;
/** Konu bulmacalarının ızgarası: küçük havuzlar büyük ızgarayı dolduramıyor. */
export const TOPIC_GRID = { rows: 7, cols: 7 };

export interface TopicMode {
  id: string;
  name: string;
  /** Paketteki `topic` etiketleri (paket Türkçe etiket kullanır). */
  packTopics: string[];
}

/** Modlar: önce günlük hayat, sonra meslek alanları. Yeni mod için buraya eklemek yeterli. */
export const TOPIC_MODES: TopicMode[] = [
  { id: 'seyahat', name: 'Seyahat ve şehir', packTopics: ['seyahat', 'şehir'] },
  { id: 'yemek', name: 'Yemek ve restoran', packTopics: ['yiyecek'] },
  { id: 'alisveris', name: 'Alışveriş ve para', packTopics: ['alışveriş'] },
  { id: 'ev', name: 'Ev ve aile', packTopics: ['ev', 'aile'] },
  { id: 'is', name: 'İş ve ofis', packTopics: ['iş'] },
  { id: 'saglik', name: 'Sağlık', packTopics: ['sağlık', 'vücut'] },
  { id: 'teknoloji', name: 'Bilim ve teknoloji', packTopics: ['teknoloji'] },
  { id: 'hukuk', name: 'Hukuk', packTopics: ['hukuk'] },
];

export interface TopicStatus {
  mode: TopicMode;
  /** Paketteki bu konuya ait kelime sayısı. */
  total: number;
  /** Bunlardan kişinin tek tek onayladıkları (bilgi için). */
  reviewed: number;
  enabled: boolean;
}

export function topicStatus(mode: TopicMode, pack: WordPack): TopicStatus {
  const entries = pack.entries.filter((e) => mode.packTopics.includes(e.topic));
  const reviewed = entries.filter((e) => e.reviewed === true).length;
  return { mode, total: entries.length, reviewed, enabled: entries.length >= MIN_TOPIC_WORDS };
}

export function topicStatuses(pack: WordPack): TopicStatus[] {
  return TOPIC_MODES.map((m) => topicStatus(m, pack));
}

/** Bir modda oynanabilecek kelimeler. */
export function topicEntryIds(mode: TopicMode, pack: WordPack): Set<string> {
  return new Set(pack.entries.filter((e) => mode.packTopics.includes(e.topic)).map((e) => e.id));
}
