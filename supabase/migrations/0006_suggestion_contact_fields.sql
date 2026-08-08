-- Optional contact fields on the public Contribute form, so you can follow
-- up with whoever submitted a suggestion if you want to.
alter table song_suggestions add column name text;
alter table song_suggestions add column email text;
