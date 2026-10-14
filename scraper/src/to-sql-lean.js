// A leaner variant of to-sql-batches.js for the one-off initial load.
//
// Anything the database can derive is derived there rather than shipped as a
// literal: media `provider`, `position` and `alt`, and translation
// `source_url`. Same end state, roughly half the SQL.
//
//   node src/to-sql-lean.js roc-properties.normalised.json out-dir [perBatch]

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const q = (v) => (v === null || v === undefined || v === '' ? 'null' : `'${String(v).replace(/'/g, "''")}'`);
const n = (v) => (v === null || v === undefined || v === '' || Number.isNaN(Number(v)) ? 'null' : Number(v));
const b = (v) => (v === null || v === undefined ? 'null' : String(Boolean(v)));

const [, , input, outDir, perBatchArg] = process.argv;
const perBatch = Number(perBatchArg) || 20;
const results = JSON.parse(readFileSync(input, 'utf8'));
mkdirSync(outDir, { recursive: true });

const files = [];
const emit = (name, sql) => {
  const file = join(outDir, name);
  writeFileSync(file, sql);
  files.push({ file, kb: (sql.length / 1024).toFixed(1) });
};

// --- properties -------------------------------------------------------------
for (let i = 0; i < results.length; i += perBatch) {
  const slice = results.slice(i, i + perBatch);
  emit(`p-${String(i / perBatch + 1).padStart(2, '0')}.sql`,
    'insert into properties (reference,transaction,parish,sublocation,price,currency,price_text,bedrooms,bathrooms,garage,built_m2,living_m2,plot_m2,terrace_m2,garden_m2,balcony_m2,garage_m2,details,source_path) values\n' +
    slice.map(({ property: p }) =>
      `(${q(p.reference)},${q(p.transaction)},${q(p.parish)},${q(p.sublocation)},${n(p.price)},'EUR',${q(p.price_text)},${n(p.bedrooms)},${n(p.bathrooms)},${b(p.garage)},${n(p.built_m2)},${n(p.living_m2)},${n(p.plot_m2)},${n(p.terrace_m2)},${n(p.garden_m2)},${n(p.balcony_m2)},${n(p.garage_m2)},${q(JSON.stringify(p.details ?? {}))},${q(p.source_path)})`,
    ).join(',\n') +
    '\non conflict (reference,transaction) do update set parish=excluded.parish,sublocation=excluded.sublocation,price=excluded.price,price_text=excluded.price_text,bedrooms=excluded.bedrooms,bathrooms=excluded.bathrooms,garage=excluded.garage,built_m2=excluded.built_m2,living_m2=excluded.living_m2,plot_m2=excluded.plot_m2,terrace_m2=excluded.terrace_m2,garden_m2=excluded.garden_m2,balcony_m2=excluded.balcony_m2,garage_m2=excluded.garage_m2,details=excluded.details,source_path=excluded.source_path,is_active=true,delisted_at=null,last_seen_at=now();\n');
}

// --- translations (source_url derived from reference + transaction + lang) ---
const trRows = results.flatMap(({ property: p, translations }) =>
  translations.map((t) => `(${q(p.reference)},${q(p.transaction)},${q(t.lang)},${q(t.title)},${q(t.description)},${q(t.property_type)})`));
for (let i = 0; i < trRows.length; i += perBatch * 2) {
  const slice = trRows.slice(i, i + perBatch * 2);
  emit(`t-${String(i / (perBatch * 2) + 1).padStart(2, '0')}.sql`,
    `insert into property_translations (property_id,lang,title,description,property_type,source_url)
select p.id, v.lang, v.title, v.descr, v.ptype,
       'https://rocpropietats.com/' || v.lang ||
       case when v.lang = 'ca' then '/propietats/' || case when v.tx='rent' then 'lloguer' else 'venda' end
            else '/properties/' || case when v.tx='rent' then 'to-rent' else 'for-sell' end end ||
       '/referencia/' || v.ref || '/'
from (values\n${slice.join(',\n')}\n) as v(ref,tx,lang,title,descr,ptype)
join properties p on p.reference = v.ref and p.transaction = v.tx
on conflict (property_id,lang) do update set title=excluded.title,description=excluded.description,property_type=excluded.property_type,source_url=excluded.source_url;\n`);
}

// --- media (provider, position and alt all derived) -------------------------
const mediaRows = results.flatMap(({ property: p, media }) =>
  media.map((m, i) => `(${q(p.reference)},${q(p.transaction)},${q(m.kind)},${q(m.url)},${i})`));
const MEDIA_PER = perBatch * 12;
for (let i = 0; i < mediaRows.length; i += MEDIA_PER) {
  const slice = mediaRows.slice(i, i + MEDIA_PER);
  emit(`m-${String(i / MEDIA_PER + 1).padStart(2, '0')}.sql`,
    `insert into property_media (property_id,kind,url,position,provider)
select p.id, v.kind, v.url, v.pos,
       case when v.url ilike '%youtube%' or v.url ilike '%youtu.be%' then 'youtube'
            when v.url ilike '%vimeo%'      then 'vimeo'
            when v.url ilike '%matterport%' then 'matterport'
            when v.url ilike '%kuula%'      then 'kuula'
            else 'self' end
from (values\n${slice.join(',\n')}\n) as v(ref,tx,kind,url,pos)
join properties p on p.reference = v.ref and p.transaction = v.tx
on conflict (property_id,url) do update set kind=excluded.kind,position=excluded.position,provider=excluded.provider;\n`);
}

// --- finalise: rebuild alt text, retire anything not seen -------------------
const seen = results.map(({ property: p }) => `(${q(p.reference)},${q(p.transaction)})`).join(',');
emit('zz-finalise.sql',
  `-- The gallery alt is "Ref. N | Type | [Sublocation, ]Parish"; rebuild it from
-- the record rather than carrying it row by row.
update property_media m
set alt = 'Ref. ' || p.reference || ' | ' || coalesce(t.property_type,'') || ' | ' ||
          coalesce(p.sublocation || ', ', '') || coalesce(p.parish,'')
from properties p
left join property_translations t on t.property_id = p.id and t.lang = 'ca'
where m.property_id = p.id and m.kind = 'image';

update properties set is_active = false, delisted_at = now()
where is_active and (reference,transaction) not in (${seen});

insert into crawl_runs (finished_at,status,listings_found,properties_upserted,media_upserted,notes)
values (now(),'success',${results.length},${results.length},${mediaRows.length},'initial load');
`);

for (const f of files) console.log(`${f.file}  ${f.kb} KB`);
console.log(`total ${files.reduce((a, f) => a + Number(f.kb), 0).toFixed(1)} KB`);
