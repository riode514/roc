import { PARISHES, getProperties } from '../lib/properties.js';
import { getNews, parishSlug } from '../lib/content.js';
import { LOCALES, PAGE_SLUGS, localeBase } from '../lib/i18n.js';

export async function GET({ site }) {
  const origin = (site ?? new URL('https://roc-propietats.netlify.app')).origin;
  const [properties, news] = await Promise.all([getProperties(), getNews()]);

  const urls = [];
  for (const lang of LOCALES) {
    const base = localeBase(lang);
    const top = lang === 'en' ? 1.0 : 0.8;
    // `alts` is given explicitly where the path differs per language — the
    // standing pages have a translated slug, so the usual swap of the locale
    // prefix would point at URLs that do not exist.
    const at = (loc, priority, lastmod, alts) =>
      urls.push({ loc, priority: priority.toFixed(1), lang, lastmod, alts });

    at(`${base}/`, top);
    at(`${base}/residences/`, top - 0.1);
    at(`${base}/news/`, top - 0.1);

    for (const key of Object.keys(PAGE_SLUGS)) {
      const alts = Object.fromEntries(
        LOCALES.map((l) => [l, `${localeBase(l)}/${PAGE_SLUGS[key][l]}/`]),
      );
      at(`${base}/${PAGE_SLUGS[key][lang]}/`, key === 'about' ? top - 0.2 : top - 0.5, null, alts);
    }
    for (const name of PARISHES) {
      at(`${base}/locations/${parishSlug(name)}/`, top - 0.2);
    }
    for (const p of properties) {
      at(`${base}/residences/${p.slug}/`, top - 0.2, p.last_seen_at);
    }
    for (const a of news) {
      at(`${base}/news/${a.slug}/`, top - 0.3, a.published_on);
    }
  }

  // Every page declares its siblings, so search engines serve the right language.
  const alternates = ({ loc, lang, alts }) => {
    const rest = loc.slice(localeBase(lang).length) || '/';
    return LOCALES
      .map((l) => {
        const href = alts?.[l] ?? `${localeBase(l)}${rest}`;
        return `    <xhtml:link rel="alternate" hreflang="${l}" href="${origin}${href}" />`;
      })
      .join('\n');
  };

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.map((u) => `  <url>
    <loc>${origin}${u.loc}</loc>${u.lastmod ? `
    <lastmod>${new Date(u.lastmod).toISOString().slice(0, 10)}</lastmod>` : ''}
    <priority>${u.priority}</priority>
${alternates(u)}
  </url>`).join('\n')}
</urlset>
`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
