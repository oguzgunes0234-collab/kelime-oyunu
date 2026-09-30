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
