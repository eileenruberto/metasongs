export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

export interface Artist {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  is_most_referenced: boolean;
}

export interface SongTag {
  tag_type: 'category' | 'subcategory' | 'reference_type';
  value: string;
}

export interface ReferencedSong {
  slug: string;
  title: string;
  image_url: string | null;
  artist: { name: string };
}

export interface SongReference {
  referenced_title_raw: string;
  referenced_song: ReferencedSong | null;
}

export interface Song {
  id: string;
  slug: string;
  title: string;
  image_url: string | null;
  spotify_url: string | null;
  apple_music_url: string | null;
  song_link_url: string | null;
  meta_lyrics: string | null;
  description: string | null;
  source_url: string | null;
  album: string | null;
  featured_artists: { slug: string; name: string }[];
  sentiment: string | null;
  published: boolean;
  created_at: string;
  artist: { slug: string; name: string; image_url: string | null };
  song_tags: SongTag[];
  references: SongReference[];
}
