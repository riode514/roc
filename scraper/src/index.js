// ROC Propietats ingest.
//
//   node src/index.js                    full crawl, writes to Supabase
//   node src/index.js --dry-run          crawl, write JSON to disk only
//   node src/index.js --refs 3268,3558   crawl just these references
//   node src/index.js --out data.json    where --dry-run writes
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ROC_CRAWL_DELAY_MS, ROC_LANGS

import { writeFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import { Fetcher } from './fetcher.js';
import { parseDetailPage, parseListingPage } from './parse.js';
import { PATHS, detailPath } from './site.js';

const TRANSACTIONS = ['sale', 'rent'];
const PRIMARY_LANG = 'ca'; // source of truth for numbers, parish, media

function parseArgs(argv) {
  const args = { dryRun: false, refs: null, out: 'roc-properties.json' };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--dry-run') args.dryRun = true;
    else if (a === '--refs') args.refs = argv[++i].split(',').map((s) => s.trim()).filter(Boolean);
    else if (a === '--out') args.out = argv[++i];
  }
  return args;
}

/**
 * Walks the paginated index for one transaction and returns every reference.
 *
 * Every page — including the first — is requested with the same explicit
 * `ordenar` value. Mixing the default ordering on page 1 with a sorted page 2
 * makes the two views disagree, so listings get duplicated and missed.
 */
async function collectReferences(fetcher, transaction, logger, ordenar = 'preu-asc') {
  const path = PATHS[PRIMARY_LANG][transaction];
  const seen = [];
  const add = (refs) => { for (const r of refs) if (!seen.includes(r)) seen.push(r); };

  const page1 = await fetcher.postForm(path, {
    'immobiliaria-propietats-llistat': 'list',
    'immobiliaria-pagina': '1',
    ordenar,
  });
  const { refs, total, maxPage } = parseListingPage(page1);
  add(refs);
  logger.log(`[${transaction}] site reports ${total ?? '?'} properties across ${maxPage} page(s)`);

  for (let page = 2; page <= maxPage; page += 1) {
    const html = await fetcher.postForm(path, {
      'immobiliaria-propietats-llistat': 'list',
      'immobiliaria-pagina': String(page),
      ordenar,
    });
    const parsed = parseListingPage(html);
    add(parsed.refs);
    logger.log(`[${transaction}] page ${page}/${maxPage}: ${parsed.refs.length} refs, ${seen.length} unique so far`);
  }

  // A sorted walk should be complete. If the site still reports more than we
  // collected, sweep again in the opposite order to pick up the stragglers
  // rather than silently publishing a short feed.
  if (total != null && seen.length < total && ordenar === 'preu-asc') {
    logger.warn(`[${transaction}] collected ${seen.length}/${total}; sweeping again by preu-desc`);
    const second = await collectReferences(fetcher, transaction, logger, 'preu-desc');
    add(second.refs);
  }

  if (total != null && seen.length !== total) {
    logger.warn(`[${transaction}] WARNING: collected ${seen.length} references but site reports ${total}`);
  }
  return { refs: seen, total };
}

async function scrapeProperty(fetcher, { reference, transaction, langs, logger }) {
  const byLang = {};
  for (const lang of langs) {
    const path = detailPath(lang, transaction, reference);
    try {
      const html = await fetcher.get(path);
      byLang[lang] = parseDetailPage(html, { lang, transaction, reference, url: path });
    } catch (err) {
      logger.warn(`  ${reference} [${lang}] failed: ${err.message}`);
    }
  }

  const primary = byLang[PRIMARY_LANG] ?? Object.values(byLang)[0];
  if (!primary) return null;

  return {
    property: primary.property,
    translations: Object.values(byLang).map((r) => r.translation),
    media: primary.media,
  };
}

async function upsert(supabase, results, logger) {
  let properties = 0;
  let media = 0;
  const errors = [];

  for (const result of results) {
    const { property, translations, media: mediaRows } = result;
    const now = new Date().toISOString();

    const { data: row, error } = await supabase
      .from('properties')
      .upsert({ ...property, is_active: true, delisted_at: null, last_seen_at: now },
              { onConflict: 'reference,transaction' })
      .select('id')
      .single();

    if (error) {
      errors.push({ reference: property.reference, stage: 'property', message: error.message });
      logger.warn(`  upsert failed for ${property.reference}: ${error.message}`);
      continue;
    }
    properties += 1;

    const { error: tErr } = await supabase
      .from('property_translations')
      .upsert(translations.map((t) => ({ ...t, property_id: row.id })),
              { onConflict: 'property_id,lang' });
    if (tErr) errors.push({ reference: property.reference, stage: 'translations', message: tErr.message });

    if (mediaRows.length) {
      const { error: mErr } = await supabase
        .from('property_media')
        .upsert(mediaRows.map((m) => ({ ...m, property_id: row.id })),
                { onConflict: 'property_id,url' });
      if (mErr) errors.push({ reference: property.reference, stage: 'media', message: mErr.message });
      else media += mediaRows.length;

      // Drop media the source no longer lists.
      const keep = mediaRows.map((m) => m.url);
      await supabase.from('property_media').delete()
        .eq('property_id', row.id)
        .not('url', 'in', `(${keep.map((u) => `"${u}"`).join(',')})`);
    }
  }

  return { properties, media, errors };
}

