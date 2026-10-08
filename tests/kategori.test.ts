import { describe, expect, it } from 'vitest';
import { MIN_TOPIC_WORDS, TOPIC_MODES, topicStatuses } from '../src/core/topics';
import { CATEGORY_ART_IDS } from '../src/ui/components/CategoryArt';
import type { WordPack } from '../src/core/types';
import packJson from '../src/data/pack-tr-en.json';

const pack = packJson as WordPack;

describe('konu kategorileri', () => {
  it('her konunun kendine özgü çizimi var', () => {
    for (const m of TOPIC_MODES) expect(CATEGORY_ART_IDS, m.id).toContain(m.id);
  });

  it('yeni konular paketteki mevcut etiketlerden: okul ve duygular açık, doğa ve hava bir kelime eksik', () => {
    const st = Object.fromEntries(topicStatuses(pack).map((s) => [s.mode.id, s]));
    expect(st.okul.total).toBe(64);
    expect(st.okul.enabled).toBe(true);
    expect(st.duygular.total).toBe(60);
    expect(st.duygular.enabled).toBe(true);
    expect(st.doga.total).toBe(MIN_TOPIC_WORDS - 1);
    expect(st.doga.enabled).toBe(false);
  });

  it('bir kelime iki konuya birden girmez', () => {
    const tags = TOPIC_MODES.flatMap((m) => m.packTopics);
    expect(new Set(tags).size).toBe(tags.length);
  });
});
