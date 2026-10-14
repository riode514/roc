// Public JSON feed of the ROC Propietats portfolio.
//
//   GET /api/properties                      every active listing
//   GET /api/properties?for=sale&parish=Ordino&min=1000000&max=5000000
//   GET /api/properties?lang=ca              flattened to one language
//   GET /api/properties/3558                 one listing by reference
//
// Reads through the publishable key, so RLS limits it to active listings.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  // Netlify serves a cached copy for 5 minutes and revalidates in the
  // background; the scraper only refreshes this once a day.
  'Cache-Control': 'public, max-age=300, stale-while-revalidate=86400',
};

export default async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: JSON_HEADERS });
  if (request.method !== 'GET') {
    return json({ error: 'Method not allowed' }, 405);
  }
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return json({ error: 'Feed is not configured' }, 500);
  }

  const url = new URL(request.url);
  const params = url.searchParams;

  // /api/properties/3558 -> reference 3558
  const tail = url.pathname.replace(/\/+$/, '').split('/').pop();
  const reference = /^\d+$/.test(tail) ? tail : params.get('reference');

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
  let query = supabase.from('properties_feed').select('*');

  if (reference) query = query.eq('reference', reference);

  const transaction = params.get('for') ?? params.get('transaction');
  if (transaction === 'sale' || transaction === 'rent') query = query.eq('transaction', transaction);

  const parish = params.get('parish');
  if (parish) query = query.eq('parish', parish);

  const min = Number(params.get('min'));
  if (Number.isFinite(min) && min > 0) query = query.gte('price', min);

  const max = Number(params.get('max'));
  if (Number.isFinite(max) && max > 0) query = query.lte('price', max);

  const beds = Number(params.get('bedrooms'));
  if (Number.isFinite(beds) && beds > 0) query = query.gte('bedrooms', beds);

  const limit = Math.min(Number(params.get('limit')) || 200, 500);
  query = query.limit(limit).order('price', { ascending: false, nullsFirst: false });

  const { data, error } = await query;
  if (error) return json({ error: error.message }, 502);

  const lang = params.get('lang');
  const items = (data ?? []).map((row) => shape(row, lang));

  if (reference) {
    if (!items.length) return json({ error: 'Not found' }, 404);
    return json(items[0]);
  }

  return json({
    source: 'rocpropietats.com',
    generated_at: new Date().toISOString(),
    count: items.length,
    properties: items,
  });
};

/** Presents one row; `lang` flattens translations down to a single language. */
function shape(row, lang) {
  const media = row.media ?? [];
  const base = {
    reference: row.reference,
    transaction: row.transaction,
    url: `https://rocpropietats.com${row.source_path ?? ''}`,
    location: { parish: row.parish, sublocation: row.sublocation, country: 'AD' },
    price: row.price,
    currency: row.currency,
    price_display: row.price_text,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    garage: row.garage,
    surfaces_m2: {
      built: num(row.built_m2),
      living: num(row.living_m2),
      plot: num(row.plot_m2),
      terrace: num(row.terrace_m2),
    },
    media: {
      images: media.filter((m) => m.kind === 'image').map((m) => m.url),
      videos: media.filter((m) => m.kind === 'video').map((m) => ({ url: m.url, provider: m.provider })),
      tours360: media.filter((m) => m.kind === 'tour360').map((m) => ({ url: m.url, provider: m.provider })),
      floorplans: media.filter((m) => m.kind === 'floorplan').map((m) => m.url),
    },
    raw_details: row.details,
    first_seen_at: row.first_seen_at,
    last_seen_at: row.last_seen_at,
  };

  const translations = row.translations ?? {};
  if (lang && translations[lang]) {
    const t = translations[lang];
    return { ...base, lang, title: t.title, description: t.description,
             property_type: t.property_type, features: t.features ?? [] };
  }
  return { ...base, translations };
}

const num = (v) => (v == null ? null : Number(v));

const json = (body, status = 200) =>
  new Response(JSON.stringify(body, null, 2), { status, headers: JSON_HEADERS });

export const config = {
  path: ['/api/properties', '/api/properties/:reference', '/feed.json'],
};
