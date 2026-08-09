-- Adds descriptions for categories that were missing them.

update categories set description = 'Songs that reference themselves — quoting their own lyrics, namechecking their own title, or having the artist call out their own name within the song.' where slug = 'self-referential';

update categories set description = 'Songs built around a dense string of references to other songs and artists, often stacking dozens of titles, lyrics, or namechecks into a single medley-style verse or chorus.' where slug = 'meta-medleys';

update categories set description = 'Songs that namecheck other artists, songs, or albums by name — a passing mention rather than a direct lyrical quote or melodic interpolation.' where slug = 'namechecks';