/** Anything we did not see in this run is no longer listed. */
async function markDelisted(supabase, seenKeys, logger) {
  const { data: all, error } = await supabase
    .from('properties').select('id, reference, transaction').eq('is_active', true);
  if (error) { logger.warn(`delist check failed: ${error.message}`); return 0; }

  const stale = (all ?? []).filter((p) => !seenKeys.has(`${p.transaction}:${p.reference}`));
  if (!stale.length) return 0;

  const { error: uErr } = await supabase
    .from('properties')
    .update({ is_active: false, delisted_at: new Date().toISOString() })
    .in('id', stale.map((p) => p.id));
  if (uErr) { logger.warn(`delist update failed: ${uErr.message}`); return 0; }

  logger.log(`delisted ${stale.length}: ${stale.map((p) => p.reference).join(', ')}`);
  return stale.length;
}

async function main() {
  const args = parseArgs(process.argv);
  const logger = console;
  const langs = (process.env.ROC_LANGS ?? 'ca,en').split(',').map((s) => s.trim()).filter(Boolean);

  const fetcher = new Fetcher({ logger });
  logger.log(`crawl delay ${fetcher.delayMs}ms · languages ${langs.join(', ')}${args.dryRun ? ' · DRY RUN' : ''}`);

  let supabase = null;
  let runId = null;
  if (!args.dryRun) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required (or pass --dry-run)');
    supabase = createClient(url, key, { auth: { persistSession: false } });
    const { data } = await supabase.from('crawl_runs').insert({}).select('id').single();
    runId = data?.id ?? null;
  }

  const results = [];
  const errors = [];
  const seenKeys = new Set();
  let listingsFound = 0;

  try {
    for (const transaction of TRANSACTIONS) {
      let refs;
      if (args.refs) {
        refs = args.refs;
      } else {
        const collected = await collectReferences(fetcher, transaction, logger);
        refs = collected.refs;
      }
      listingsFound += refs.length;

      for (const [i, reference] of refs.entries()) {
        logger.log(`[${transaction}] ${i + 1}/${refs.length} ref ${reference}`);
        try {
          const result = await scrapeProperty(fetcher, { reference, transaction, langs, logger });
          if (result) {
            results.push(result);
            seenKeys.add(`${transaction}:${reference}`);
          } else {
            errors.push({ reference, transaction, message: 'no parseable language' });
          }
        } catch (err) {
          errors.push({ reference, transaction, message: err.message });
          logger.warn(`  ${reference} failed: ${err.message}`);
        }
      }
      if (args.refs) break; // explicit refs are not per-transaction
    }

    if (args.dryRun) {
      await writeFile(args.out, JSON.stringify(results, null, 2));
      logger.log(`\nwrote ${results.length} properties to ${args.out}`);
    } else {
      const { properties, media, errors: upsertErrors } = await upsert(supabase, results, logger);
      errors.push(...upsertErrors);
      const delisted = args.refs ? 0 : await markDelisted(supabase, seenKeys, logger);
      await supabase.from('crawl_runs').update({
        finished_at: new Date().toISOString(),
        status: errors.length ? 'partial' : 'success',
        listings_found: listingsFound,
        properties_upserted: properties,
        media_upserted: media,
        delisted,
        errors,
      }).eq('id', runId);
      logger.log(`\nupserted ${properties} properties, ${media} media rows, delisted ${delisted}, ${errors.length} error(s)`);
    }
  } catch (err) {
    if (supabase && runId) {
      await supabase.from('crawl_runs').update({
        finished_at: new Date().toISOString(), status: 'failed',
        errors: [...errors, { message: err.message }],
      }).eq('id', runId);
    }
    throw err;
  }

  logger.log(`${fetcher.requestCount} requests made`);
  if (errors.length) process.exitCode = 1;
}

main().catch((err) => { console.error(err); process.exit(1); });
