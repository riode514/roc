// ROC's standing pages: the about page and the three legal notices.
//
// Each page links to its own translations from the language switcher, so only
// the English path needs to be known here — the rest are discovered.

import * as cheerio from 'cheerio';
import { sanitiseHtml } from './news.js';

export const PAGE_KEYS = ['about', 'legal', 'privacy', 'cookies'];

/** The English entry point for each page; other languages are discovered. */
export const PAGE_ENTRY = {
  about:   '/en/meet-us/',
  legal:   '/en/legal-notice/',
  privacy: '/en/privacy-policy/',
  cookies: '/en/cookie-policy/',
};

const clean = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();

/** Reads the language switcher: { ca: '/ca/...', es: '/es/...', ... } */
export function parseAlternates(html) {
  const $ = cheerio.load(html);
  const out = {};
  $('a[title]').each((_, el) => {
    const lang = clean($(el).attr('title')).toLowerCase();
    const href = $(el).attr('href') || '';
    if (/^(ca|es|en|fr)$/.test(lang) && href.startsWith(`/${lang}/`) && !out[lang]) {
      out[lang] = href;
    }
  });
  return out;
}

/**
 * Pulls a page down to a heading and a sequence of blocks.
 *
 * The legal notices are long runs of prose, while the about page is a built
 * layout of panels and figures. Reducing both to headings, paragraphs and
 * lists lets them be laid out in our own design rather than carrying ROC's
 * markup across — and drops their navigation, forms and modals on the way.
 */
export function parsePage(html, { lang, path, key }) {
  const $ = cheerio.load(html);

  // `section.footer_one` is ROC's footer and `.modal` holds the legal notices
  // repeated on every page; both would otherwise land in the body text.
  $('script, style, noscript, nav, header, footer, form, .modal, .breadcrumb, '
    + 'section.footer_one, .footer_one, .footer_mailchimp_form, .page_navigation, '
    + '.main-menu, #menu, .giraweb-sticker').remove();

  const title = clean($('.breadcrumb_title').first().text())
             || clean($('h1').first().text())
             || null;

  // The about page spreads its content across several sections, so no single
  // wrapper holds it; take whichever candidate yields the most text rather
  // than the first one over a threshold.
  const scopes = ['.about_content', '.main_blog_post_content', 'main', '.wrapper', 'body'];
  let $scope = $('body');
  let best = 0;
  for (const sel of scopes) {
    const $c = $(sel).first();
    if (!$c.length) continue;
    const len = clean($c.text()).length;
    if (len > best) { best = len; $scope = $c; }
  }

  // The legal notices are published as a single <p> with <br> between the
  // paragraphs — 1,500 characters in one element. Split those back into real
  // paragraphs before anything is collected, or the page arrives as one slab.
  $scope.find('p').each((_, el) => {
    const $p = $(el);
    if (!$p.find('br').length) return;
    const parts = ($p.html() ?? '')
      .split(/(?:\s*<br\s*\/?>\s*)+/i)
      .map((s) => s.trim())
      .filter((s) => clean(s.replace(/<[^>]+>/g, '')).length > 1);
    if (parts.length > 1) $p.replaceWith(parts.map((s) => `<p>${s}</p>`).join(''));
  });

  const blocks = [];
  const seen = new Set();
  const pushText = (type, text) => {
    const t = clean(text);
    if (!t || t.length < 2) return;
    const dedupe = `${type}:${t}`;
    if (seen.has(dedupe)) return;
    seen.add(dedupe);
    blocks.push({ type, text: t });
  };

  $scope.find('h1, h2, h3, h4, h5, p, li').each((_, el) => {
    const tag = el.tagName.toLowerCase();
    const $el = $(el);
    // Skip a paragraph whose text is already covered by a parent list item.
    if (tag === 'p' && $el.parents('li').length) return;
    const text = $el.text();
    if (tag === 'li') pushText('li', text);
    else if (tag === 'p') pushText('p', text);
    else pushText(/h[12]/.test(tag) ? 'h2' : 'h3', text);
  });

  // The legal pages read better as flowing HTML than as a list of fragments,
  // so keep a sanitised copy of the prose too.
  const bodyHtml = sanitiseHtml($scope.html() ?? '', $);

  return {
    key,
    lang,
    path,
    title,
    blocks: trimTail(blocks.filter((b) => b.text !== title)),
    bodyHtml,
  };
}

/**
 * Where a page has no single content wrapper we fall back to the whole body,
 * which picks up the site credit and a few navigation labels at the end.
 * Everything from the credit onwards goes, then any short list items left
 * trailing after the last real paragraph.
 */
// Matching on "all rights reserved" alone would cut the legal notices in half,
// since that is exactly what they are about. The footer credit is recognised
// by the © sign or the builder's name, and only when it turns up near the end.
const CREDIT = /(©|giraweb)/i;

function trimTail(blocks) {
  const credit = blocks.findIndex((b, i) => CREDIT.test(b.text) && i >= blocks.length - 8);
  let out = credit >= 0 ? blocks.slice(0, credit) : blocks.slice();

  let lastProse = -1;
  out.forEach((b, i) => { if (b.type === 'p' && b.text.length > 60) lastProse = i; });
  if (lastProse >= 0) {
    while (out.length > lastProse + 1) {
      const last = out[out.length - 1];
      if (last.type === 'li' && last.text.length < 40) out.pop();
      else break;
    }
  }
  return out;
}
