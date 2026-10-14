// Splits a --dry-run crawl into compact SQL batches.
//
// `to-sql.js` emits one verbose, fully idempotent script. This emits the same
// data as a handful of small files, for loading through a SQL console (or the
// Supabase MCP) when no service-role key is to hand.
//
//   node src/to-sql-batches.js roc-properties.json out-dir [perBatch]

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const q = (v) => (v === null || v === undefined || v === '' ? 'null' : `'${String(v).replace(/'/g, "''")}'`);
const n = (v) => (v === null || v === undefined || v === '' || Number.isNaN(Number(v)) ? 'null' : Number(v));
const b = (v) => (v === null || v === undefined ? 'null' : String(Boolean(v)));
const arr = (l) => (!l?.length ? `'{}'` : `ARRAY[${l.map(q).join(',')}]::text[]`);

const [, , input, outDir, perBatchArg] = process.argv;
const perBatch = Number(perBatchArg) || 10;
const results = JSON.parse(readFileSync(input, 'utf8'));
mkdirSync(outDir, { recursive: true });

const files = [];
for (let i = 0; i < results.length; i += perBatch) {
  const slice = results.slice(i, i + perBatch);
  const lines = [];

  lines.push('insert into properties (reference,transaction,parish,sublocation,price,currency,price_text,bedrooms,bathrooms,garage,built_m2,living_m2,plot_m2,terrace_m2,garden_m2,balcony_m2,garage_m2,details,source_path) values');
  lines.push(slice.map(({ property: p }) =>
    `(${q(p.reference)},${q(p.transaction)},${q(p.parish)},${q(p.sublocation)},${n(p.price)},'EUR',${q(p.price_text)},${n(p.bedrooms)},${n(p.bathrooms)},${b(p.garage)},${n(p.built_m2)},${n(p.living_m2)},${n(p.plot_m2)},${n(p.terrace_m2)},${n(p.garden_m2)},${n(p.balcony_m2)},${n(p.garage_m2)},${q(JSON.stringify(p.details ?? {}))},${q(p.source_path)})`,
  ).join(',\n'));
  lines.push(`on conflict (reference,transaction) do update set parish=excluded.parish,sublocation=excluded.sublocation,price=excluded.price,price_text=excluded.price_text,bedrooms=excluded.bedrooms,bathrooms=excluded.bathrooms,garage=excluded.garage,built_m2=excluded.built_m2,living_m2=excluded.living_m2,plot_m2=excluded.plot_m2,terrace_m2=excluded.terrace_m2,garden_m2=excluded.garden_m2,balcony_m2=excluded.balcony_m2,garage_m2=excluded.garage_m2,details=excluded.details,source_path=excluded.source_path,is_active=true,delisted_at=null,last_seen_at=now();`);
  lines.push('');

  const trRows = slice.flatMap(({ property: p, translations }) =>
    translations.map((t) =>
      `(${q(p.reference)},${q(p.transaction)},${q(t.lang)},${q(t.title)},${q(t.description)},${q(t.property_type)},${arr(t.features)},${q(t.source_url)})`));
  if (trRows.length) {
    lines.push('insert into property_translations (property_id,lang,title,description,property_type,features,source_url)');
    lines.push('select p.id,v.lang,v.title,v.descr,v.ptype,v.feat,v.src from (values');
    lines.push(trRows.join(',\n'));
    lines.push(') as v(ref,tx,lang,title,descr,ptype,feat,src) join properties p on p.reference=v.ref and p.transaction=v.tx');
    lines.push('on conflict (property_id,lang) do update set title=excluded.title,description=excluded.description,property_type=excluded.property_type,features=excluded.features,source_url=excluded.source_url;');
    lines.push('');
  }

  const mRows = slice.flatMap(({ property: p, media }) =>
    media.map((m, idx) =>
      `(${q(p.reference)},${q(p.transaction)},${q(m.kind)},${q(m.url)},${q(m.provider)},${idx},${q(m.alt)})`));
  if (mRows.length) {
    lines.push('insert into property_media (property_id,kind,url,provider,position,alt)');
    lines.push('select p.id,v.kind,v.url,v.provider,v.pos,v.alt from (values');
    lines.push(mRows.join(',\n'));
    lines.push(') as v(ref,tx,kind,url,provider,pos,alt) join properties p on p.reference=v.ref and p.transaction=v.tx');
    lines.push('on conflict (property_id,url) do update set kind=excluded.kind,provider=excluded.provider,position=excluded.position,alt=excluded.alt;');
  }

  const file = join(outDir, `batch-${String(files.length + 1).padStart(2, '0')}.sql`);
  writeFileSync(file, lines.join('\n') + '\n');
  files.push({ file, properties: slice.length, media: mRows.length, bytes: lines.join('\n').length });
}

// Final batch: retire anything the crawl did not see.
const seen = results.map(({ property: p }) => `(${q(p.reference)},${q(p.transaction)})`).join(',');
const finalFile = join(outDir, 'batch-zz-finalise.sql');
writeFileSync(finalFile,
  `update properties set is_active=false, delisted_at=now()\nwhere is_active and (reference,transaction) not in (${seen});\n` +
  `insert into crawl_runs (finished_at,status,listings_found,properties_upserted,media_upserted,notes)\n` +
  `values (now(),'success',${results.length},${results.length},${results.reduce((a, r) => a + r.media.length, 0)},'initial load');\n`);

for (const f of files) console.log(`${f.file}  ${f.properties} properties, ${f.media} media, ${(f.bytes / 1024).toFixed(1)} KB`);
console.log(`${finalFile}  finalise`);
