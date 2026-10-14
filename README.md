# ROC Propietats — property feed, JSON API and website

A daily feed of the ROC Propietats portfolio (Andorra), stored in Supabase,
served as a JSON API, and presented as a website built from the Barleigh Ellis
design system with Hamptons International co-branding.

| | |
| --- | --- |
| Website | https://roc-propietats.netlify.app |
| JSON feed | https://roc-propietats.netlify.app/api/properties |
| Repository | https://github.com/riode514/roc |
| Supabase | project `roc-propietats` (`zyzsdwnodaasutsoogix`, eu-west-1) |
| Netlify | project `roc-propietats` |

Currently carrying **76 listings** (72 for sale, 4 to let) in all four
languages ROC publishes in, with 921 images, 2 videos and 7 Matterport tours.

```
rocpropietats.com ──scraper──▶ Supabase ──▶ JSON API  (/api/properties)
    (GiraWeb CMS)                   │
                                    └──────▶ Website  (Astro, static)
```

| Piece | Where | What it does |
| --- | --- | --- |
| `scraper/` | GitHub Actions, nightly | Crawls the source site, upserts into Supabase |
| `supabase/migrations/` | Supabase `roc-propietats` | Schema, RLS, the `properties_feed` view |
| `netlify/functions/` | Netlify | Public read-only JSON API |
| `web/` | Netlify | Astro site, statically built from Supabase |
| `docs/` | — | The original design export, its markup and assets |
| `scraper/roc-news.json` | repo | 29 news articles, four languages |
| `scraper/roc-pages.json` | repo | About and the three legal notices |
| `scraper/roc-parishes.json` | repo | Parish profiles, written for us |

## Getting set up

```bash
cp .env.example .env     # then fill in SUPABASE_SERVICE_ROLE_KEY
npm run build            # builds the website
```

The site build and the API only need `SUPABASE_PUBLISHABLE_KEY`, which is
read-only by design — row-level security limits it to active listings. Only the
scraper needs `SUPABASE_SERVICE_ROLE_KEY`, which must never reach the browser.

## The scraper

```bash
npm run scrape:dry                       # crawl to JSON, write nothing
npm run scrape                           # crawl and upsert into Supabase
node scraper/src/index.js --refs 3558    # one listing, for debugging
node scraper/src/to-sql.js out.json      # emit SQL instead of using the API
```

Three things about the source site are worth knowing before changing anything
in `scraper/src/`:

1. **Listings must be paged with an explicit sort.** The default ordering is
   not stable between requests. Paging through it returns duplicates and drops
   listings — a full pass over the 72 sale listings yielded only 49. Every page
   request, including the first, sends `ordenar=preu-asc`. If a crawl still
   comes up short, the scraper sweeps again by `preu-desc` rather than
   publishing an incomplete feed.

2. **Requests need a browser-like header set**, or the host answers `403`.

3. **`robots.txt` asks for a 33-second crawl delay**, which the scraper honours
   by default. A full pass in two languages therefore takes over an hour, which
   is why it runs as a GitHub Action rather than a serverless function.
   `ROC_CRAWL_DELAY_MS` lowers it for local work; please leave production alone.

### How a listing is parsed

The CMS renders its "Detalls" block as paired `<ul>` columns — labels in the
first list, values at matching indexes in the second — and the set of labels
varies per listing: a plot shows `Terreny`, a villa shows `Vivenda` and
`Terrassa`. Labels are therefore read generically and mapped onto columns via
`SURFACE_LABELS` / `FIELD_LABELS` in `scraper/src/site.js`. Anything unmapped is
still preserved in `properties.details`, so no source data is silently lost.

Titles are composed rather than scraped: the source has no title field, so
`"{type}, {sublocation}"` is assembled from the gallery `alt`, matching the
design's "Contemporary Chalet, Engolasters".

## The JSON API

```
GET /api/properties                     every active listing
GET /api/properties?for=sale            sales only (or for=rent)
GET /api/properties?parish=Ordino       by parish
GET /api/properties?min=1000000&max=5000000
GET /api/properties?bedrooms=4
GET /api/properties?lang=en             flatten to one language
GET /api/properties/3558                a single listing
GET /feed.json                          alias for the full feed
```

Each property carries reference, transaction, parish and sublocation, price,
bedrooms, bathrooms, garage, all four surface measurements (built, living,
**plot**, terrace), per-language title/description/type/features, and media
split into `images`, `videos`, `tours360` and `floorplans`.

## Scheduled refresh

`.github/workflows/scrape.yml` runs at 03:20 UTC daily and can be triggered by
hand with a custom delay. Add these under
**Settings → Secrets and variables → Actions** before the first run:

