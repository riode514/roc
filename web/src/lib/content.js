// News, the standing pages and the parish profiles — the editorial side of
// the site, as against the listings.
//
// All three are files in the repo rather than database rows. The listings earn
// their place in Supabase: 76 of them, filtered, served as a JSON API, and
// re-checked nightly for ones that have sold. The editorial content is none of
// those things — 29 articles in four years, four legal pages, seven parish
// profiles, all static once written. Keeping them as files makes them
// versioned and diffable, and the scheduled crawl commits any change rather
// than writing to a table nothing else reads.

import { readFileSync } from 'node:fs';
import { DEFAULT_LOCALE, INTL_LOCALE, localeBase } from './i18n.js';

// --- news -------------------------------------------------------------------

let newsCache = null;

export async function getNews() {
  if (!newsCache) {
    const url = new URL('../../../scraper/roc-news.json', import.meta.url);
    newsCache = JSON.parse(readFileSync(url, 'utf8'))
      .map(toRow)
      .sort((a, b) => String(b.published_on).localeCompare(String(a.published_on)));
  }
  return newsCache;
}

/** The crawl writes an array of translations; the templates want them keyed. */
function toRow(a) {
  const translations = {};
  for (const t of a.translations ?? []) translations[t.lang] = t;
  return normaliseArticle({ ...a, translations });
}

function normaliseArticle(row) {
  return {
    ...row,
    // One slug for every language keeps the article reachable at the same
    // path when a reader switches language mid-read.
    slug: String(row.external_id),
    t(lang) {
      const tr = row.translations ?? {};
      const order = [lang, DEFAULT_LOCALE, 'ca', 'es', 'fr'];
      const pick = (field) => {
        for (const l of order) {
          const v = tr[l]?.[field];
          if (v != null && v !== '') return v;
        }
        return null;
      };
      return {
        title: pick('title'),
        excerpt: pick('excerpt'),
        body_html: pick('body_html'),
        category: pick('category'),
        source_url: tr[lang]?.source_url ?? pick('source_url'),
        // True when this language has nothing of its own to show.
        translated: Boolean(tr[lang]?.body_html || tr[lang]?.title),
      };
    },
  };
}

export function newsUrl(article, lang) {
  return `${localeBase(lang)}/news/${article.slug}/`;
}

export function formatDate(value, lang = 'en') {
  if (!value) return null;
  return new Intl.DateTimeFormat(INTL_LOCALE[lang] ?? 'en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date(value));
}

// --- standing pages ---------------------------------------------------------

let pagesCache = null;

function allPages() {
  if (pagesCache) return pagesCache;
  const url = new URL('../../../scraper/roc-pages.json', import.meta.url);
  pagesCache = JSON.parse(readFileSync(url, 'utf8'));
  return pagesCache;
}

/** One page in one language, falling back to English then Catalan. */
export function getPage(key, lang) {
  const pages = allPages();
  for (const l of [lang, DEFAULT_LOCALE, 'ca']) {
    const found = pages.find((p) => p.key === key && p.lang === l);
    if (found && (found.blocks?.length || found.bodyHtml)) {
      return { ...found, translated: l === lang };
    }
  }
  return null;
}

// --- parish profiles --------------------------------------------------------
//
// Written for us rather than scraped: short editorial profiles of the seven
// parishes, in all four languages. They replace the one-line notes that were
// here before, which still referred to the Vallnord ski brand — retired when
// Pal Arinsal folded into Grandvalira Resorts.

let parishCache = null;

export function getParishProfiles() {
  if (parishCache) return parishCache;
  const url = new URL('../../../scraper/roc-parishes.json', import.meta.url);
  parishCache = JSON.parse(readFileSync(url, 'utf8'));
  return parishCache;
}

/** One parish in one language, falling back to English. */
export function getParish(name, lang) {
  const all = getParishProfiles();
  const entry = all[name];
  if (!entry) return null;
  return entry[lang] ?? entry[DEFAULT_LOCALE] ?? null;
}

/** URL-safe slug for a parish name, e.g. "Sant Julià de Lòria" -> sant-julia-de-loria */
export function parishSlug(name) {
  return String(name)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function parishUrl(name, lang) {
  return `${localeBase(lang)}/locations/${parishSlug(name)}/`;
}
