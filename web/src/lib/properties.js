// Data access + presentation helpers shared by every page.
//
// The site is built statically, so this runs at build time against the
// read-only publishable key. RLS keeps it to active listings.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  import.meta.env.SUPABASE_URL ?? process.env.SUPABASE_URL;
const SUPABASE_KEY =
  import.meta.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY;

export const PARISHES = [
  'Andorra la Vella',
  'Escaldes-Engordany',
  'La Massana',
  'Ordino',
  'Canillo',
  'Encamp',
  'Sant Julià de Lòria',
];

/** Short editorial notes shown under a parish in the design's accordion. */
export const PARISH_NOTES = {
  'Andorra la Vella': 'The capital — commerce, the Meritxell avenue and apartments within walking distance of everything.',
  'Escaldes-Engordany': 'The most sought-after address for prime residences, from Engolasters chalets to apartments steps from the thermal quarter.',
  'La Massana': 'Valley living with quick access to Vallnord, favoured by families relocating to the Principality.',
  'Ordino': 'The quietest of the seven, known for restored stone bordas and the Vall d’Ordino.',
  'Canillo': 'Mountain and ski addresses above the valley floor, with Soldeu and Grandvalira close at hand.',
  'Encamp': 'Well-connected and better value, with the Funicamp link into the Grandvalira domain.',
  'Sant Julià de Lòria': 'The southern gateway to Andorra, bordering Spain, with a quieter rural character.',
};

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
    t(lang) {
      const tr = row.translations ?? {};
      return tr[lang] ?? tr.en ?? tr.ca ?? {};
    },
  };
}

// --- formatting -------------------------------------------------------------

export function formatPrice(property, lang = 'en') {
  if (property.price == null) return lang === 'ca' ? 'Preu a consultar' : 'Price on application';
  const n = new Intl.NumberFormat(lang === 'ca' ? 'ca-AD' : 'en-GB', {
    style: 'currency',
    currency: property.currency || 'EUR',
    maximumFractionDigits: 0,
  }).format(property.price);
  return property.transaction === 'rent' ? `${n}${lang === 'ca' ? '/mes' : ' pcm'}` : n;
}

/** "5 bed · 6 bath · 612 m²" — omits parts the source does not provide. */
export function formatStats(property, lang = 'en') {
  const words = lang === 'ca'
    ? { bed: 'hab', bath: 'bany', plot: 'parcel·la' }
    : { bed: 'bed', bath: 'bath', plot: 'plot' };
  const parts = [];
  if (property.bedrooms) parts.push(`${property.bedrooms} ${words.bed}`);
  if (property.bathrooms) parts.push(`${property.bathrooms} ${words.bath}`);
  const area = property.built_m2 ?? property.living_m2;
  if (area) parts.push(`${formatArea(area)} m²`);
  else if (property.plot_m2) parts.push(`${formatArea(property.plot_m2)} m² ${words.plot}`);
  return parts.join(' · ');
}

export function formatArea(value) {
  if (value == null) return null;
  const n = Number(value);
  return Number.isInteger(n) ? String(n) : n.toFixed(0);
}

/** The badge in the card's top-left corner. */
export function statusLabel(property, lang = 'en') {
  const isNew = property.first_seen_at &&
    Date.now() - new Date(property.first_seen_at).getTime() < 21 * 24 * 60 * 60 * 1000;
  if (lang === 'ca') {
    if (isNew) return 'Nova incorporació';
    return property.transaction === 'rent' ? 'De lloguer' : 'En venda';
  }
  if (isNew) return 'New instruction';
  return property.transaction === 'rent' ? 'To let' : 'For sale';
}

export function titleOf(property, lang = 'en') {
  const t = property.t(lang);
  return t.title || `Ref. ${property.reference}`;
}

export function descriptionOf(property, lang = 'en') {
  return property.t(lang).description || '';
}

export function typeOf(property, lang = 'en') {
  return property.t(lang).property_type || '';
}
