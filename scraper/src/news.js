// ROC's news section.
//
// Article URLs carry a numeric id that is stable across languages:
//   /ca/noticies/{category}/{YYYY}/{MM}/{DD}/{id}/{slug}/
// Spanish and French leave the category segment empty, so the path has a
// double slash — that is their data, not a mistake here.
//
// Unlike the property listings, these pages page with a plain ?pagina=N.

import * as cheerio from 'cheerio';

export const NEWS_PATHS = {
  ca: '/ca/noticies/',
  en: '/en/news/',
  es: '/es/noticias/',
  fr: '/fr/nouvelles/',
};

const clean = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();

/** Pulls the id and date out of an article path. */
export function parseArticleUrl(path) {
  const m = /\/(\d{4})\/(\d{2})\/(\d{2})\/(\d+)\/([^/]+)\/?$/.exec(path);
  if (!m) return null;
  const [, year, month, day, id, slug] = m;
  const cat = /\/(?:noticies|news|noticias|nouvelles)\/([^/]*)\/\d{4}\//.exec(path);
  return {
    externalId: Number(id),
    publishedOn: `${year}-${month}-${day}`,
    slug,
    categorySlug: cat && cat[1] ? cat[1] : null,
  };
}

/** Article links and the page count from one listing page. */
export function parseNewsIndex(html, lang) {
  const $ = cheerio.load(html);
  const base = NEWS_PATHS[lang];
  const cards = [];
  const seen = new Set();

  $('.for_blog').each((_, el) => {
    const $el = $(el);
    const href = $el.find('a[href]').first().attr('href') || '';
    const parsed = parseArticleUrl(href);
    if (!parsed || seen.has(parsed.externalId)) return;
    seen.add(parsed.externalId);
    cards.push({
      ...parsed,
      path: href,
      title: clean($el.find('h2').first().text()),
      excerpt: clean($el.find('.tc_content > p').first().text()) || null,
      category: clean($el.find('.blog_tag').first().text()) || null,
      cover: $el.find('.thumb img').first().attr('src') || null,
    });
  });

  let maxPage = 1;
  $('.page_navigation a[href]').each((_, el) => {
    const m = /[?&]pagina=(\d+)/.exec($(el).attr('href') || '');
    if (m) maxPage = Math.max(maxPage, Number(m[1]));
  });

  // Fall back to raw links where the card markup is not what we expect.
  if (!cards.length) {
    $(`a[href^="${base}"]`).each((_, el) => {
      const href = $(el).attr('href') || '';
      const parsed = parseArticleUrl(href);
      if (parsed && !seen.has(parsed.externalId)) {
        seen.add(parsed.externalId);
        cards.push({ ...parsed, path: href, title: clean($(el).text()) || null,
                     excerpt: null, category: null, cover: null });
      }
    });
  }

  return { cards, maxPage };
}

/**
 * The article body, sanitised.
 *
 * This is third-party HTML that ends up on our pages, so it is reduced to a
 * small allowlist at ingest rather than trusted and cleaned at render time:
 * only these tags survive, and the only attribute kept is href on a link,
 * which must be http(s) — no inline handlers, styles, scripts or iframes.
 */
const ALLOWED_TAGS = new Set(['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'a',
  'ul', 'ol', 'li', 'h2', 'h3', 'h4', 'blockquote']);

export function sanitiseHtml(raw, $) {
  const $frag = $(`<div>${raw}</div>`);

  $frag.find('*').each((_, el) => {
    const tag = el.tagName?.toLowerCase();
    const $el = $(el);

    if (!ALLOWED_TAGS.has(tag)) {
      // Keep the words, drop the element — except for things that carry no
      // readable content of their own.
      if (['script', 'style', 'iframe', 'form', 'input', 'button', 'object', 'embed'].includes(tag)) {
        $el.remove();
      } else {
        $el.replaceWith($el.contents());
      }
      return;
    }

    const attrs = { ...(el.attribs ?? {}) };
    for (const name of Object.keys(attrs)) $el.removeAttr(name);

    if (tag === 'a') {
      const href = attrs.href ?? '';
      if (/^https?:\/\//i.test(href)) {
        $el.attr('href', href);
        $el.attr('rel', 'nofollow noopener');
        $el.attr('target', '_blank');
      } else {
        $el.replaceWith($el.contents());
      }
    }
  });

  let out = $frag.html() ?? '';
  out = out.replace(/ /g, ' ').replace(/(\s*<br\s*\/?>\s*){3,}/gi, '<br /><br />');
  return clean(out) || null;
}

/** Parses one article page. */
export function parseArticle(html, { lang, path }) {
  const $ = cheerio.load(html);
  const meta = parseArticleUrl(path) ?? {};

  const title = clean($('.blog_sp_title').first().text()) || null;
  const category = clean($('.blog_sp_tag').first().text()) || null;
  const cover = $('.mbp_thumb_post .thumb img').first().attr('src')
             ?? $('.main_blog_post_content img').first().attr('src') ?? null;

  // The body is the first .mb30 inside .details; the comment form lives
  // further down the same container and must not come with it.
  const $body = $('.main_blog_post_content .details .mb30').first();
  const bodyHtml = $body.length ? sanitiseHtml($body.html() ?? '', $) : null;

  // The meta row shows "Ali Tufan" and a 2020 date on every article — the
  // theme's placeholders, not real values. The date in the URL is the real one.
  return {
    ...meta,
    lang,
    path,
    title,
    category,
    cover,
    bodyHtml,
  };
}

const ENTITIES = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", apos: "'" };
const decode = (s) => String(s ?? '')
  .replace(/&(nbsp|amp|lt|gt|quot|apos|#39);/g, (_, e) => ENTITIES[e] ?? ' ')
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));

/** First couple of sentences, for a card where the listing gave no excerpt. */
export function excerptFrom(bodyHtml, limit = 240) {
  if (!bodyHtml) return null;
  const text = clean(decode(bodyHtml.replace(/<[^>]+>/g, ' ')));
  if (text.length <= limit) return text || null;
  const cut = text.slice(0, limit);
  const stop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('? '), cut.lastIndexOf('! '));
  return (stop > 120 ? cut.slice(0, stop + 1) : `${cut.trimEnd()}…`) || null;
}
