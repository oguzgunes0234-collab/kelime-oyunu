// Taslakları oyunun paketine ekler. Tekrar çalıştırılabilir: önce paketteki
// taslak kökenli girdileri siler, sonra güncel kararlara göre yeniden ekler.
//
// Kural:
//   1. Kişinin kararı her zaman önce gelir (inceleme sayfası, "kararlar"):
//      onay/düzeltme → reviewed: true, check: "human"; çıkar → eklenmez.
//   2. Karar yoksa: ikinci kaynağın çevirisi aynıysa check: "crosscheck" ile
//      eklenir (reviewed: false; örnek ve tanımı kişi okumadı). Farklıysa ya da
//      ikinci kaynakta yoksa beklemede kalır; --toplu=1,2 verilirse o gruplar
//      için (oyun sahibi tek tek okumadan onayladı) check: "bulk" ile eklenir.
//   3. Paket kurallarına uymayan girdi eklenmez, rapor edilir.
//
// Çalıştırma: node taslak/pakete-ekle.mjs <karar klasörü> [--toplu=1,2]
//   (karar klasörü: inceleme sayfasından indirilen <id>.json dosyaları)

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
const packPath = join(dir, '../src/data/pack-tr-en.json');
const pack = JSON.parse(readFileSync(packPath, 'utf8'));
const { entries: drafts } = JSON.parse(readFileSync(join(dir, 'taslak.json'), 'utf8'));
const decDir = process.argv[2];
const bulkArg = process.argv.find((a) => a.startsWith('--toplu='));
const bulkGroups = new Set(bulkArg ? bulkArg.slice('--toplu='.length).split(',').map(Number) : []);
const decisions = {};
if (decDir && existsSync(decDir)) {
  for (const f of readdirSync(decDir).filter((f) => f.endsWith('.json'))) {
    decisions[f.replace(/\.json$/, '')] = JSON.parse(readFileSync(join(decDir, f), 'utf8'));
  }
}

const MAX_LEN = 10; // paket doğrulaması (core/pack.ts)
const lower = (s) => s.normalize('NFC').trim().toLocaleLowerCase('tr');
const words = (s) => new Set(lower(s).split(/[^\p{L}]+/u).filter(Boolean));
const plainTr = (s) => s.replace(/â/g, 'a').replace(/Â/g, 'A').replace(/î/g, 'i').replace(/û/g, 'u');
const split = (s) => (s ?? '').split(',').map((x) => x.trim()).filter(Boolean);

// Taban: elle yazılmış girdiler. Önceki çalıştırmada eklenenler (check alanı olanlar) silinir.
const base = pack.entries.filter((e) => !e.check);

/**
 * Aynı Türkçe kelime birden çok kayıtta ancak hepsinde farklı bir ayırt edici
 * açıklama (terms.tr.context) varsa kabul edilir: "ay (takvim)" / "ay (gökyüzü)".
 */
function trClash(tr, ctx, others) {
  const same = others.filter((o) => lower(o.terms.tr.text) === lower(tr));
  if (!same.length) return null;
  if (!ctx) return `Türkçe karşılık pakette zaten var (${same[0].terms.en.text}); ayırt edici açıklama yok`;
  const bad = same.find((o) => !o.terms.tr.context || lower(o.terms.tr.context) === lower(ctx));
  return bad ? `"${tr}" ${bad.terms.en.text} ile ayırt edilemiyor` : null;
}

const added = [];
const report = { human: 0, crosscheck: 0, bulk: 0, dropped: 0, waiting: 0, rejected: [] };
for (const d of drafts) {
  const dec = decisions[d.id];
  let check;
  if (dec?.s === 'drop') { report.dropped++; continue; }
  if (dec?.s === 'ok' || dec?.s === 'edit') check = 'human';
  else if (d.draft.cross?.same) check = 'crosscheck';
  else if (bulkGroups.has(d.draft.group)) check = 'bulk';
  else { report.waiting++; continue; }

  const e = dec?.e ?? {};
  let tr = e.tr ?? d.terms.tr.text;
  let trAlts = e.alts !== undefined ? split(e.alts) : [...(d.terms.tr.alternatives ?? [])];
  // Çok uzun ana cevap: sığan bir alternatif varsa onu ana cevap yap.
  if (Array.from(tr).length > MAX_LEN) {
    const fit = trAlts.find((a) => /^\p{L}+$/u.test(a) && Array.from(a).length <= MAX_LEN);
    if (!fit) { report.rejected.push(`${d.terms.en.text} → ${tr}: Türkçesi ${Array.from(tr).length} harf`); continue; }
    trAlts = [tr, ...trAlts.filter((a) => a !== fit)];
    tr = fit;
  }
  // Şapkalı harf ızgarada yazılamaz; şapkasız yazımı alternatif olarak ekle.
  if (plainTr(tr) !== tr && !trAlts.some((a) => lower(a) === lower(plainTr(tr)))) trAlts.push(plainTr(tr));
  trAlts = trAlts.filter((a, i) => lower(a) !== lower(tr) && trAlts.findIndex((b) => lower(b) === lower(a)) === i);

  const hint = e.hint ?? d.hint.tr;
  const en = d.terms.en;
  const hw = words(hint);
  const leak = [tr, ...trAlts, en.text].find((w) => hw.has(lower(w)));
  if (leak) { report.rejected.push(`${en.text} → ${tr}: tanımda "${leak}" geçiyor`); continue; }
  const g = d.grammar;
  // Çekimli biçimde açıklama dilbilgisidir: "geçmiş zaman · gitmek".
  const trCtx = g ? `geçmiş zaman · ${g.base.tr}` : d.terms.tr.context;
  const clash = trClash(tr, trCtx, [...base, ...added]);
  if (clash) { report.rejected.push(`${en.text} → ${tr}: ${clash}`); continue; }

  added.push({
    id: d.id,
    pos: d.pos,
    level: e.level ?? d.level,
    topic: d.topic,
    terms: {
      tr: { text: tr, ...(trAlts.length ? { alternatives: trAlts } : {}), ...(trCtx ? { context: trCtx } : {}), example: e.exTr ?? d.terms.tr.example },
      en: {
        text: en.text,
        ...(en.alternatives?.length ? { alternatives: en.alternatives } : {}),
        ...(g ? { context: `geçmiş zaman · ${g.base.en}` } : {}),
        example: e.exEn ?? en.example,
      },
    },
    hint: { tr: hint },
    ...(g ? { grammar: g } : {}),
    reviewed: check === 'human',
    check,
  });
  report[check]++;
}

pack.entries = [...base, ...added];
writeFileSync(packPath, JSON.stringify(pack, null, 1) + '\n');
console.log(`Pakete eklenen: ${added.length} (kişi onayı ${report.human}, iki kaynak uyuştu ${report.crosscheck}, toplu onay ${report.bulk})`);
console.log(`Çıkarılan: ${report.dropped} · Bekleyen: ${report.waiting} · Kurala takılan: ${report.rejected.length}`);
for (const r of report.rejected) console.log('  ' + r);
console.log(`Paket toplamı: ${pack.entries.length}`);
