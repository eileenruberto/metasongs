-- Metasongs schema
-- Source: migrated from a Glide app (Artists / Categories / Songs tables).
-- Category/Subcategory/Reference Type on songs were free-form, sometimes
-- comma-separated tags in Glide rather than a strict single relation, so
-- they're modeled as a generic song_tags join table instead of a fixed FK.

create extension if not exists pgcrypto;

create table categories (
  id uuid primary key default gen_random_uuid(),
  glide_row_id text unique,
  name text not null unique,
  slug text not null unique,
  description text,
  created_at timestamptz not null default now()
);

create table artists (
  id uuid primary key default gen_random_uuid(),
  glide_row_id text unique,
  name text not null unique,
  slug text not null unique,
  image_url text,
  is_most_referenced boolean not null default false,
  created_at timestamptz not null default now()
);

create table songs (
  id uuid primary key default gen_random_uuid(),
  glide_row_id text unique,
  slug text not null unique,
  title text not null,
  artist_id uuid not null references artists(id) on delete restrict,
  image_url text,
  spotify_url text,
  apple_music_url text,
  song_link_url text,
  meta_lyrics text,
  description text,
  source_url text,
  album text,
  featured_artists text,
  sentiment text,
  published boolean not null default false,
  created_at timestamptz not null default now()
);

create index songs_artist_id_idx on songs(artist_id);
create index songs_published_idx on songs(published);

-- Free-form tags carried over from Glide's Category / Subcategory / Reference
-- Type columns (which held comma-separated values, not clean single FKs).
create table song_tags (
  song_id uuid not null references songs(id) on delete cascade,
  tag_type text not null check (tag_type in ('category', 'subcategory', 'reference_type')),
  value text not null,
  primary key (song_id, tag_type, value)
);

create index song_tags_value_idx on song_tags(tag_type, value);

-- Self-referential many-to-many: which other songs a song references.
-- referenced_song_id is null when the raw text from Glide didn't match any
-- known song title (typo, or the referenced song isn't in this dataset) --
-- referenced_title_raw preserves the original text either way.
create table song_references (
  song_id uuid not null references songs(id) on delete cascade,
  referenced_song_id uuid references songs(id) on delete set null,
  referenced_title_raw text not null,
  primary key (song_id, referenced_title_raw)
);

create index song_references_referenced_song_id_idx on song_references(referenced_song_id);

alter table categories enable row level security;
alter table artists enable row level security;
alter table songs enable row level security;
alter table song_tags enable row level security;
alter table song_references enable row level security;

-- Public, read-only site: anyone can read; only published songs are visible
-- to anonymous readers. Writes happen via the Supabase dashboard using your
-- own account (service role / authenticated owner), not through the site.
create policy "categories are publicly readable" on categories
  for select using (true);

create policy "artists are publicly readable" on artists
  for select using (true);

create policy "published songs are publicly readable" on songs
  for select using (published = true);

create policy "tags of published songs are publicly readable" on song_tags
  for select using (
    exists (select 1 from songs where songs.id = song_tags.song_id and songs.published = true)
  );

create policy "references of published songs are publicly readable" on song_references
  for select using (
    exists (select 1 from songs where songs.id = song_references.song_id and songs.published = true)
  );
