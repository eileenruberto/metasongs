-- Replaces straight apostrophes (') with the typographic right single quote
-- (’) across public-facing content. Doesn't touch slugs -- the slug trigger
-- only regenerates a slug when it's null/empty, and slugify() strips
-- apostrophes either way, so existing URLs are unaffected.

update songs set title = replace(title, '''', '’') where title like '%''%';
update songs set meta_lyrics = replace(meta_lyrics, '''', '’') where meta_lyrics like '%''%';
update songs set description = replace(description, '''', '’') where description like '%''%';
update songs set album = replace(album, '''', '’') where album like '%''%';

update artists set name = replace(name, '''', '’') where name like '%''%';

update categories set name = replace(name, '''', '’') where name like '%''%';
update categories set description = replace(description, '''', '’') where description like '%''%';

update song_tags set value = replace(value, '''', '’') where value like '%''%';

update song_references set referenced_title_raw = replace(referenced_title_raw, '''', '’') where referenced_title_raw like '%''%';
