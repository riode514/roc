// News and the standing pages.
//
// News is a feed that keeps changing, so it lives in Supabase alongside the
// listings. The about and legal pages are standing text that changes once in
// a blue moon, so they are a file in the repo — versioned, diffable, and one
// less round trip at build time.

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { DEFAULT_LOCALE, INTL_LOCALE, localeBase } from './i18n.js';

const SUPABASE_URL = process.env.SUPABASE_URL ?? import.meta.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.SUPABASE_PUBLISHABLE_KEY;

// --- news -------------------------------------------------------------------

export async function getNews() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY must be set to build the site');
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
  const { data, error } = await supabase
    .from('news_feed')
    .select('*')
    .order('published_on', { ascending: false });

  if (error) throw new Error(`Supabase: ${error.message}`);
  return (data ?? []).map(normaliseArticle);
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
