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

See `supabase/migrations/0001_init_schema.sql` for the full schema.

## One-time setup

1. **Create a Supabase project** at https://supabase.com (free tier is plenty for this). Note the project's Project URL and publishable/`anon` API key (Project Settings → API).
2. `.env` should already have those two values (`SUPABASE_URL`, `SUPABASE_ANON_KEY`) — copy `.env.example` if you need to recreate it.
3. Load the schema and data via the Supabase dashboard's **SQL Editor** (Project → SQL Editor → New query) — no CLI or extra credentials needed:
   - Paste in and run each file in `supabase/migrations/`, in order (`0001_...` through the highest-numbered one).
   - Paste in and run `supabase/seed.sql`.
4. Install dependencies and run the site:
   ```sh
   npm install
   npm run dev
   ```

(The Supabase CLI is an alternative to step 3 if you're comfortable with it,
but it needs a personal access token to log in and your database password to
link — two more credentials than the SQL Editor path needs.)

This project needs **Node 22+**. If your global `node` is older, run
commands with an explicit path, e.g.
`/opt/homebrew/opt/node@22/bin/npm run dev`.

## Editing content

Use the built-in admin at `/admin` — forms tailored to this data (paste a
Spotify/Apple Music link and it fetches title, artist, cover art, and every
platform link via song.link), an artist search-or-create picker, and a
suggestions inbox for the public Contribute form. See
`src/components/admin/` and `src/pages/admin/`.

One-time setup: create your own login in the Supabase dashboard →
Authentication → Users → Add user. There's no public sign-up route anywhere
in the app; that's the only way in.

The Supabase dashboard's Table Editor still works too, as a spreadsheet-like
grid, if you ever need to bulk-edit or fix something the admin UI doesn't
cover.

A song only appears on the public site once its `published` column is
checked. Song, artist, and category pages render on-demand (see
`export const prerender = false` in those pages) rather than being
pre-built, so new content shows up immediately — no rebuild or redeploy
needed.

## Re-running the CSV import

`scripts/transform_export.py` regenerates `supabase/seed.sql` from the raw
Glide export in `../2026-07-16 - Metasongs Export/`. It's idempotent (the
seed file starts with `truncate ... cascade`) and only needed if you want to
redo the migration from scratch. It's not part of the ongoing editing
workflow — once data lives in Supabase, edit it there.

## Deploying

Song/artist/category pages render on-demand, so this needs a host that runs
a small server function, not plain static hosting. It's currently set up for
**Vercel** (`@astrojs/vercel` in `astro.config.mjs`) — connect the git repo,
set `SUPABASE_URL` / `SUPABASE_ANON_KEY` as environment variables, done. No
manual rebuild step; content changes go live as soon as they're saved in
Supabase.

To use Netlify instead: `npm uninstall @astrojs/vercel`,
`npx astro add netlify`, redeploy.
