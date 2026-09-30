// ChatGPT (ya da başka bir denetçi) için grup grup CSV üretir.
// Çalıştırma: node taslak/denetim-dosyasi.mjs <grup> <çıktı.csv> [karar klasörü]
// Karar klasörü verilirse (inceleme sayfasından indirilen <id>.json dosyaları)
// kişinin zaten karar verdiği kelimeler dosyaya girmez.

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
const [group, out, decided] = [Number(process.argv[2]), process.argv[3], process.argv[4]];
const done = new Set(decided && existsSync(decided) ? readdirSync(decided).map((f) => f.replace(/\.json$/, '')) : []);
const { entries } = JSON.parse(readFileSync(join(dir, 'taslak.json'), 'utf8'));
const POS_TR = { noun: 'isim', verb: 'fiil', adjective: 'sıfat', adverb: 'zarf' };
const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const head = ['id', 'en', 'tr', 'tr_diger', 'tur', 'seviye', 'ornek_en', 'ornek_tr', 'tanim'];
const rows = entries
  .filter((e) => e.draft.group === group && !done.has(e.id))
  .map((e) => [e.id, e.terms.en.text, e.terms.tr.text, (e.terms.tr.alternatives ?? []).join(', '), POS_TR[e.pos], e.level, e.terms.en.example, e.terms.tr.example, e.hint.tr]);
// BOM: Excel'in Türkçe harfleri doğru açması için.
writeFileSync(out, '\uFEFF' + [head, ...rows].map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n');
console.log(`${rows.length} satır (${done.size} kişi kararı atlandı) → ${out}`);
