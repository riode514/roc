import { getProperties } from '../lib/properties.js';
import { LOCALES, localeBase } from '../lib/i18n.js';

export async function GET({ site }) {
  const origin = (site ?? new URL('https://roc-propietats.netlify.app')).origin;
  const all = await getProperties();

  const urls = [];
  for (const lang of LOCALES) {
    const base = localeBase(lang);
    const home = lang === 'en' ? 1.0 : 0.8;
    urls.push({ loc: `${base}/`, priority: home.toFixed(1), lang });
    urls.push({ loc: `${base}/residences/`, priority: (home - 0.1).toFixed(1), lang });
    for (const p of all) {
      urls.push({ loc: `${base}/residences/${p.slug}/`, priority: (home - 0.2).toFixed(1), lang, lastmod: p.last_seen_at });
    }
  }

  // Every page declares its siblings, so search engines serve the right language.
  const alternates = (loc, lang) => {
    const rest = loc.slice(localeBase(lang).length) || '/';
    return LOCALES
      .map((l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${origin}${localeBase(l)}${rest}" />`)
      .join('\n');
  };

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.map((u) => `  <url>
    <loc>${origin}${u.loc}</loc>${u.lastmod ? `
    <lastmod>${new Date(u.lastmod).toISOString().slice(0, 10)}</lastmod>` : ''}
    <priority>${u.priority}</priority>
${alternates(u.loc, u.lang)}
  </url>`).join('\n')}
</urlset>
`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
