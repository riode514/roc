// node --test test/
//
// These cover the parsing rules that encode how the source site behaves.
// If the CMS changes, this is where it should show up first.

import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { classifyMedia, parseArea, parseBoolean, parseInteger, parsePrice } from '../src/site.js';
import { parseDetailPage, parseListingPage } from '../src/parse.js';

test('parsePrice reads European thousands separators', () => {
  assert.equal(parsePrice('5.705.000 €'), 5705000);
  assert.equal(parsePrice('420.000 €'), 420000);
  assert.equal(parsePrice('1.200 €/mes'), 1200);
  assert.equal(parsePrice('950 €'), 950);
  assert.equal(parsePrice(''), null);
  assert.equal(parsePrice(null), null);
});

test('parseArea distinguishes a decimal point from a thousands separator', () => {
  assert.equal(parseArea('597 m2'), 597);
  assert.equal(parseArea('597.00m2'), 597);
  assert.equal(parseArea('54 m2'), 54);
  // "1.200" here is twelve hundred square metres, not 1.2
  assert.equal(parseArea('1.200 m2'), 1200);
  assert.equal(parseArea('no digits'), null);
});

test('parseBoolean handles each language the site publishes in', () => {
  assert.equal(parseBoolean('Sí'), true);
  assert.equal(parseBoolean('Yes'), true);
  assert.equal(parseBoolean('Oui'), true);
  assert.equal(parseBoolean('No'), false);
  assert.equal(parseBoolean('Non'), false);
  assert.equal(parseBoolean('maybe'), null);
});

test('parseInteger tolerates surrounding text', () => {
  assert.equal(parseInteger('Habitacions: 5'), 5);
  assert.equal(parseInteger('0'), 0);
  assert.equal(parseInteger(null), null);
});

test('classifyMedia separates images from video and 360 tours', () => {
  assert.deepEqual(classifyMedia('/continguts/immobiliaria/a.jpg'), { kind: 'image', provider: 'self' });
  assert.deepEqual(classifyMedia('https://youtu.be/abc'), { kind: 'video', provider: 'youtube' });
  assert.deepEqual(classifyMedia('https://player.vimeo.com/video/1'), { kind: 'video', provider: 'vimeo' });
  assert.deepEqual(classifyMedia('https://my.matterport.com/show/?m=x'), { kind: 'tour360', provider: 'matterport' });
  assert.deepEqual(classifyMedia('https://kuula.co/share/x'), { kind: 'tour360', provider: 'kuula' });
  assert.equal(classifyMedia('https://cdn.example.com/tour.mp4').kind, 'video');
  assert.equal(classifyMedia('https://cdn.example.com/brochure.pdf').kind, 'document');
});

// --- detail page --------------------------------------------------------

const detailHtml = ({ alt, rows, description, images = [] }) => `
<html><body>
  <h1>Venda | Escaldes-Engordany | Ref. 3268</h1>
  <div class="listing_single_property_slider lightgallery">
    ${images.map((src) => `<div class='item'><a href='${src}' class='lg-trigger'><img class='img-fluid' src='${src}' alt='${alt}'></a></div>`).join('')}
  </div>
  <div class="single_property_social_share">
    <div class="price"><div class="pxp-results-card-1-details-price">420.000 €</div></div>
  </div>
  <div class="listing_single_description">
    <div class="lsd_list"><ul><li><a href="#">Habitacions: 3</a></li><li><a href="#">Banys: 2</a></li></ul></div>
    <p class="mb25">${description}</p>
  </div>
  <div class="additional_details"><div class="row">
    ${rows.map(([labels, values]) => `<div class="col">
      <ul class="list-inline-item">${labels.map((l) => `<li><p>${l}</p></li>`).join('')}</ul>
      <ul class="list-inline-item">${values.map((v) => `<li><p><span>${v}</span></p></li>`).join('')}</ul>
    </div>`).join('')}
  </div></div>
</body></html>`;

test('a villa maps Vivenda and Terrassa onto their own columns', () => {
  const html = detailHtml({
    alt: 'Ref. 3558 | Xalet | Anyós, La Massana',
    description: 'Una vila.',
    images: ['/continguts/immobiliaria/a.png', '/continguts/immobiliaria/b.png'],
    rows: [
      [['Ref. :', 'Preu :'], ['3558', '5.705.000 €']],
      [['Habitacions :', 'Banys :', 'Garatge :'], ['5', '5', 'Sí']],
      [['Superficie :', 'Vivenda :', 'Terrassa :'], ['597 m2', '543 m2', '54 m2']],
    ],
  });
  const { property, translation, media } = parseDetailPage(html,
    { lang: 'ca', transaction: 'sale', reference: '3558', url: '/x/' });

  assert.equal(property.price, 5705000);
  assert.equal(property.bedrooms, 5);
  assert.equal(property.bathrooms, 5);
  assert.equal(property.garage, true);
  assert.equal(property.built_m2, 597);
  assert.equal(property.living_m2, 543);
  assert.equal(property.terrace_m2, 54);
  assert.equal(property.plot_m2, null);
  assert.equal(property.parish, 'La Massana');
  assert.equal(property.sublocation, 'Anyós');
  assert.equal(translation.title, 'Xalet, Anyós');
  assert.equal(media.length, 2);
  assert.equal(media[0].kind, 'image');
});

