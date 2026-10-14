// Crawls ROC's news section in every language and writes roc-news.json, which
// the site reads at build time. See web/src/lib/content.js for why the
// editorial content is files rather than database rows.
//
//   node src/scrape-news.js --out roc-news.json
//
// Each language is walked independently: ROC has not translated every article,
// so a language simply yields fewer of them rather than failing.

import { writeFile } from 'node:fs/promises';
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

  // ROC serves the Catalan title and no body for articles it has not actually
  // translated, which would otherwise be stored as a Spanish or French
  // version of the piece. Drop those so the site falls back honestly.
  let dropped = 0;
  for (const a of results) {
    const ca = a.translations.find((t) => t.lang === 'ca');
    a.translations = a.translations.filter((t) => {
      if (t.lang === 'ca') return true;
      const untranslated = !t.body_html && ca && t.title === ca.title;
      if (untranslated) dropped += 1;
      return !untranslated;
    });
  }

  const total = results.reduce((n, a) => n + a.translations.length, 0);
  logger.log(`\n${results.length} articles, ${total} translations (${dropped} untranslated dropped)`);

  await writeFile(args.out, JSON.stringify(results, null, 2));
  logger.log(`wrote ${args.out}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
