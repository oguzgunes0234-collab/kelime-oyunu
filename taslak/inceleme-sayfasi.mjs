// taslak/taslak.json'dan telefonda kullanılacak inceleme sayfasını üretir.
// Kararlar sayfanın veritabanında ("kararlar" koleksiyonu) tutulur; Claude
// oradan okuyup onaylananları pakete ekler.
//
// Çalıştırma: node taslak/inceleme-sayfasi.mjs <çıktı.html>

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
const out = process.argv[2];
if (!out) throw new Error('Çıktı dosyası verilmedi');
const { entries, skipped } = JSON.parse(readFileSync(join(dir, 'taslak.json'), 'utf8'));
const pack = JSON.parse(readFileSync(join(dir, '../src/data/pack-tr-en.json'), 'utf8'));
const inGame = new Map(pack.entries.filter((e) => e.check).map((e) => [e.id, e.check]));

// "Önce bunlara bak": oyunda olan, insanın görmediği A1–A2 kelimelerinde doğruluk riski.
// Kısa örnek tek başına sebep sayılmaz (kısa cümle artık ipucu olarak kullanılmıyor), ek not olur.
const low = (s) => s.toLocaleLowerCase('tr');
const wc = (s) => (s || '').split(/\s+/).filter((w) => /\p{L}/u.test(w)).length;
const formsOf = (e) => new Set(Object.values(e.terms).flatMap((x) => [x.text, ...(x.alternatives ?? [])].map(low)));
const packById = new Map(pack.entries.map((e) => [e.id, e]));
function suspicion(d) {
  const g = packById.get(d.id);
  if (!g || !g.check || g.check === 'human' || !['A1', 'A2'].includes(g.level)) return [];
  const r = [];
  if (d.draft.cross && !d.draft.cross.same) r.push(`Çeviri ikinci kaynaktan farklı (orada: ${d.draft.cross.tr})`);
  if (!d.draft.cross) r.push('Çeviri hiçbir kaynakla doğrulanmadı');
  const own = formsOf(g);
  const clash = pack.entries.find(
    (o) => o.id !== g.id && !(o.terms.tr.context && g.terms.tr.context) && [...formsOf(o)].some((f) => own.has(f)),
  );
  if (clash) r.push(`Başka kelimeyle karışabilir: ${clash.terms.en.text} → ${clash.terms.tr.text}`);
  if ((g.hint?.tr ?? '').length < 20) r.push('Tanım çok kısa ya da belirsiz');
  if (r.length && wc(g.terms.en.example) < 5) r.push('Örnek cümle kısa');
  return r;
}

const data = entries.map((e) => ({
  id: e.id,
  g: e.draft.group,
  en: e.terms.en.text,
  tr: e.terms.tr.text,
  alts: (e.terms.tr.alternatives ?? []).join(', '),
  pos: e.pos,
  level: e.level,
  topic: e.topic,
  exEn: e.terms.en.example ?? '',
  exTr: e.terms.tr.example ?? '',
  hint: e.hint?.tr ?? '',
  flags: e.draft.flags,
  oneWay: !!e.draft.oneWay,
  cross: e.draft.cross ?? null,
  game: inGame.get(e.id) ?? null,
  ctx: e.terms.tr.context ?? '',
  suspect: suspicion(e),
  grammar: e.grammar ? `${e.grammar.note} · temel hâl: ${e.grammar.base.en} / ${e.grammar.base.tr}` : '',
}));
const groups = [...new Set(data.map((d) => d.g))];

const json = (v) => JSON.stringify(v).replace(/</g, '\\u003c');
const template = readFileSync(join(dir, 'inceleme.html'), 'utf8');
const html = template
  .replace('/*TASLAK*/[]', json(data))
  .replace('/*ELENEN*/[]', json(skipped))
  .replace('/*GRUPLAR*/', groups.join(', '));
writeFileSync(out, html);
console.log(`${data.length} taslak, ${skipped.length} elenen → ${out}`);
