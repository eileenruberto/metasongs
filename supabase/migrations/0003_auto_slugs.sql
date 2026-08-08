-- Auto-generate slugs so nobody has to type one in the table editor.
-- `id` already defaults to gen_random_uuid() from the init migration --
-- this does the same for `slug`, deriving it from title/name and
-- de-duplicating on collision (e.g. "Youre So Vain" -> "youre-so-vain",
-- "youre-so-vain-2" for a second song with the same slugified title).

create or replace function slugify(value text) returns text
language sql immutable as $$
  select trim(both '-' from regexp_replace(lower(trim(value)), '[^a-z0-9]+', '-', 'g'));
$$;

create or replace function songs_set_slug() returns trigger
language plpgsql as $$
declare
  base_slug text;
  candidate text;
  n int := 1;
begin
  if new.slug is null or trim(new.slug) = '' then
    base_slug := slugify(new.title);
    candidate := base_slug;
    while exists (select 1 from songs where slug = candidate and id is distinct from new.id) loop
      n := n + 1;
      candidate := base_slug || '-' || n;
    end loop;
    new.slug := candidate;
  end if;
  return new;
end;
$$;

drop trigger if exists songs_slug_trigger on songs;
create trigger songs_slug_trigger
before insert or update on songs
for each row execute function songs_set_slug();

create or replace function artists_set_slug() returns trigger
language plpgsql as $$
declare
  base_slug text;
  candidate text;
  n int := 1;
begin
  if new.slug is null or trim(new.slug) = '' then
    base_slug := slugify(new.name);
    candidate := base_slug;
    while exists (select 1 from artists where slug = candidate and id is distinct from new.id) loop
      n := n + 1;
      candidate := base_slug || '-' || n;
    end loop;
    new.slug := candidate;
  end if;
  return new;
end;
$$;

drop trigger if exists artists_slug_trigger on artists;
create trigger artists_slug_trigger
before insert or update on artists
for each row execute function artists_set_slug();
