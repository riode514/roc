// HTML -> structured property records.
//
// GiraWeb renders the "Detalls" block as paired <ul> columns: the first list
// holds labels, the second holds values at matching indexes. The set of labels
// differs per listing (a plot has "Terreny", a villa has "Vivenda"/"Terrassa"),
// so labels are read generically and then mapped, never read by position.

import * as cheerio from 'cheerio';
import {
  FIELD_LABELS, SURFACE_LABELS, absoluteUrl, classifyMedia,
  parseArea, parseBoolean, parseInteger, parsePrice,
} from './site.js';

const normaliseLabel = (s) =>
  String(s ?? '').replace(/\s+/g, ' ').replace(/[:：]\s*$/, '').trim().toLowerCase();

const clean = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();

function matchesLabel(label, candidates) {
  const l = normaliseLabel(label);
  return candidates.some((c) => l === c || l.replace(/\.$/, '') === c);
}

/** References present on one listing index page, in display order. */
export function parseListingPage(html) {
  const $ = cheerio.load(html);
  const refs = [];
  $('a[href*="/referencia/"]').each((_, el) => {
    const m = /\/referencia\/(\d+)\//.exec($(el).attr('href') || '');
    if (m && !refs.includes(m[1])) refs.push(m[1]);
  });

  const totalText = $('.grid_list_search_result .left_area p').first().text();
  const total = parseInteger(totalText);

  let maxPage = 1;
  $('a.immobiliaria-paginacio').each((_, el) => {
    const p = parseInteger($(el).attr('pagina'));
    if (p && p > maxPage) maxPage = p;
  });

  return { refs, total, maxPage };
}

/**
 * Parses one property detail page.
 * `lang` and `transaction` are supplied by the caller — the page itself does
 * not state them unambiguously in every language.
 */
