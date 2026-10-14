import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { canonicalParish, normaliseMedia, normaliseProperty } from '../src/normalise.js';

test('parish spellings are canonicalised', () => {
  assert.equal(canonicalParish('Andorra la vella'), 'Andorra la Vella');
  assert.equal(canonicalParish('ANDORRA LA VELLA'), 'Andorra la Vella');
  assert.equal(canonicalParish('Sant Julia de Loria'), 'Sant Julià de Lòria');
  assert.equal(canonicalParish('Ordino'), 'Ordino');
  assert.equal(canonicalParish(null), null);
});

test('a YouTube embed wrapping another URL is discarded', () => {
  // The CMS renders youtube.com/embed/<pasted value>, so a pasted Matterport
  // link becomes a dead URL. The real tour is always present separately.
  const media = normaliseMedia([
    { url: 'https://www.youtube.com/embed/https://my.matterport.com/show/?m=vdzDS7bArzV', kind: 'video' },
    { url: 'https://my.matterport.com/show/?m=vdzDS7bArzV', kind: 'tour360' },
  ]);
  assert.equal(media.length, 1);
  assert.equal(media[0].kind, 'tour360');
  assert.equal(media[0].provider, 'matterport');
});

test('a genuine YouTube embed is kept', () => {
  const media = normaliseMedia([{ url: 'https://www.youtube.com/embed/PpRkFea0dpg', kind: 'video' }]);
  assert.equal(media.length, 1);
  assert.equal(media[0].kind, 'video');
  assert.equal(media[0].provider, 'youtube');
});

test('one field holding two tour URLs becomes two media rows', () => {
  const media = normaliseMedia([
    { url: 'https://my.matterport.com/show/?m=auyQA7x1jjN  https://my.matterport.com/show/?m=3HDB1256HSv' },
  ]);
  assert.equal(media.length, 2);
  assert.deepEqual(media.map((m) => m.kind), ['tour360', 'tour360']);
});

test('images come before tours and video, and positions are renumbered', () => {
  const media = normaliseMedia([
    { url: 'https://youtu.be/a' },
    { url: '/continguts/immobiliaria/a.jpg' },
    { url: 'https://my.matterport.com/show/?m=b' },
    { url: '/continguts/immobiliaria/b.jpg' },
  ]);
  assert.deepEqual(media.map((m) => m.kind), ['image', 'image', 'tour360', 'video']);
  assert.deepEqual(media.map((m) => m.position), [0, 1, 2, 3]);
});

test('garage given as an area sets both the flag and the area', () => {
  const p = normaliseProperty({ details: { 'garatge': '146 m2' }, parish: 'Ordino' });
  assert.equal(p.garage, true);
  assert.equal(p.garage_m2, 146);
});

test('garage given as Sí/No stays a plain flag', () => {
  assert.equal(normaliseProperty({ details: { 'garatge': 'Sí' } }).garage, true);
  assert.equal(normaliseProperty({ details: { 'garatge': 'No' } }).garage, false);
  assert.equal(normaliseProperty({ details: { 'garatge': 'No' } }).garage_m2, null);
});

test('garden and balcony are lifted out of the raw label map', () => {
  const p = normaliseProperty({ details: { 'jardí': '90 m2', 'balcó': '17 m2' } });
  assert.equal(p.garden_m2, 90);
  assert.equal(p.balcony_m2, 17);
});

test('a surface published as 0 m2 is recorded as absent, not zero', () => {
  const p = normaliseProperty({ details: { 'terrassa': '0 m2', 'jardí': '0 m2' } });
  assert.equal(p.terrace_m2, null);
  assert.equal(p.garden_m2, null);
});

test('a gallery entry with no filename is dropped', () => {
  const media = normaliseMedia([
    { url: 'https://rocpropietats.com/continguts/immobiliaria/a.jpg' },
    { url: 'https://rocpropietats.com/continguts/immobiliaria/' },
  ]);
  assert.equal(media.length, 1);
  assert.match(media[0].url, /a\.jpg$/);
});
