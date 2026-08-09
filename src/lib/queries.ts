import { supabase } from './supabase';
import type { Artist, Category, ReferencedSong, Song, SongReference } from './types';

// A song counts as a real, curated metasong (vs. a stub row that exists only
// as a target for other songs' references) if it has at least one category
// tag. Stub rows still get their own page — see getAllSongs — they just
// aren't listed in the main directory or an artist's "Metasongs by" list.
export function isMetasong(song: Pick<Song, 'song_tags'>): boolean {
  return song.song_tags.some((t) => t.tag_type === 'category');
}

const SONG_SELECT = `
  id, slug, title, image_url, spotify_url, apple_music_url, song_link_url,
  meta_lyrics, description, source_url, album, sentiment, published, created_at,
  artist:artists!songs_artist_id_fkey ( slug, name, image_url ),
  song_tags ( tag_type, value ),
  featured_artist_links:song_featured_artists ( artist:artists!song_featured_artists_artist_id_fkey ( slug, name ) )
`;

async function attachReferences(songs: Omit<Song, 'references'>[]): Promise<Song[]> {
  if (songs.length === 0) return [];
  const ids = songs.map((s) => s.id);

  const { data: outgoing, error: outErr } = await supabase
    .from('song_references')
    .select(
      'song_id, referenced_title_raw, referenced_song:songs!song_references_referenced_song_id_fkey ( slug, title, image_url, artist:artists!songs_artist_id_fkey ( name ) )'
    )
    .in('song_id', ids);
  if (outErr) throw outErr;

  const bySong = new Map<string, SongReference[]>();
  for (const row of outgoing ?? []) {
    const list = bySong.get(row.song_id) ?? [];
    list.push({
      referenced_title_raw: row.referenced_title_raw,
      referenced_song: (row.referenced_song as any) ?? null,
    });
    bySong.set(row.song_id, list);
  }

  return songs.map((s: any) => ({
    ...s,
    featured_artists: (s.featured_artist_links ?? []).map((l: any) => l.artist),
    references: bySong.get(s.id) ?? [],
  })) as Song[];
}

export async function getAllSongs(): Promise<Song[]> {
  const { data, error } = await supabase.from('songs').select(SONG_SELECT).order('created_at', { ascending: false });
  if (error) throw error;
  return attachReferences((data ?? []) as any);
}

export async function getSongBySlug(slug: string): Promise<Song | null> {
  const { data, error } = await supabase.from('songs').select(SONG_SELECT).eq('slug', slug).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const [withRefs] = await attachReferences([data as any]);

  const { data: referencedBy, error: refByErr } = await supabase
    .from('song_references')
    .select('song:songs!song_references_song_id_fkey ( slug, title, image_url, artist:artists!songs_artist_id_fkey ( name ) )')
    .eq('referenced_song_id', withRefs.id);
  if (refByErr) throw refByErr;

  return { ...withRefs, referencedBy: referencedBy?.map((r) => r.song) ?? [] } as Song & { referencedBy: any[] };
}

export async function getAllArtists(): Promise<Artist[]> {
  const { data, error } = await supabase.from('artists').select('id, name, slug, image_url, is_most_referenced').order('name');
  if (error) throw error;
  return data ?? [];
}

export async function getArtistBySlug(
  slug: string
): Promise<{ artist: Artist; songs: Song[]; referencedIn: ReferencedSong[] } | null> {
  const { data: artist, error } = await supabase
    .from('artists')
    .select('id, name, slug, image_url, is_most_referenced')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  if (!artist) return null;

  const { data: songs, error: songsErr } = await supabase
    .from('songs')
    .select(SONG_SELECT)
    .eq('artist_id', artist.id)
    .order('title');
  if (songsErr) throw songsErr;

  const songIds = (songs ?? []).map((s) => s.id);
  const bySlug = new Map<string, ReferencedSong>();

  // Songs that reference one of this artist's own songs directly.
  if (songIds.length > 0) {
    const { data: referencedInRows, error: refErr } = await supabase
      .from('song_references')
      .select('song:songs!song_references_song_id_fkey ( slug, title, image_url, artist:artists!songs_artist_id_fkey ( name ) )')
      .in('referenced_song_id', songIds);
    if (refErr) throw refErr;
    for (const row of referencedInRows ?? []) {
      const song = row.song as any;
      if (song) bySlug.set(song.slug, song);
    }
  }

  // Songs that namecheck this artist directly (e.g. "Fight the Power"
  // mentions Elvis Presley without referencing a specific Elvis song).
  const { data: featuredInRows, error: featuredErr } = await supabase
    .from('song_featured_artists')
    .select('song:songs!song_featured_artists_song_id_fkey ( slug, title, image_url, artist:artists!songs_artist_id_fkey ( name ) )')
    .eq('artist_id', artist.id);
  if (featuredErr) throw featuredErr;
  for (const row of featuredInRows ?? []) {
    const song = row.song as any;
    if (song) bySlug.set(song.slug, song);
  }

  const referencedIn = [...bySlug.values()].sort((a, b) => a.title.localeCompare(b.title));

  return { artist, songs: await attachReferences((songs ?? []) as any), referencedIn };
}

export async function getAllCategories(): Promise<Category[]> {
  const { data, error } = await supabase.from('categories').select('id, name, slug, description').order('name');
  if (error) throw error;
  return data ?? [];
}

export async function getCategoryBySlug(slug: string): Promise<{ category: Category; songs: Song[] } | null> {
  const { data: category, error } = await supabase
    .from('categories')
    .select('id, name, slug, description')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  if (!category) return null;

  const { data: tagRows, error: tagErr } = await supabase
    .from('song_tags')
    .select('song_id')
    .eq('tag_type', 'category')
    .eq('value', category.name);
  if (tagErr) throw tagErr;

  const songIds = [...new Set((tagRows ?? []).map((r) => r.song_id))];
  if (songIds.length === 0) return { category, songs: [] };

  const { data: songs, error: songsErr } = await supabase.from('songs').select(SONG_SELECT).in('id', songIds).order('title');
  if (songsErr) throw songsErr;

  return { category, songs: await attachReferences((songs ?? []) as any) };
}
