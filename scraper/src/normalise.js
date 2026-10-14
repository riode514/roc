// Cleans up what the source CMS actually publishes.
//
// Parsing and cleaning are kept apart: `parse.js` reports the page as it is,
// this decides what the feed should say. Everything here is driven by real
// defects observed across the whole catalogue — see the notes on each rule.

import { SURFACE_LABELS, classifyMedia, parseArea, parseBoolean } from './site.js';

/** Canonical spellings; the CMS is inconsistent about casing. */
const PARISH_CANONICAL = {
  'andorra la vella': 'Andorra la Vella',
  'escaldes-engordany': 'Escaldes-Engordany',
  'la massana': 'La Massana',
  'ordino': 'Ordino',
  'canillo': 'Canillo',
  'encamp': 'Encamp',
  'sant julia de loria': 'Sant Julià de Lòria',
  'sant julià de lòria': 'Sant Julià de Lòria',
};

/** Surfaces beyond the four the detail page always shows. */
const EXTRA_SURFACES = {
  'jardí': 'garden_m2',
  'jardin': 'garden_m2',
  'garden': 'garden_m2',
  'balcó': 'balcony_m2',
  'balcon': 'balcony_m2',
  'balcony': 'balcony_m2',
};

const strip = (s) => String(s ?? '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export function canonicalParish(value) {
  if (!value) return null;
  const key = String(value).trim().toLowerCase();
  if (PARISH_CANONICAL[key]) return PARISH_CANONICAL[key];
  const loose = strip(value);
  for (const [k, v] of Object.entries(PARISH_CANONICAL)) {
    if (strip(k) === loose) return v;
  }
  return String(value).trim();
}

/**
 * The CMS stores a single "video" string and renders it as
 * `youtube.com/embed/<whatever the agent pasted>`. When that paste was itself
 * a URL — usually a Matterport tour — the result is a dead link like
 * `youtube.com/embed/https://my.matterport.com/show/?m=x`. The real URL is
 * always present separately, so these wrappers are dropped rather than fixed.
 *
 * One listing also had two tour URLs in the same field, separated by spaces.
 */
export function normaliseMedia(media) {
  const out = [];
  const seen = new Set();

  for (const item of media ?? []) {
    for (const url of expandUrls(item.url)) {
      if (!url || seen.has(url)) continue;
      // A YouTube embed whose video id is itself a URL is the CMS's mistake.
      if (/youtube\.com\/embed\/https?:/i.test(url)) continue;
      // Some listings carry a gallery entry pointing at the upload directory
      // with no filename; it would render as a broken image. Only the source
      // site's own media paths are checked — plenty of tour URLs legitimately
      // end in a slash, e.g. matterport.com/show/?m=…
      if (/^(https?:\/\/(www\.)?rocpropietats\.com)?\/continguts\/\S*\/$/i.test(url.split('?')[0])) continue;
      seen.add(url);
      const embeddable = toEmbedUrl(url);
      const { kind, provider } = classifyMedia(embeddable);
      out.push({ ...item, url: embeddable, kind, provider, position: out.length });
    }
  }

  // Images first in their original order, then tours, then everything else.
  const rank = { image: 0, floorplan: 1, tour360: 2, video: 3, document: 4 };
  return out
    .sort((a, b) => (rank[a.kind] ?? 9) - (rank[b.kind] ?? 9) || a.position - b.position)
    .map((m, i) => ({ ...m, position: i }));
}


/**
 * Agents paste whatever YouTube URL they have — a watch link, a youtu.be
 * short link, or a Shorts link. None of those render in an iframe, so they are
 * rewritten to the embed form.
 */
export function toEmbedUrl(url) {
  const m =
    /youtube\.com\/shorts\/([\w-]{6,})/i.exec(url) ||
    /youtube\.com\/watch\?(?:.*&)?v=([\w-]{6,})/i.exec(url) ||
    /youtu\.be\/([\w-]{6,})/i.exec(url);
  if (m) return `https://www.youtube.com/embed/${m[1]}`;
  return url;
}

/** Splits a field that accidentally holds several whitespace-separated URLs. */
function expandUrls(raw) {
  const value = String(raw ?? '').trim();
  if (!value) return [];
  const parts = value.split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return [value];
  // Only treat it as several URLs if each piece looks like one.
  return parts.every((p) => /^(https?:\/\/|\/)/i.test(p)) ? parts : [value];
}

/**
 * Fills in anything the typed columns missed from the raw label map, and
 * resolves "Garatge" — which is usually Sí/No but is sometimes an area.
 */
export function normaliseProperty(property) {
  const next = { ...property, parish: canonicalParish(property.parish) };
  next.garden_m2 = next.garden_m2 ?? null;
  next.balcony_m2 = next.balcony_m2 ?? null;
  next.garage_m2 = next.garage_m2 ?? null;

  for (const [label, value] of Object.entries(property.details ?? {})) {
    const key = String(label).replace(/[:：]\s*$/, '').trim().toLowerCase();

    const extra = EXTRA_SURFACES[key];
    if (extra && next[extra] == null) next[extra] = parseArea(value);

    const known = SURFACE_LABELS[key];
    if (known && next[known] == null) next[known] = parseArea(value);

    if (/^(garatge|garaje|garage)$/.test(key)) {
      const asBool = parseBoolean(value);
      if (asBool !== null) {
        next.garage = asBool;
      } else {
        // "146 m2" means there is a garage, and tells us how big it is.
        const area = parseArea(value);
        if (area != null) { next.garage = area > 0; next.garage_m2 = area; }
      }
    }
  }

  // The CMS writes 0 m² for surfaces a listing simply does not have.
  for (const k of ['built_m2', 'living_m2', 'plot_m2', 'terrace_m2', 'garden_m2', 'balcony_m2', 'garage_m2']) {
    if (next[k] === 0) next[k] = null;
  }
  return next;
}

/** Applies both to one scraped result. */
export function normaliseResult(result) {
  return {
    ...result,
    property: normaliseProperty(result.property),
    media: normaliseMedia(result.media),
  };
}
