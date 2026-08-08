-- Suggestions submitted through the public /contribute form.
-- Insert-only for anonymous visitors; no public select policy, so
-- submissions aren't readable by other visitors, only from the Supabase
-- dashboard (Table Editor) as the project owner.

create table song_suggestions (
  id uuid primary key default gen_random_uuid(),
  song_title text not null,
  artist text not null,
  song_link text,
  songs_referenced text,
  comments text,
  created_at timestamptz not null default now()
);

alter table song_suggestions enable row level security;

create policy "anyone can submit a suggestion" on song_suggestions
  for insert
  to anon
  with check (true);
