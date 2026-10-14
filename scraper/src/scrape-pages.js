// Crawls ROC's standing pages (about + the three legal notices) in every
// language, discovering each translation from the page's own switcher.
//
//   node src/scrape-pages.js --out roc-pages.json

import { writeFile } from 'node:fs/promises';
import { Fetcher } from './fetcher.js';
import { PAGE_ENTRY, PAGE_KEYS, parseAlternates, parsePage } from './pages.js';

async function main() {
  const out = process.argv.includes('--out')
    ? process.argv[process.argv.indexOf('--out') + 1]
    : 'roc-pages.json';
  const logger = console;
  const fetcher = new Fetcher({ logger });
  logger.log(`crawl delay ${fetcher.delayMs}ms`);

  const results = [];

  for (const key of PAGE_KEYS) {
    const entry = PAGE_ENTRY[key];
    let html;
    try {
      html = await fetcher.get(entry);
    } catch (err) {
      logger.warn(`${key}: ${entry} failed — ${err.message}`);
      continue;
    }

    const alternates = { en: entry, ...parseAlternates(html) };
    logger.log(`${key}: ${Object.entries(alternates).map(([l, p]) => `${l}=${p}`).join(' ')}`);

    for (const [lang, path] of Object.entries(alternates)) {
      try {
        const pageHtml = lang === 'en' && path === entry ? html : await fetcher.get(path);
        const page = parsePage(pageHtml, { lang, path, key });
        results.push(page);
        logger.log(`  ${key} [${lang}] "${page.title ?? ''}" — ${page.blocks.length} blocks`);
      } catch (err) {
        logger.warn(`  ${key} [${lang}] failed: ${err.message}`);
      }
    }
  }

  await writeFile(out, JSON.stringify(results, null, 2));
  logger.log(`\nwrote ${results.length} page/language pairs to ${out}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
