# ROC Propietats — property feed, JSON API and website

A daily feed of the ROC Propietats portfolio (Andorra), stored in Supabase,
served as a JSON API, and presented as a website built from the Barleigh Ellis
design system with Hamptons International co-branding.

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
hand with a custom delay. Repository secrets required:

| Secret | Purpose |
| --- | --- |
| `SUPABASE_URL` | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Write access for the scraper |
| `NETLIFY_BUILD_HOOK` | Optional — rebuilds the site after a successful crawl |

Listings that disappear from the source are marked `is_active = false` with a
`delisted_at` timestamp rather than deleted, so history is kept and the public
feed drops them automatically. Every run is recorded in `crawl_runs`.

## The website

Astro, statically generated. `/` and `/ca/` are the English and Catalan homes;
`/residences/` is the filterable portfolio and `/residences/<slug>/` each
listing. The enquiry form posts to Netlify Forms.

The design came from a Claude Design export. `docs/design-source.html` is the
extracted source, `docs/design-markup.html` the markup alone, and
`docs/design-assets/` the fonts and logos; `web/src/styles/` holds the design
system's own CSS, unchanged apart from rewriting font URLs.

## Data source

Listings are collected from the public pages of rocpropietats.com. The schema
keeps the ingest isolated behind `scraper/src/`, so if ROC supply an official
XML or JSON export the crawler can be replaced without touching the database,
the API or the site.
