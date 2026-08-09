-- Adds the "Lyrical Nods" category: songs that quote or riff on another
-- song's lyrics without reusing its melody, distinct from Interpolation
-- (which reuses the melody) and Namechecks (a mention with no lyrical quote).

insert into categories (name, slug, description) values (
  'Lyrical Nods',
  'lyrical-nods',
  'Songs that nod to another song''s lyrics — quoting or riffing on the words — without borrowing any of its melody.'
);
