// Taslak kelime gruplarını (taslak/grup-*.txt) incelemeye hazır JSON'a çevirir
// ve her girdiyi otomatik denetler. Çıktı: taslak/taslak.json
//
// Satır biçimi (| ile ayrılmış):
//   en|tr|tr_diger|tür|seviye|konu|örnek_en|örnek_tr|tanım[|en_diger[|tr_açıklama[|temel[|dilbilgisi]]]]
//   en|-|elenme sebebi
//
// tr_açıklama: aynı Türkçe kelimeye düşen iki anlamı ayıran kısa not, ör.
//   "ay" → "takvim" (month) / "gökyüzü" (moon). Aynı Türkçe kelime ancak iki
//   kayıtta da açıklama varsa kabul edilir.
// temel + dilbilgisi: çekimli biçimler için, ör. went → "go/gitmek" ve
//   "Düzensiz fiil: go → went".
//
// Taslaklar oyuna GİRMEZ. Yalnızca incelemede onaylanan girdiler
// (reviewed: true) src/data/pack-tr-en.json'a eklenir.
//
// Çalıştırma: node taslak/donustur.mjs

import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
const fullPack = JSON.parse(readFileSync(join(dir, '../src/data/pack-tr-en.json'), 'utf8'));
// Taban: elle yazılmış girdiler. Taslaktan eklenenler (check alanı olanlar) sayılmaz.
const pack = { ...fullPack, entries: fullPack.entries.filter((e) => !e.check) };

const POS = ['noun', 'verb', 'adjective', 'adverb'];
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'];
const MAX_ANSWER = 8; // 9×8 ızgarada en uzun cevap
const MAX_HINT = 90; // ipucu çubuğunda 2–3 satır

const trLower = (s) => s.toLocaleLowerCase('tr');
const plain = (s) => trLower(s).replace(/[âà]/g, 'a').replace(/[îì]/g, 'i').replace(/[ûù]/g, 'u');
const slug = (s) =>
  plain(s)
    .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u')
    .replace(/[^a-z0-9]+/g, '-');
const hasWord = (text, word) => new RegExp(`(?<![\\p{L}])${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}])`, 'iu').test(text);

// Türkçe kelime → o kelimeyi kullanan kayıtlar (İngilizcesi ve açıklaması).
const packTr = new Map();
for (const e of pack.entries) {
  const k = plain(e.terms.tr.text);
  packTr.set(k, [...(packTr.get(k) ?? []), { en: e.terms.en.text, ctx: e.terms.tr.context }]);
}
const packEn = new Set(pack.entries.map((e) => e.terms.en.text.toLowerCase()));
const ids = new Set(pack.entries.map((e) => e.id));
const draftTr = new Map(); // aynı biçim: Türkçe → [{ en, ctx }]

// İsteğe bağlı ikinci görüş: başka bir kaynağın aynı İngilizce kelimeye verdiği
// Türkçe karşılık (yalnızca karşılaştırma için; repoya girmez, bkz. .gitignore).
const secondPath = join(dir, 'ikinci-gorus.json');
const second = existsSync(secondPath) ? JSON.parse(readFileSync(secondPath, 'utf8')) : {};
const secondFor = (en) => second[en.toLowerCase()] ?? second[{ centre: 'center', behavior: 'behaviour' }[en] ?? ''];

const entries = [];
const skipped = [];
const files = readdirSync(dir).filter((f) => /^grup-\d+\.txt$/.test(f)).sort();
for (const file of files) {
  const group = Number(file.match(/\d+/)[0]);
  const lines = readFileSync(join(dir, file), 'utf8').split(/\r?\n/).filter((l) => l.trim());
  for (const line of lines) {
    const f = line.split('|');
    if (f[1] === '-') {
      skipped.push({ en: f[0], group, reason: f[2] ?? '' });
      continue;
    }
    const [en, tr, alts, pos, level, topic, exEn, exTr, hint, enAlts, ctxField, base, grammarNote] = f;
    // Çekimli biçimde ayırt edici açıklama dilbilgisidir (pakete-ekle.mjs ile aynı kural).
    const trCtx = base ? `geçmiş zaman · ${base.split('/')[1]}` : ctxField;
    const flags = [];
    if (!POS.includes(pos)) flags.push(`tür geçersiz: ${pos}`);
    if (!LEVELS.includes(level)) flags.push(`seviye geçersiz: ${level}`);
    if (!/^[\p{L}]+$/u.test(tr)) flags.push('Türkçe karşılık tek kelime değil');
    if (en.length > MAX_ANSWER) flags.push(`İngilizce ${en.length} harf, ızgaraya sığmaz`);
    if (!exEn || !hasWord(exEn, en)) flags.push('İngilizce örnekte kelime aynen geçmiyor (cümle ipucu çıkmaz)');
    if (hint && hasWord(plain(hint), plain(tr))) flags.push('tanımda cevap geçiyor');
    if ((hint ?? '').length > MAX_HINT) flags.push(`tanım ${hint.length} karakter (en çok ${MAX_HINT})`);
    if (packEn.has(en.toLowerCase())) flags.push('İngilizce kelime pakette zaten var');
    const key = plain(tr);
    const same = [...(packTr.get(key) ?? []).map((o) => ({ ...o, where: 'pakette' })), ...(draftTr.get(key) ?? []).map((o) => ({ ...o, where: 'taslakta' }))];
    for (const o of same) {
      if (!trCtx || !o.ctx) flags.push(`"${tr}" ${o.where} de var (= ${o.en}); iki kayıtta da ayırt edici açıklama gerekir`);
      else if (plain(o.ctx) === plain(trCtx)) flags.push(`"${tr}" açıklaması "${trCtx}" ${o.en} ile aynı`);
    }
    draftTr.set(key, [...(draftTr.get(key) ?? []), { en, ctx: trCtx }]);
    if (base !== undefined && base !== '' && !/^[^/]+\/[^/]+$/.test(base)) flags.push(`temel biçim "en/tr" olmalı: ${base}`);

    const other = secondFor(en);
    const mine = [tr, ...(alts ? alts.split(',') : [])].map((s) => plain(s.trim()));
    const cross = other ? { tr: other, same: other.split(/[,;/]/).some((s) => mine.includes(plain(s.trim()))) } : undefined;

    let id = slug(tr);
    if (ids.has(id)) id = `${id}-${en}`;
    ids.add(id);
    entries.push({
      id,
      pos,
      level,
      topic,
      terms: {
        tr: {
          text: tr,
          ...(alts ? { alternatives: alts.split(',').map((s) => s.trim()).filter(Boolean) } : {}),
          ...(trCtx ? { context: trCtx } : {}),
          example: exTr,
        },
        en: { text: en, ...(enAlts ? { alternatives: enAlts.split(',').map((s) => s.trim()) } : {}), example: exEn },
      },
      hint: { tr: hint },
      ...(base ? { grammar: { form: 'past', base: { en: base.split('/')[0], tr: base.split('/')[1] }, note: grammarNote ?? '' } } : {}),
      reviewed: false,
      draft: { group, by: 'claude', flags, ...(tr.length > MAX_ANSWER ? { oneWay: true } : {}), ...(cross ? { cross } : {}) },
    });
  }
}

writeFileSync(join(dir, 'taslak.json'), JSON.stringify({ entries, skipped }, null, 1) + '\n');
const flagged = entries.filter((e) => e.draft.flags.length);
console.log(`${entries.length} taslak, ${skipped.length} elendi, ${flagged.length} uyarılı`);
for (const e of flagged) console.log(`  ${e.terms.en.text} → ${e.terms.tr.text}: ${e.draft.flags.join('; ')}`);
