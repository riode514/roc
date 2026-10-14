// Source-site knowledge for rocpropietats.com (GiraWeb CMS).
//
// Two things here are load-bearing and were established by probing the live
// site; change them only with evidence:
//
//  1. Listings MUST be paged with an explicit `ordenar` value. The default
//     ordering is not stable across requests, so paging through it returns
//     duplicates and silently drops rows — a full crawl of the 72 sale
//     listings yielded only 49. `preu-asc` pages cleanly through all of them.
//
//  2. The site rejects requests without a browser-like header set (403).

export const BASE = 'https://rocpropietats.com';

export const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';

/** Listing index paths per language and transaction. */
export const PATHS = {
  ca: { sale: '/ca/propietats/venda/',     rent: '/ca/propietats/lloguer/' },
  en: { sale: '/en/properties/for-sell/',  rent: '/en/properties/to-rent/' },
  es: { sale: '/es/propiedades/venta/',    rent: '/es/propiedades/alquiler/' },
  fr: { sale: '/fr/proprietes/vente/',     rent: '/fr/proprietes/louer/' },
};

/** Detail page for one reference, e.g. /ca/propietats/venda/referencia/3268/ */
export function detailPath(lang, transaction, reference) {
  return `${PATHS[lang][transaction]}referencia/${reference}/`;
}

/**
 * Maps the CMS's surface labels onto our columns. Labels vary per listing —
 * a plot shows "Terreny", a villa shows "Vivenda"/"Terrassa" — so anything
 * unmapped is still preserved in `details`.
 */
export const SURFACE_LABELS = {
  // Catalan
  'superficie': 'built_m2',
  'superfície': 'built_m2',
  'vivenda':    'living_m2',
  'habitatge':  'living_m2',
  'terreny':    'plot_m2',
  'parcel·la':  'plot_m2',
  'terrassa':   'terrace_m2',
  // English
  'surface':    'built_m2',
  'built':      'built_m2',
  'dwelling':   'living_m2',
  'housing':    'living_m2',
  'living':     'living_m2',
  'land':       'plot_m2',
  'plot':       'plot_m2',
  'terrace':    'terrace_m2',
};

export const FIELD_LABELS = {
  reference: ['ref.', 'ref', 'referencia', 'referència', 'reference'],
  price:     ['preu', 'precio', 'price', 'prix'],
  bedrooms:  ['habitacions', 'habitaciones', 'bedrooms', 'chambres', 'rooms'],
  bathrooms: ['banys', 'baños', 'bathrooms', 'salles de bain', 'baths'],
  garage:    ['garatge', 'garaje', 'garage'],
};

const AFFIRMATIVE = new Set(['sí', 'si', 'yes', 'oui', 'true', '1']);
const NEGATIVE = new Set(['no', 'non', 'false', '0']);

export function parseBoolean(value) {
  if (value == null) return null;
  const v = String(value).trim().toLowerCase();
  if (AFFIRMATIVE.has(v)) return true;
  if (NEGATIVE.has(v)) return false;
  return null;
}

/**
 * "5.705.000 €" -> 5705000 ; "1.200 €/mes" -> 1200
 * European format: '.' groups thousands, ',' is the decimal separator.
 */
export function parsePrice(text) {
  if (!text) return null;
  const m = String(text).replace(/\s/g, '').match(/([\d.,]+)/);
  if (!m) return null;
  const n = Number(m[1].replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/** "597 m2" / "597.00m2" -> 597 */
export function parseArea(text) {
  if (!text) return null;
  const m = String(text).replace(/\s/g, '').match(/([\d.,]+)\s*m/i);
  if (!m) return null;
  let raw = m[1];
  // "597.00" is a decimal; "1.200" is thousands. Decide by the tail length.
  if (/\.\d{3}$/.test(raw)) raw = raw.replace(/\./g, '');
  const n = Number(raw.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

export function parseInteger(text) {
  if (text == null) return null;
  const m = String(text).match(/-?\d+/);
  return m ? Number(m[0]) : null;
}

/** Classifies a gallery URL into a media kind + provider. */
export function classifyMedia(url) {
  const u = String(url);
  if (/youtube\.com|youtu\.be/i.test(u))  return { kind: 'video',   provider: 'youtube' };
  if (/vimeo\.com/i.test(u))              return { kind: 'video',   provider: 'vimeo' };
  if (/matterport\.com/i.test(u))         return { kind: 'tour360', provider: 'matterport' };
  if (/kuula\.co/i.test(u))               return { kind: 'tour360', provider: 'kuula' };
  if (/360|panorama|virtual-?tour/i.test(u)) return { kind: 'tour360', provider: 'self' };
  if (/\.(mp4|webm|mov|m4v)(\?|$)/i.test(u)) return { kind: 'video', provider: 'self' };
  if (/\.pdf(\?|$)/i.test(u))             return { kind: 'document', provider: 'self' };
  if (/plano|plan(o|ol)?|floor-?plan/i.test(u)) return { kind: 'floorplan', provider: 'self' };
  return { kind: 'image', provider: 'self' };
}

export function absoluteUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return BASE + (path.startsWith('/') ? path : `/${path}`);
}

/** The seven parishes of Andorra — the only valid values for `parish`. */
export const PARISHES = [
  'Andorra la Vella',
  'Escaldes-Engordany',
  'La Massana',
  'Ordino',
  'Canillo',
  'Encamp',
  'Sant Julià de Lòria',
];

const fold = (s) => String(s ?? '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** Returns the canonical parish name, or null if `value` is not one. */
export function matchParish(value) {
  if (!value) return null;
  const f = fold(value);
  return PARISHES.find((p) => fold(p) === f) ?? null;
}