export function parseDetailPage(html, { lang, transaction, reference, url }) {
  const $ = cheerio.load(html);

  // --- Heading: "Venda | Escaldes-Engordany | Ref. 3268" -------------------
  const headingText = clean(
    $('*:contains("Ref.")').filter((_, el) => /Ref\.\s*\d+/.test($(el).text())).last().text(),
  );
  const headingMatch = /([^|]+)\|([^|]+)\|\s*Ref\.\s*(\d+)/.exec(headingText);
  let parish = headingMatch ? clean(headingMatch[2]) : null;

  // --- Gallery alt carries type + sublocation + parish ---------------------
  // "Ref. 3268 | Terreny | Engolasters, Escaldes-Engordany"
  let propertyType = null;
  let sublocation = null;
  const altText = clean($('.lightgallery img').first().attr('alt') || '');
  const altParts = altText.split('|').map(clean).filter(Boolean);
  // The alt is generated from the property record, so it wins over the
  // heading, which is matched loosely and can pick up surrounding markup.
  if (altParts.length >= 3) {
    propertyType = altParts[1];
    const place = altParts[2].split(',').map(clean).filter(Boolean);
    if (place.length >= 2) {
      sublocation = place[0];
      parish = place[place.length - 1];
    } else if (place.length === 1) {
      parish = place[0];
    }
  }
  if (!propertyType) {
    // Fall back to the tag shown above the heading.
    const tags = $('.dtls_headr .tag li a, .tag li a')
      .map((_, el) => clean($(el).text())).get().filter(Boolean);
    propertyType = tags.find((t) => !/^(venda|lloguer|venta|alquiler|sale|rent|vente|louer)$/i.test(t)) || null;
  }

  // --- Price ---------------------------------------------------------------
  const priceText = clean(
    $('.pxp-results-card-1-details-price').first().text() ||
    $('.single_property_social_share .price').first().text(),
  );

  // --- Description ---------------------------------------------------------
  const description = clean($('.listing_single_description p.mb25').first().text()) || null;

  // --- "Detalls" label/value columns --------------------------------------
  const details = {};
  $('.additional_details .row > div').each((_, col) => {
    const lists = $(col).find('ul.list-inline-item');
    if (lists.length < 2) return;
    const labels = $(lists[0]).find('li').map((_, li) => clean($(li).text())).get();
    const values = $(lists[1]).find('li').map((_, li) => clean($(li).text())).get();
    labels.forEach((label, i) => {
      if (!label) return;
      const value = values[i];
      if (value == null || value === '') return;
      details[normaliseLabel(label)] = value;
    });
  });

  // --- Map the generic label map onto typed columns ------------------------
  const record = {
    reference,
    transaction,
    parish: parish || null,
    sublocation: sublocation || null,
    price: null,
    price_text: null,
    bedrooms: null,
    bathrooms: null,
    garage: null,
    built_m2: null,
    living_m2: null,
    plot_m2: null,
    terrace_m2: null,
    details,
    source_path: url,
  };

  for (const [label, value] of Object.entries(details)) {
    if (matchesLabel(label, FIELD_LABELS.price)) {
      record.price = parsePrice(value);
      record.price_text = value;
    } else if (matchesLabel(label, FIELD_LABELS.bedrooms)) {
      record.bedrooms = parseInteger(value);
    } else if (matchesLabel(label, FIELD_LABELS.bathrooms)) {
      record.bathrooms = parseInteger(value);
    } else if (matchesLabel(label, FIELD_LABELS.garage)) {
      record.garage = parseBoolean(value);
    } else {
      const column = SURFACE_LABELS[normaliseLabel(label)];
      if (column) record[column] = parseArea(value);
    }
  }

  // Fall back to the summary strip when the details block omits something.
  if (record.price == null && priceText) {
    record.price = parsePrice(priceText);
    record.price_text = record.price_text || priceText;
  }
  const summary = $('.lsd_list li').map((_, el) => clean($(el).text())).get();
  for (const item of summary) {
    const [rawLabel, rawValue] = item.split(':').map(clean);
    if (rawValue != null) {
      if (record.bedrooms == null && matchesLabel(rawLabel, FIELD_LABELS.bedrooms)) {
        record.bedrooms = parseInteger(rawValue);
      } else if (record.bathrooms == null && matchesLabel(rawLabel, FIELD_LABELS.bathrooms)) {
        record.bathrooms = parseInteger(rawValue);
      }
    } else if (record.built_m2 == null && /m2|m²/i.test(item)) {
      record.built_m2 = parseArea(item);
    }
  }

  // --- Features ------------------------------------------------------------
  const features = [];
  const featuresHeading = $('h4').filter((_, el) =>
    /caracter|features|caract|prestaciones/i.test($(el).text()));
  featuresHeading.closest('div').find('li').each((_, li) => {
    const t = clean($(li).text());
    if (t && !/calculadora|calculator|hipote|mortgage/i.test(t)) features.push(t);
  });

  // --- Media ---------------------------------------------------------------
  const media = [];
  const seen = new Set();
  const push = (rawUrl, alt) => {
    const u = absoluteUrl(rawUrl);
    if (!u || seen.has(u)) return;
    seen.add(u);
    const { kind, provider } = classifyMedia(u);
    media.push({ url: u, kind, provider, position: media.length, alt: alt || null });
  };

  $('.lightgallery .item').each((_, item) => {
    const $item = $(item);
    const $a = $item.find('a').first();
    const alt = clean($item.find('img').attr('alt') || '');
    // lightGallery exposes video/iframe sources via data attributes.
    const dataSrc = $a.attr('data-src') || $item.attr('data-src');
    const href = $a.attr('href');
    const iframe = $item.find('iframe').attr('src');
    push(dataSrc || iframe || href, alt);
  });

  // Any embedded tour/video outside the gallery.
  $('iframe[src]').each((_, el) => {
    const src = $(el).attr('src');
    if (/youtube|vimeo|matterport|kuula|360/i.test(src)) push(src, null);
  });

  // --- Title: composed, mirroring the design's "Contemporary Chalet, Engolasters"
  const title = [propertyType, sublocation].filter(Boolean).join(', ') ||
    propertyType || `Ref. ${reference}`;

  return {
    property: record,
    translation: {
      lang,
      title,
      description,
      property_type: propertyType,
      features,
      source_url: absoluteUrl(url),
    },
    media,
  };
}
