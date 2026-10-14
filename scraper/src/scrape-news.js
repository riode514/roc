// Crawls ROC's news section in every language.
//
//   node src/scrape-news.js --dry-run --out news.json
//   node src/scrape-news.js                      (upserts, needs the service key)
//
// Each language is walked independently: ROC has not translated every article,
// so a language simply yields fewer of them rather than failing.

import { writeFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import { Fetcher } from './fetcher.js';
import { NEWS_PATHS, excerptFrom, parseArticle, parseNewsIndex } from './news.js';
import { absoluteUrl } from './site.js';

function parseArgs(argv) {
  const args = { dryRun: false, out: 'roc-news.json', langs: null };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === '--dry-run') args.dryRun = true;
    else if (argv[i] === '--out') args.out = argv[++i];
    else if (argv[i] === '--langs') args.langs = argv[++i].split(',').map((s) => s.trim());
  }
  return args;
}

async function collectIndex(fetcher, lang, logger) {
  const path = NEWS_PATHS[lang];
  const first = await fetcher.get(path);
  const { cards, maxPage } = parseNewsIndex(first, lang);
  const byId = new Map(cards.map((c) => [c.externalId, c]));
  logger.log(`[${lang}] ${maxPage} page(s)`);

  for (let page = 2; page <= maxPage; page += 1) {
    const html = await fetcher.get(`${path}?pagina=${page}`);
    for (const c of parseNewsIndex(html, lang).cards) {
      if (!byId.has(c.externalId)) byId.set(c.externalId, c);
    }
    logger.log(`[${lang}] page ${page}/${maxPage}: ${byId.size} articles so far`);
  }
  return [...byId.values()];
}

async function main() {
  const args = parseArgs(process.argv);
  const logger = console;
  const langs = args.langs ?? (process.env.ROC_LANGS ?? 'ca,en,es,fr').split(',');
  const fetcher = new Fetcher({ logger });
  logger.log(`crawl delay ${fetcher.delayMs}ms · languages ${langs.join(', ')}${args.dryRun ? ' · DRY RUN' : ''}`);

  // id -> { meta, translations per language }
  const articles = new Map();

  for (const lang of langs) {
    let cards;
    try {
      cards = await collectIndex(fetcher, lang, logger);
    } catch (err) {
      logger.warn(`[${lang}] index failed: ${err.message}`);
      continue;
    }

    for (const [i, card] of cards.entries()) {
      logger.log(`[${lang}] ${i + 1}/${cards.length} #${card.externalId} ${card.title ?? ''}`.slice(0, 110));
      let article;
      try {
        const html = await fetcher.get(card.path);
        article = parseArticle(html, { lang, path: card.path });
      } catch (err) {
        logger.warn(`  #${card.externalId} [${lang}] failed: ${err.message}`);
        continue;
      }

      const entry = articles.get(card.externalId) ?? {
        external_id: card.externalId,
        category_slug: null,
        published_on: card.publishedOn,
        cover_url: null,
        source_path: null,
        translations: [],
      };

      // Catalan is the source of truth for the shared fields.
      if (lang === 'ca' || !entry.source_path) {
        entry.category_slug = card.categorySlug ?? entry.category_slug;
        entry.published_on = card.publishedOn ?? entry.published_on;
        entry.cover_url = absoluteUrl(article.cover ?? card.cover) ?? entry.cover_url;
        entry.source_path = card.path;
      }

      entry.translations.push({
        lang,
        title: article.title ?? card.title,
        slug: card.slug,
        excerpt: card.excerpt ?? excerptFrom(article.bodyHtml),
        body_html: article.bodyHtml,
        category: article.category ?? card.category,
        source_url: absoluteUrl(card.path),
      });

      articles.set(card.externalId, entry);
    }
  }

  const results = [...articles.values()].sort((a, b) => b.external_id - a.external_id);
  logger.log(`\n${results.length} articles, ${results.reduce((n, a) => n + a.translations.length, 0)} translations`);

  if (args.dryRun) {
    await writeFile(args.out, JSON.stringify(results, null, 2));
    logger.log(`wrote ${args.out}`);
    return;
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required (or pass --dry-run)');
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const seen = [];
  for (const a of results) {
    const { translations, ...row } = a;
    const { data, error } = await supabase
      .from('news_articles')
      .upsert({ ...row, is_active: true, delisted_at: null, last_seen_at: new Date().toISOString() },
              { onConflict: 'external_id' })
      .select('id')
      .single();
    if (error) { logger.warn(`#${a.external_id}: ${error.message}`); continue; }
    seen.push(a.external_id);
    const { error: tErr } = await supabase
      .from('news_translations')
      .upsert(translations.map((t) => ({ ...t, article_id: data.id })), { onConflict: 'article_id,lang' });
    if (tErr) logger.warn(`#${a.external_id} translations: ${tErr.message}`);
  }

  if (seen.length) {
    await supabase.from('news_articles')
      .update({ is_active: false, delisted_at: new Date().toISOString() })
      .not('external_id', 'in', `(${seen.join(',')})`);
  }
  logger.log(`upserted ${seen.length} articles`);
}

main().catch((err) => { console.error(err); process.exit(1); });
