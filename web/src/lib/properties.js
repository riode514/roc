// Data access + presentation helpers shared by every page.
//
// The site is built statically, so this runs at build time against the
// read-only publishable key. RLS keeps it to active listings.

import { createClient } from '@supabase/supabase-js';
import { INTL_LOCALE, t } from './i18n.js';

// astro.config.mjs copies the repo-root .env into process.env before this runs,
// so one lookup order covers local builds and Netlify alike.
const SUPABASE_URL =
  process.env.SUPABASE_URL ?? import.meta.env.SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.SUPABASE_PUBLISHABLE_KEY;

export const PARISHES = [
  'Andorra la Vella',
  'Escaldes-Engordany',
  'La Massana',
  'Ordino',
  'Canillo',
  'Encamp',
  'Sant Julià de Lòria',
];

/** Fetches every active listing with its translations and media. */
export async function getProperties() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY must be set to build the site');
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

  const { data, error } = await supabase
    .from('properties_feed')
    .select('*')
    .order('price', { ascending: false, nullsFirst: false });

  if (error) throw new Error(`Supabase: ${error.message}`);
  return (data ?? []).map(normalise);
}

/** Shapes one feed row into what the templates consume. */
function normalise(row) {
  const media = row.media ?? [];
  const images = media.filter((m) => m.kind === 'image');
  const videos = media.filter((m) => m.kind === 'video');
  const tours = media.filter((m) => m.kind === 'tour360');

  return {
    ...row,
    images,
    videos,
    tours,
    cover: images[0]?.url ?? null,
    slug: `${row.transaction === 'rent' ? 'to-let' : 'for-sale'}-${row.reference}`,
    // ROC has not translated every listing — 21 of them have no English
    // description, for instance. Each field falls back on its own, so a
    // missing description does not also cost us the title, and vice versa.
    t(lang) {
      const tr = row.translations ?? {};
      const order = [lang, 'en', 'ca', 'es', 'fr'];
      const pick = (field) => {
        for (const l of order) {
          const v = tr[l]?.[field];
          if (v != null && v !== '' && !(Array.isArray(v) && v.length === 0)) return v;
        }
        return null;
      };
      return {
        title: pick('title'),
        description: pick('description'),
        property_type: pick('property_type'),
        features: pick('features') ?? [],
        source_url: tr[lang]?.source_url ?? pick('source_url'),
      };
    },
  };
}

// --- formatting -------------------------------------------------------------

export function formatPrice(property, lang = 'en') {
  const c = t(lang);
  if (property.price == null) return c.priceOnApplication;
  const n = new Intl.NumberFormat(INTL_LOCALE[lang] ?? 'en-GB', {
    style: 'currency',
    currency: property.currency || 'EUR',
    maximumFractionDigits: 0,
  }).format(property.price);
  return property.transaction === 'rent' ? `${n}${c.perMonth}` : n;
}

/** "5 bed · 6 bath · 612 m²" — omits parts the source does not provide. */
export function formatStats(property, lang = 'en') {
  const c = t(lang);
  const parts = [];
  if (property.bedrooms) parts.push(`${property.bedrooms} ${c.bedShort}`);
  if (property.bathrooms) parts.push(`${property.bathrooms} ${c.bathShort}`);
  const area = property.built_m2 ?? property.living_m2;
  if (area) parts.push(`${formatArea(area)} m²`);
  else if (property.plot_m2) parts.push(`${formatArea(property.plot_m2)} m² ${c.plotShort}`);
  return parts.join(' · ');
}

export function formatArea(value) {
  if (value == null) return null;
  const n = Number(value);
  return Number.isInteger(n) ? String(n) : n.toFixed(0);
}

/** The badge in the card's top-left corner. */
export function statusLabel(property, lang = 'en') {
  const c = t(lang);
  const isNew = property.first_seen_at &&
    Date.now() - new Date(property.first_seen_at).getTime() < 21 * 24 * 60 * 60 * 1000;
  if (isNew) return c.statusNew;
  return property.transaction === 'rent' ? c.statusRent : c.statusSale;
}

export function titleOf(property, lang = 'en') {
  const tr = property.t(lang);
  return tr.title || `Ref. ${property.reference}`;
}

export function descriptionOf(property, lang = 'en') {
  return property.t(lang).description || '';
}

export function typeOf(property, lang = 'en') {
  return property.t(lang).property_type || '';
}
