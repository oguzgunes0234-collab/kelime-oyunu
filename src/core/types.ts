/**
 * Veri modeli. Kelime paketi "kavram" tabanlıdır: her girdi bir anlamı temsil
 * eder ve her dildeki karşılığını `terms` altında tutar. Böylece aynı girdi
 * hem TR→EN hem EN→TR sorusu üretir; yeni bir dil eklemek için yalnızca
 * `terms` altına yeni bir anahtar (ör. "de") eklemek yeter.
 */

/** ISO 639-1 dil kodu. İlk sürümde yalnızca "tr" ve "en" kullanılıyor. */
export type LangCode = string;

/** Yaklaşık CEFR düzeyi. Doğrulanmış bir sınıflandırma değildir. */
export type Cefr = 'A1' | 'A2' | 'B1' | 'B2';

export type PartOfSpeech = 'noun' | 'verb' | 'adjective' | 'adverb';

export interface Term {
  /** Ana cevap. Harf taşları bundan üretilir; tek kelime olmalı. */
  text: string;
  /** Kabul edilen diğer yaygın karşılıklar. */
  alternatives?: string[];
  /** Soru bu dilde sorulurken anlamı netleştiren kısa not (arayüz dilinde). */
  context?: string;
  /** Kısa örnek cümle, bu dilde. */
  example?: string;
}

export interface Entry {
  id: string;
  pos: PartOfSpeech;
  level: Cefr;
  /** Konu etiketi (arayüz dilinde). */
  topic: string;
  terms: Record<LangCode, Term>;
  /** Anlam ipucu, arayüz diline göre. Cevabı doğrudan içermemeli. */
  hint?: Record<LangCode, string>;
}

export interface WordPack {
  id: string;
  version: number;
  name: string;
  languages: LangCode[];
  description: string;
  entries: Entry[];
}

export interface Direction {
  source: LangCode;
  target: LangCode;
}

export type Difficulty = 'easy' | 'medium' | 'hard';
export type DifficultyMode = Difficulty | 'adaptive';

/** Bir girdiden belirli bir yön için türetilen soru. */
export interface Question {
  entryId: string;
  source: LangCode;
  target: LangCode;
  prompt: string;
  promptContext?: string;
  /** Harf taşlarının oluşturduğu ana cevap (hedef dilde). */
  answer: string;
  /** Ana cevap dahil tüm kabul edilen cevaplar. */
  accepted: string[];
  pos: PartOfSpeech;
  level: Cefr;
  topic: string;
  sourceExample?: string;
  targetExample?: string;
  meaningHint?: string;
}

export type ToolId = 'shuffle' | 'magnet' | 'hint' | 'undo';
export type Inventory = Record<ToolId, number>;
