-- Write access for the admin UI. There's no public sign-up flow anywhere in
-- this app -- the only Supabase Auth users are ones you create yourself in
-- the dashboard (Authentication > Users > Add user) -- so "authenticated"
-- effectively means "signed in as the site owner" and can safely get full
-- read/write on the content tables.

create policy "authenticated can manage categories" on categories
  for all to authenticated using (true) with check (true);

create policy "authenticated can manage artists" on artists
  for all to authenticated using (true) with check (true);

create policy "authenticated can manage songs" on songs
  for all to authenticated using (true) with check (true);

create policy "authenticated can manage song_tags" on song_tags
  for all to authenticated using (true) with check (true);

create policy "authenticated can manage song_references" on song_references
  for all to authenticated using (true) with check (true);

create policy "authenticated can view suggestions" on song_suggestions
  for select to authenticated using (true);

create policy "authenticated can delete suggestions" on song_suggestions
  for delete to authenticated using (true);
