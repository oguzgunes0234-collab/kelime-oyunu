import type { WordPack } from './types';

/**
 * Konu modları: ana kampanya dışında, tek bir kelime grubuyla oynanan isteğe
 * bağlı bulmacalar. Kampanya ilerlemesini (bölüm) ve uyarlamalı zorluğu
 * değiştirmez; yalnızca günlük hedefe sayılır.
 *
 * Bir mod ancak yeterli sayıda GÖZDEN GEÇİRİLMİŞ kelimesi olduğunda açılır.
 * Kelimeler paket dosyasında `reviewed: true` ile işaretlenir; bu işareti
 * yalnızca içeriği kontrol eden kişi koyar. Eksik moda "hazır" denmez.
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

/** Önerilen modlar. İçerik eklendikçe buraya yeni mod eklemek yeterli. */
export const TOPIC_MODES: TopicMode[] = [
  { id: 'saglik', name: 'Sağlık', packTopics: ['sağlık', 'vücut'] },
  { id: 'teknoloji', name: 'Teknoloji', packTopics: ['teknoloji'] },
  { id: 'hukuk', name: 'Hukuk', packTopics: ['hukuk'] },
  { id: 'seyahat', name: 'Seyahat ve şehir', packTopics: ['seyahat', 'şehir'] },
];

export interface TopicStatus {
  mode: TopicMode;
  /** Paketteki bu konuya ait kelime sayısı. */
  total: number;
  /** Bunlardan gözden geçirilmiş olanlar. */
  reviewed: number;
  enabled: boolean;
}

export function topicStatus(mode: TopicMode, pack: WordPack): TopicStatus {
  const entries = pack.entries.filter((e) => mode.packTopics.includes(e.topic));
  const reviewed = entries.filter((e) => e.reviewed === true).length;
  return { mode, total: entries.length, reviewed, enabled: reviewed >= MIN_TOPIC_WORDS };
}

export function topicStatuses(pack: WordPack): TopicStatus[] {
  return TOPIC_MODES.map((m) => topicStatus(m, pack));
}

/** Bir modda oynanabilecek kelimeler: yalnızca gözden geçirilmiş olanlar. */
export function topicEntryIds(mode: TopicMode, pack: WordPack): Set<string> {
  return new Set(pack.entries.filter((e) => mode.packTopics.includes(e.topic) && e.reviewed === true).map((e) => e.id));
}
