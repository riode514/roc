-- ROC Propietats feed — initial schema
-- Source: rocpropietats.com (GiraWeb CMS), parishes of Andorra.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- properties — one row per listing (reference + transaction is the natural key)
-- ---------------------------------------------------------------------------
create table if not exists properties (
  id              uuid primary key default gen_random_uuid(),
  reference       text        not null,
  transaction     text        not null check (transaction in ('sale', 'rent')),

  parish          text,
  sublocation     text,

  price           numeric(14,2),
  currency        text        not null default 'EUR',
  price_text      text,

  bedrooms        integer,
  bathrooms       integer,
  garage          boolean,

  -- Surfaces. GiraWeb exposes a varying set of labels per listing, so each
  -- known surface gets a column and the full label/value map is kept in
  -- `details` for anything we have not modelled.
  built_m2        numeric(10,2),   -- "Superficie"
  living_m2       numeric(10,2),   -- "Vivenda"
  plot_m2         numeric(10,2),   -- "Terreny"
  terrace_m2      numeric(10,2),   -- "Terrassa"

  details         jsonb       not null default '{}'::jsonb,

  source_path     text,            -- canonical Catalan path
  is_active       boolean     not null default true,
  first_seen_at   timestamptz not null default now(),
  last_seen_at    timestamptz not null default now(),
  delisted_at     timestamptz,

  constraint properties_reference_transaction_key unique (reference, transaction)
);

create index if not exists properties_transaction_idx on properties (transaction);
create index if not exists properties_parish_idx      on properties (parish);
create index if not exists properties_price_idx       on properties (price);
create index if not exists properties_active_idx      on properties (is_active) where is_active;

-- ---------------------------------------------------------------------------
-- property_translations — per-language title, description, type, features
-- ---------------------------------------------------------------------------
create table if not exists property_translations (
  property_id     uuid        not null references properties (id) on delete cascade,
  lang            text        not null check (lang in ('ca', 'en', 'es', 'fr')),

  title           text,            -- composed: "{type}, {sublocation}"
  description     text,
  property_type   text,            -- "Xalet" / "Chalet" / "Terreny" / "Land"
  features        text[]      not null default '{}',
  source_url      text,

  primary key (property_id, lang)
);

-- ---------------------------------------------------------------------------
-- property_media — images, video, 360 tours, floorplans
-- ---------------------------------------------------------------------------
create table if not exists property_media (
  id              uuid primary key default gen_random_uuid(),
  property_id     uuid        not null references properties (id) on delete cascade,
  kind            text        not null default 'image'
                    check (kind in ('image', 'video', 'tour360', 'floorplan', 'document')),
  url             text        not null,
  provider        text,            -- youtube | vimeo | matterport | kuula | self
  position        integer     not null default 0,
  alt             text,
  created_at      timestamptz not null default now(),

  constraint property_media_property_url_key unique (property_id, url)
);

create index if not exists property_media_property_idx on property_media (property_id, kind, position);

-- ---------------------------------------------------------------------------
-- crawl_runs — one row per scraper execution, for monitoring and diffing
-- ---------------------------------------------------------------------------
create table if not exists crawl_runs (
  id              uuid primary key default gen_random_uuid(),
  started_at      timestamptz not null default now(),
  finished_at     timestamptz,
  status          text        not null default 'running'
                    check (status in ('running', 'success', 'partial', 'failed')),
  listings_found  integer     not null default 0,
  properties_upserted integer not null default 0,
  media_upserted  integer     not null default 0,
  delisted        integer     not null default 0,
  errors          jsonb       not null default '[]'::jsonb,
  notes           text
);

-- ---------------------------------------------------------------------------
-- Public read-only access. Writes happen only via the service-role key used by
-- the scheduled scraper, which bypasses RLS.
-- ---------------------------------------------------------------------------
alter table properties             enable row level security;
alter table property_translations  enable row level security;
alter table property_media         enable row level security;
alter table crawl_runs             enable row level security;

create policy "public read active properties"
  on properties for select to anon, authenticated
  using (is_active);

create policy "public read translations"
  on property_translations for select to anon, authenticated
  using (exists (select 1 from properties p
                 where p.id = property_translations.property_id and p.is_active));

create policy "public read media"
  on property_media for select to anon, authenticated
  using (exists (select 1 from properties p
                 where p.id = property_media.property_id and p.is_active));

-- crawl_runs stays private: no select policy for anon/authenticated.

-- ---------------------------------------------------------------------------
-- properties_feed — flattened view that powers the JSON API and the website
-- ---------------------------------------------------------------------------
create or replace view properties_feed
with (security_invoker = true) as
select
  p.id,
  p.reference,
  p.transaction,
  p.parish,
  p.sublocation,
  p.price,
  p.currency,
  p.price_text,
  p.bedrooms,
  p.bathrooms,
  p.garage,
  p.built_m2,
  p.living_m2,
  p.plot_m2,
  p.terrace_m2,
  p.details,
  p.source_path,
  p.first_seen_at,
  p.last_seen_at,
  coalesce(
    jsonb_object_agg(t.lang, jsonb_build_object(
      'title',         t.title,
      'description',   t.description,
      'property_type', t.property_type,
      'features',      t.features,
      'source_url',    t.source_url
    )) filter (where t.lang is not null),
    '{}'::jsonb
  ) as translations,
  coalesce(
    (select jsonb_agg(jsonb_build_object(
       'kind',     m.kind,
       'url',      m.url,
       'provider', m.provider,
       'alt',      m.alt
     ) order by m.kind, m.position)
     from property_media m where m.property_id = p.id),
    '[]'::jsonb
  ) as media
from properties p
left join property_translations t on t.property_id = p.id
where p.is_active
group by p.id;
