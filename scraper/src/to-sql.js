// Turns a --dry-run crawl into idempotent SQL.
//
// The scheduled job writes through the Supabase client with a service-role
// key. This exists for the initial load and for any environment where that key
// is not available: the SQL is safe to re-run and performs the same upsert and
// delist logic.
//
//   node src/to-sql.js roc-properties.json > load.sql

import { readFileSync } from 'node:fs';

const q = (v) => {
  if (v === null || v === undefined || v === '') return 'null';
  return `'${String(v).replace(/'/g, "''")}'`;
};
const n = (v) => (v === null || v === undefined || v === '' || Number.isNaN(Number(v)) ? 'null' : Number(v));
const b = (v) => (v === null || v === undefined ? 'null' : (v ? 'true' : 'false'));
const arr = (list) =>
  !list?.length ? `'{}'::text[]` : `ARRAY[${list.map(q).join(',')}]::text[]`;

const results = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const out = [];

out.push('begin;');
out.push('');

const seen = [];
for (const { property: p, translations, media } of results) {
  seen.push(`('${p.reference}','${p.transaction}')`);

  out.push(`-- ${p.reference} · ${p.parish ?? ''}`);
  out.push(`insert into properties (
  reference, transaction, parish, sublocation, price, currency, price_text,
  bedrooms, bathrooms, garage, built_m2, living_m2, plot_m2, terrace_m2,
  details, source_path, is_active, last_seen_at
) values (
  ${q(p.reference)}, ${q(p.transaction)}, ${q(p.parish)}, ${q(p.sublocation)},
  ${n(p.price)}, 'EUR', ${q(p.price_text)},
  ${n(p.bedrooms)}, ${n(p.bathrooms)}, ${b(p.garage)},
  ${n(p.built_m2)}, ${n(p.living_m2)}, ${n(p.plot_m2)}, ${n(p.terrace_m2)},
  ${q(JSON.stringify(p.details ?? {}))}::jsonb, ${q(p.source_path)}, true, now()
)
on conflict (reference, transaction) do update set
  parish = excluded.parish, sublocation = excluded.sublocation,
  price = excluded.price, price_text = excluded.price_text,
  bedrooms = excluded.bedrooms, bathrooms = excluded.bathrooms, garage = excluded.garage,
  built_m2 = excluded.built_m2, living_m2 = excluded.living_m2,
  plot_m2 = excluded.plot_m2, terrace_m2 = excluded.terrace_m2,
  details = excluded.details, source_path = excluded.source_path,
  is_active = true, delisted_at = null, last_seen_at = now();`);

  for (const t of translations) {
    out.push(`insert into property_translations (property_id, lang, title, description, property_type, features, source_url)
select id, ${q(t.lang)}, ${q(t.title)}, ${q(t.description)}, ${q(t.property_type)}, ${arr(t.features)}, ${q(t.source_url)}
from properties where reference = ${q(p.reference)} and transaction = ${q(p.transaction)}
on conflict (property_id, lang) do update set
  title = excluded.title, description = excluded.description,
  property_type = excluded.property_type, features = excluded.features,
  source_url = excluded.source_url;`);
  }

  media.forEach((m, i) => {
    out.push(`insert into property_media (property_id, kind, url, provider, position, alt)
select id, ${q(m.kind)}, ${q(m.url)}, ${q(m.provider)}, ${i}, ${q(m.alt)}
from properties where reference = ${q(p.reference)} and transaction = ${q(p.transaction)}
on conflict (property_id, url) do update set
  kind = excluded.kind, provider = excluded.provider, position = excluded.position, alt = excluded.alt;`);
  });

  // Media the source dropped should not linger in the feed.
  const urls = media.map((m) => q(m.url)).join(',');
  if (urls) {
    out.push(`delete from property_media m using properties p
where m.property_id = p.id and p.reference = ${q(p.reference)}
  and p.transaction = ${q(p.transaction)} and m.url not in (${urls});`);
  }
  out.push('');
}

if (seen.length) {
  out.push('-- Anything absent from this crawl is no longer listed.');
  out.push(`update properties set is_active = false, delisted_at = now()
where is_active and (reference, transaction) not in (${seen.join(',')});`);
  out.push('');
}

out.push(`insert into crawl_runs (finished_at, status, listings_found, properties_upserted, media_upserted, notes)
values (now(), 'success', ${results.length}, ${results.length},
        ${results.reduce((a, r) => a + r.media.length, 0)}, 'loaded from to-sql.js');`);
out.push('commit;');

process.stdout.write(out.join('\n') + '\n');