test('a plot maps Terreny onto plot_m2 instead', () => {
  const html = detailHtml({
    alt: 'Ref. 3268 | Terreny | Engolasters, Escaldes-Engordany',
    description: 'Un terreny.',
    images: ['/continguts/immobiliaria/a.jpg'],
    rows: [
      [['Ref. :', 'Preu :'], ['3268', '420.000 €']],
      [['Habitacions :', 'Banys :', 'Garatge :'], ['0', '0', 'No']],
      [['Superficie :', 'Terreny :'], ['400 m2', '400 m2']],
    ],
  });
  const { property } = parseDetailPage(html,
    { lang: 'ca', transaction: 'sale', reference: '3268', url: '/x/' });

  assert.equal(property.plot_m2, 400);
  assert.equal(property.built_m2, 400);
  assert.equal(property.living_m2, null);
  assert.equal(property.garage, false);
  assert.equal(property.bedrooms, 0);
});

test('English labels land in the same columns as Catalan ones', () => {
  const html = detailHtml({
    alt: 'Ref. 3558 | Chalet | Ordino',
    description: 'A villa.',
    images: ['/continguts/immobiliaria/a.png'],
    rows: [
      [['Ref. :', 'Price :'], ['3558', '5.705.000 €']],
      [['Rooms :', 'Bathrooms :', 'Garage :'], ['5', '5', 'Yes']],
      [['Surface :', 'Housing :', 'Terrace :'], ['597 m2', '543 m2', '54 m2']],
    ],
  });
  const { property, translation } = parseDetailPage(html,
    { lang: 'en', transaction: 'sale', reference: '3558', url: '/x/' });

  assert.equal(property.built_m2, 597);
  assert.equal(property.living_m2, 543);
  assert.equal(property.terrace_m2, 54);
  assert.equal(property.garage, true);
  // No sublocation in the alt: the parish is still read, and the title falls
  // back to the bare type.
  assert.equal(property.parish, 'Ordino');
  assert.equal(property.sublocation, null);
  assert.equal(translation.title, 'Chalet');
});

test('unmapped labels survive in details rather than being dropped', () => {
  const html = detailHtml({
    alt: 'Ref. 1 | Àtic | Canillo',
    description: 'x',
    images: [],
    rows: [[['Ref. :', 'Orientació :'], ['1', 'Sud']]],
  });
  const { property } = parseDetailPage(html, { lang: 'ca', transaction: 'sale', reference: '1', url: '/x/' });
  assert.equal(property.details['orientació'], 'Sud');
});

test('listing pages yield references, the total and the page count', () => {
  const html = `<html><body>
    <div class="grid_list_search_result"><div><div class="left_area"><p>72 propietats trobades</p></div></div></div>
    <a href="/ca/propietats/venda/referencia/3268/">x</a>
    <a href="/ca/propietats/venda/referencia/3268/">duplicate link to same ref</a>
    <a href="/ca/propietats/venda/referencia/3558/">y</a>
    <a class="immobiliaria-paginacio" pagina="1"></a>
    <a class="immobiliaria-paginacio" pagina="12"></a>
  </body></html>`;
  const { refs, total, maxPage } = parseListingPage(html);
  assert.deepEqual(refs, ['3268', '3558']);
  assert.equal(total, 72);
  assert.equal(maxPage, 12);
});

test('a listing with no gallery still parses, falling back to the heading', () => {
  // Type and sublocation come from the gallery alt, so a listing published
  // without images loses them. The numbers and the parish must still survive.
  const html = detailHtml({
    alt: '', description: 'No photographs yet.', images: [],
    rows: [[['Ref. :', 'Preu :'], ['3999', '300.000 €']]],
  });
  const { property, translation, media } = parseDetailPage(html,
    { lang: 'ca', transaction: 'sale', reference: '3999', url: '/x/' });

  assert.equal(property.price, 300000);
  assert.equal(property.parish, 'Escaldes-Engordany'); // from the heading
  assert.equal(media.length, 0);
  assert.equal(translation.title, 'Ref. 3999');
});

test("an alt containing an apostrophe is read in full", () => {
  // The CMS writes alt='...L'Aldosa, La Massana' without escaping the
  // apostrophe, so a DOM parser truncates the value at "L".
  const html = `<html><body>
    <h1>Venda | Escaldes-Engordany | Ref. 3503</h1>
    <div class="listing_single_property_slider lightgallery">
      <div class='item'><a href='/continguts/immobiliaria/a.jpg' class='lg-trigger'>
      <img class='img-fluid' src='/continguts/immobiliaria/a.jpg' alt='Ref. 3503 | Xalet | L'Aldosa, La Massana'></a></div>
    </div>
    <div class="additional_details"><div class="row"><div class="col">
      <ul class="list-inline-item"><li><p>Ref. :</p></li></ul>
      <ul class="list-inline-item"><li><p><span>3503</span></p></li></ul>
    </div></div></div>
  </body></html>`;
  const { property, translation } = parseDetailPage(html,
    { lang: 'ca', transaction: 'sale', reference: '3503', url: '/x/' });

  assert.equal(property.sublocation, "L'Aldosa");
  assert.equal(property.parish, 'La Massana');
  assert.equal(translation.title, "Xalet, L'Aldosa");
});

test('a parish fragment in the alt never overwrites a good heading value', () => {
  const html = `<html><body>
    <h1>Venda | Ordino | Ref. 1</h1>
    <div class="listing_single_property_slider lightgallery">
      <div class='item'><img src='/a.jpg' alt='Ref. 1 | Xalet | Nowhereville'></div>
    </div>
    <div class="additional_details"><div class="row"></div></div>
  </body></html>`;
  const { property } = parseDetailPage(html, { lang: 'ca', transaction: 'sale', reference: '1', url: '/x/' });
  assert.equal(property.parish, 'Ordino');
});