| Secret | Value |
| --- | --- |
| `SUPABASE_URL` | `https://zyzsdwnodaasutsoogix.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase dashboard → Project Settings → API → `service_role` |
| `NETLIFY_BUILD_HOOK` | `https://api.netlify.com/build_hooks/6acfd2512a1d00672b5c1bd0` |

Until `SUPABASE_SERVICE_ROLE_KEY` is set the workflow will fail on its first
step; nothing else depends on it, and the data already loaded is unaffected.

Listings that disappear from the source are marked `is_active = false` with a
`delisted_at` timestamp rather than deleted, so history is kept and the public
feed drops them automatically. Every run is recorded in `crawl_runs`.

## The website

Astro, statically generated — 316 pages. English sits at the root and the
others under `/es/`, `/ca/` and `/fr/`; each has `/residences/` for the
filterable portfolio and `/residences/<slug>/` per listing. The sitemap
declares `hreflang` alternates so search engines serve the right language.
The enquiry form posts to Netlify Forms.

All site copy lives in `web/src/lib/i18n.js`, not in the components. Property
titles and descriptions come from the database, and each field falls back
through the languages on its own — ROC has not translated everything (French
has 48 descriptions of 76, Spanish 70), so a listing keeps its title in the
chosen language even where the description has to come from another.

Interface labels say **Location**, not Parish: the term is correct for Andorra
but unfamiliar to buyers abroad. The parish names themselves are unchanged.

### Palette

The design offers three schemes and defaults to **Mid navy & yellow**, which
keeps the Hamptons navy and brings back the yellow from ROC's previous site.
They are defined once, on `:root` in `web/src/layouts/Base.astro`:

| | `--roc-ink` | `--roc-accent` | `--roc-accent2` |
| --- | --- | --- | --- |
| **Mid navy & yellow** | `#13294B` | `#5B6F8F` | `#FFED00` |
| Navy | `#13294B` | `#5B6F8F` | `#C5CFDA` |
| Graphite & stone | `#222420` | `#8A8A7A` | `#A8A898` |

The yellow is only ever used on navy — as the dot in the ROC wordmark, the
footer and association labels, and the hero button's hover. On the cream
header the dot takes the mid-navy accent instead, because yellow on cream
does not read.

The hero photograph (`web/public/hero/`) is the Andorran landscape supplied by
the client rather than a listing image, so the page is not tied to a property
that may sell. Its scrim is tuned to that photograph.

The design came from a Claude Design export. `docs/design-source.html` is the
extracted source, `docs/design-markup.html` the markup alone, and
`docs/design-assets/` the fonts and logos; `web/src/styles/` holds the design
system's own CSS, unchanged apart from rewriting font URLs.

## Where each kind of content lives

The listings are in Supabase. They earn it: 76 of them, filtered on the site,
served as a JSON API, and re-checked nightly so a sold property drops out.

The editorial content — news, the about and legal pages, the parish profiles —
is files in `scraper/`. It is 29 articles in four years, four standing pages
and seven profiles, all static once written, with no filtering, no API and no
delisting. As files they are versioned and diffable, the build needs no round
trip for them, and the scheduled crawl commits a change rather than writing to
a table nothing else reads.

Two things about ROC's news worth knowing. Every article's byline and date are
the theme's placeholders — "Ali Tufan", January 2020, on all of them — so the
real date comes from the URL. And for articles ROC has not actually
translated, their Spanish and French pages serve the Catalan title with no
body; stored as-is those would claim to be translations, so they are dropped
and the page falls back honestly instead.

Article bodies are third-party HTML that ends up on our pages, so they are
reduced to a tag allowlist at ingest (`scraper/src/news.js`): prose tags only,
and the single attribute kept is `href` on a link, which must be http(s).

## The parish profiles

`scraper/roc-parishes.json` holds a short profile of each of the seven
parishes — an intro line, three paragraphs and three highlights — in all four
languages, written for this site rather than scraped. They drive the accordion
on the home page and a page per parish at `/locations/<slug>/`, which lists
that parish's properties alongside the writing.

They replaced one-line notes that referred to the **Vallnord** ski brand,
which has been retired: Pal Arinsal folded into Grandvalira Resorts and Ordino
Arcalís before it. The profiles name the resorts themselves. Worth a check
against the operators' current naming before any print use.

## Data source

Listings are collected from the public pages of rocpropietats.com. The schema
keeps the ingest isolated behind `scraper/src/`, so if ROC supply an official
XML or JSON export the crawler can be replaced without touching the database,
the API or the site.
