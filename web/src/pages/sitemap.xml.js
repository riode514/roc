import { getProperties } from '../lib/properties.js';

export async function GET({ site }) {
  const origin = (site ?? new URL('https://roc-propietats.netlify.app')).origin;
  const all = await getProperties();

  const urls = [
    { loc: '/', priority: '1.0' },
    { loc: '/residences/', priority: '0.9' },
    { loc: '/ca/', priority: '0.8' },
    { loc: '/ca/residences/', priority: '0.7' },
    ...all.flatMap((p) => [
      { loc: `/residences/${p.slug}/`, priority: '0.8', lastmod: p.last_seen_at },
      { loc: `/ca/residences/${p.slug}/`, priority: '0.6', lastmod: p.last_seen_at },
    ]),
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url>
    <loc>${origin}${u.loc}</loc>${u.lastmod ? `
    <lastmod>${new Date(u.lastmod).toISOString().slice(0, 10)}</lastmod>` : ''}
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>
`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
