-- Turns "Featured Artists (Album or Artist)" from a free-text column into a
-- real many-to-many relation to artists, so it can be linked on the song
-- page and folded into an artist's "Referenced In" list (e.g. Public
-- Enemy's "Fight the Power" namechecks Elvis Presley without referencing
-- any specific Elvis song -- that's a song-to-artist relation, not the
-- song-to-song one song_references models).

create table song_featured_artists (
  song_id uuid not null references songs(id) on delete cascade,
  artist_id uuid not null references artists(id) on delete cascade,
  primary key (song_id, artist_id)
);

alter table song_featured_artists enable row level security;

create policy "featured artists of published songs are publicly readable" on song_featured_artists
  for select using (
    exists (select 1 from songs where songs.id = song_featured_artists.song_id and songs.published = true)
  );

create policy "authenticated can manage song_featured_artists" on song_featured_artists
  for all to authenticated using (true) with check (true);

-- Backfill: split the old comma-separated text, match or create an artist
-- per name, and link it. Safe to re-run -- matches existing artists by
-- name before creating, and the join insert no-ops on conflict.
do $$
declare
  song_row record;
  raw_name text;
  clean_name text;
  found_id uuid;
begin
  for song_row in select id, featured_artists from songs where featured_artists is not null and btrim(featured_artists) <> '' loop
    foreach raw_name in array string_to_array(song_row.featured_artists, ',') loop
      clean_name := btrim(raw_name);
      continue when clean_name = '';

      select id into found_id from artists where lower(name) = lower(clean_name) limit 1;
      if found_id is null then
        insert into artists (name) values (clean_name) returning id into found_id;
      end if;

      insert into song_featured_artists (song_id, artist_id) values (song_row.id, found_id)
      on conflict do nothing;
    end loop;
  end loop;
end $$;

alter table songs drop column featured_artists;
