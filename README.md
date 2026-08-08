# Metasongs

A custom-built replacement for the metasongs.glide.page site: an Astro
frontend (full control over design/URLs) reading from a Supabase Postgres
database (full control over data, with a spreadsheet-like editor in the
Supabase dashboard for adding/editing songs).

## Data model

- `categories` — the curated taxonomy (Self-Referential, Interpolation, etc.)
- `artists`
- `songs` — belongs to one artist
- `song_tags` — free-form tags carried over from Glide's Category/Subcategory/
  Reference Type columns (these held comma-separated values in the source
  data, not a clean single relation, so they're modeled as tags rather than a
  fixed foreign key)
- `song_references` — self-referential many-to-many: which other songs a
  song references. `referenced_song_id` is null when the original text
  didn't match a known song title in this dataset; `referenced_title_raw`
  always preserves the original text.
