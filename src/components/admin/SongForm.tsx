import { useEffect, useState } from 'preact/hooks';
import type { SupabaseClient } from '@supabase/supabase-js';
import ArtistPicker from './ArtistPicker';
import TagInput from './TagInput';
import SongReferencePicker, { type ReferenceEntry } from './SongReferencePicker';
import FeaturedArtistsPicker, { type FeaturedArtistEntry } from './FeaturedArtistsPicker';

interface Props {
  supabase: SupabaseClient;
  songId?: string;
  initialLink?: string;
}

interface ArtistOption {
  id: string;
  name: string;
}

async function fetchSongLinkData(url: string) {
  // Goes through our own /api/songlink proxy rather than calling Odesli
  // directly -- their CORS policy only allows localhost, not production
  // origins, so a direct browser fetch works in dev and 500s once deployed.
  const res = await fetch(`/api/songlink?url=${encodeURIComponent(url)}`);
  if (!res.ok) throw new Error('Could not resolve that link. Double-check it and try again.');
  const data = await res.json();
  const entity = data.entitiesByUniqueId?.[data.entityUniqueId];
  return {
    title: entity?.title ?? '',
    artistName: entity?.artistName ?? '',
    imageUrl: entity?.thumbnailUrl ?? '',
    spotifyUrl: data.linksByPlatform?.spotify?.url ?? '',
    appleMusicUrl: data.linksByPlatform?.appleMusic?.url ?? '',
    songLinkUrl: data.pageUrl ?? '',
  };
}

export default function SongForm({ supabase, songId, initialLink }: Props) {
  const isEdit = Boolean(songId);
  const [loading, setLoading] = useState(isEdit);

  const [linkInput, setLinkInput] = useState(initialLink ?? '');
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState<ArtistOption | null>(null);
  const [album, setAlbum] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [spotifyUrl, setSpotifyUrl] = useState('');
  const [appleMusicUrl, setAppleMusicUrl] = useState('');
  const [songLinkUrl, setSongLinkUrl] = useState('');
  const [metaLyrics, setMetaLyrics] = useState('');
  const [description, setDescription] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [featuredArtists, setFeaturedArtists] = useState<FeaturedArtistEntry[]>([]);
  const [sentiment, setSentiment] = useState('');
  const [published, setPublished] = useState(false);

  const [categoryTags, setCategoryTags] = useState<string[]>([]);
  const [subcategoryTags, setSubcategoryTags] = useState<string[]>([]);
  const [referenceTypeTags, setReferenceTypeTags] = useState<string[]>([]);
  const [references, setReferences] = useState<ReferenceEntry[]>([]);
  const [curatedCategories, setCuratedCategories] = useState<string[]>([]);

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'error'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedSlug, setSavedSlug] = useState<string | null>(null);
  const [backfilledCount, setBackfilledCount] = useState(0);

  useEffect(() => {
    supabase
      .from('categories')
      .select('name')
      .order('name')
      .then(({ data }: any) => setCuratedCategories((data ?? []).map((c: any) => c.name)));
  }, []);

  useEffect(() => {
    if (!songId) return;
    (async () => {
      const { data: song } = await supabase
        .from('songs')
        .select(
          `id, title, album, image_url, spotify_url, apple_music_url, song_link_url, meta_lyrics, description,
           source_url, sentiment, published,
           artist:artists!songs_artist_id_fkey ( id, name ),
           song_tags ( tag_type, value ),
           featured_artist_links:song_featured_artists ( artist:artists!song_featured_artists_artist_id_fkey ( id, name ) )`
        )
        .eq('id', songId)
        .single();

      if (song) {
        setTitle(song.title ?? '');
        setArtist((song.artist as any) ?? null);
        setAlbum(song.album ?? '');
        setImageUrl(song.image_url ?? '');
        setSpotifyUrl(song.spotify_url ?? '');
        setAppleMusicUrl(song.apple_music_url ?? '');
        setSongLinkUrl(song.song_link_url ?? '');
        setMetaLyrics(song.meta_lyrics ?? '');
        setDescription(song.description ?? '');
        setSourceUrl(song.source_url ?? '');
        setFeaturedArtists(((song as any).featured_artist_links ?? []).map((l: any) => l.artist));
        setSentiment(song.sentiment ?? '');
        setPublished(Boolean(song.published));
        const tags = (song.song_tags ?? []) as { tag_type: string; value: string }[];
        setCategoryTags(tags.filter((t) => t.tag_type === 'category').map((t) => t.value));
        setSubcategoryTags(tags.filter((t) => t.tag_type === 'subcategory').map((t) => t.value));
        setReferenceTypeTags(tags.filter((t) => t.tag_type === 'reference_type').map((t) => t.value));
      }

      const { data: refs } = await supabase
        .from('song_references')
        .select('referenced_title_raw, referenced_song_id')
        .eq('song_id', songId);
      setReferences((refs ?? []).map((r: any) => ({ title: r.referenced_title_raw, songId: r.referenced_song_id })));

      setLoading(false);
    })();
  }, [songId]);

  const handleFetchLink = async () => {
    if (!linkInput.trim()) return;
    setFetching(true);
    setFetchError(null);
    try {
      const result = await fetchSongLinkData(linkInput.trim());
      if (result.title) setTitle(result.title);
      if (result.imageUrl) setImageUrl(result.imageUrl);
      if (result.spotifyUrl) setSpotifyUrl(result.spotifyUrl);
      if (result.appleMusicUrl) setAppleMusicUrl(result.appleMusicUrl);
      if (result.songLinkUrl) setSongLinkUrl(result.songLinkUrl);
      if (result.artistName && (!artist || artist.name !== result.artistName)) {
        const { data: match } = await supabase.from('artists').select('id, name').ilike('name', result.artistName).limit(1);
        if (match && match.length > 0) {
          setArtist(match[0]);
        } else {
          setArtist({ id: '__pending__', name: result.artistName });
        }
      }
    } catch (err: any) {
      setFetchError(err.message ?? 'Something went wrong fetching that link.');
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    if (!title.trim()) return setSaveError('Song title is required.');

    let artistId = artist?.id ?? null;
    if (artistId === '__pending__') {
      const { data: created, error: createErr } = await supabase
        .from('artists')
        .insert({ name: artist!.name })
        .select('id')
        .single();
      if (createErr) return setSaveError(createErr.message);
      artistId = created.id;
    }
    if (!artistId) return setSaveError('Pick or add an artist.');

    setSaveStatus('saving');
    setSaveError(null);

    const payload = {
      title: title.trim(),
      artist_id: artistId,
      album: album.trim() || null,
      image_url: imageUrl.trim() || null,
      spotify_url: spotifyUrl.trim() || null,
      apple_music_url: appleMusicUrl.trim() || null,
      song_link_url: songLinkUrl.trim() || null,
      meta_lyrics: metaLyrics.trim() || null,
      description: description.trim() || null,
      source_url: sourceUrl.trim() || null,
      sentiment: sentiment.trim() || null,
      published,
    };

    let id = songId;
    if (isEdit) {
      const { error } = await supabase.from('songs').update(payload).eq('id', songId);
      if (error) {
        setSaveStatus('error');
        return setSaveError(error.message);
      }
      await supabase.from('song_tags').delete().eq('song_id', songId);
      await supabase.from('song_references').delete().eq('song_id', songId);
      await supabase.from('song_featured_artists').delete().eq('song_id', songId);
    } else {
      const { data: created, error } = await supabase.from('songs').insert(payload).select('id, slug').single();
      if (error) {
        setSaveStatus('error');
        return setSaveError(error.message);
      }
      id = created.id;
      setSavedSlug(created.slug);
    }

    const tagRows = [
      ...categoryTags.map((value) => ({ song_id: id, tag_type: 'category', value })),
      ...subcategoryTags.map((value) => ({ song_id: id, tag_type: 'subcategory', value })),
      ...referenceTypeTags.map((value) => ({ song_id: id, tag_type: 'reference_type', value })),
    ];
    if (tagRows.length > 0) await supabase.from('song_tags').insert(tagRows);

    if (references.length > 0) {
      await supabase.from('song_references').insert(
        references.map((r) => ({ song_id: id, referenced_song_id: r.songId, referenced_title_raw: r.title }))
      );
    }

    if (featuredArtists.length > 0) {
      await supabase
        .from('song_featured_artists')
        .insert(featuredArtists.map((a) => ({ song_id: id, artist_id: a.id })));
    }

    // This song might be the payoff for a reference someone typed as plain
    // text elsewhere (no matching song existed yet at the time). Link those
    // up now that this song exists, so nobody has to go back and re-fix them.
    // Matched loosely (case/punctuation/whitespace-insensitive) since the
    // typed reference and the eventual real title rarely match character
    // for character -- e.g. "O Come, All Ye Faithful" vs "O Come All Ye
    // Faithful".
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const targetNorm = normalize(title);
    const { data: candidates } = await supabase
      .from('song_references')
      .select('song_id, referenced_title_raw')
      .is('referenced_song_id', null);
    const matches = (candidates ?? []).filter((c) => normalize(c.referenced_title_raw) === targetNorm && c.song_id !== id);
    for (const m of matches) {
      await supabase
        .from('song_references')
        .update({ referenced_song_id: id })
        .eq('song_id', m.song_id)
        .eq('referenced_title_raw', m.referenced_title_raw);
    }
    setBackfilledCount(matches.length);

    if (isEdit) {
      const { data: current } = await supabase.from('songs').select('slug').eq('id', songId).single();
      setSavedSlug(current?.slug ?? null);
    }
    setSaveStatus('idle');
  };

  if (loading) return <p class="admin-loading">Loading…</p>;

  return (
    <form onSubmit={handleSubmit}>
      <div class="admin-card">
        <div class="admin-field">
          <span>Paste a Spotify or Apple Music link</span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="url"
              value={linkInput}
              placeholder="https://open.spotify.com/track/..."
              onInput={(e) => setLinkInput((e.target as HTMLInputElement).value)}
            />
            <button type="button" class="admin-button secondary" disabled={fetching} onClick={handleFetchLink}>
              {fetching ? 'Fetching…' : 'Fetch'}
            </button>
          </div>
          <p class="admin-status">
            Fills in title, artist, album art, and every platform link via song.link. Review before saving.
          </p>
          {fetchError && <p class="admin-error">{fetchError}</p>}
        </div>
      </div>

      <div class="admin-field">
        <span>Song Title</span>
        <input type="text" value={title} onInput={(e) => setTitle((e.target as HTMLInputElement).value)} required />
      </div>

      <div class="admin-field">
        <span>Artist</span>
        <ArtistPicker supabase={supabase} value={artist} onChange={setArtist} />
      </div>

      <div class="admin-field">
        <span>Album</span>
        <input type="text" value={album} onInput={(e) => setAlbum((e.target as HTMLInputElement).value)} />
      </div>

      {imageUrl && (
        <div class="admin-field">
          <span>Cover art preview</span>
          <img src={imageUrl} alt="" style={{ width: '96px', height: '96px', objectFit: 'cover', borderRadius: '8px' }} />
        </div>
      )}
      <div class="admin-field">
        <span>Image URL</span>
        <input type="url" value={imageUrl} onInput={(e) => setImageUrl((e.target as HTMLInputElement).value)} />
      </div>
      <div class="admin-field">
        <span>Spotify Link</span>
        <input type="url" value={spotifyUrl} onInput={(e) => setSpotifyUrl((e.target as HTMLInputElement).value)} />
      </div>
      <div class="admin-field">
        <span>Apple Music Link</span>
        <input type="url" value={appleMusicUrl} onInput={(e) => setAppleMusicUrl((e.target as HTMLInputElement).value)} />
      </div>
      <div class="admin-field">
        <span>Song Link (song.link)</span>
        <input type="url" value={songLinkUrl} onInput={(e) => setSongLinkUrl((e.target as HTMLInputElement).value)} />
      </div>

      <div class="admin-field">
        <span>Meta Lyrics</span>
        <textarea rows={4} value={metaLyrics} onInput={(e) => setMetaLyrics((e.target as HTMLTextAreaElement).value)} />
      </div>
      <div class="admin-field">
        <span>Description</span>
        <textarea rows={3} value={description} onInput={(e) => setDescription((e.target as HTMLTextAreaElement).value)} />
        <p class="admin-status">Markdown supported: **bold**, [links](url), &gt; quotes</p>
      </div>
      <div class="admin-field">
        <span>Source</span>
        <input type="text" value={sourceUrl} onInput={(e) => setSourceUrl((e.target as HTMLInputElement).value)} />
      </div>
      <div class="admin-field">
        <span>Featured Artists (Album or Artist)</span>
        <FeaturedArtistsPicker supabase={supabase} values={featuredArtists} onChange={setFeaturedArtists} />
      </div>
      <div class="admin-field">
        <span>Sentiment</span>
        <input type="text" value={sentiment} onInput={(e) => setSentiment((e.target as HTMLInputElement).value)} />
      </div>

      <div class="admin-field">
        <span>Category</span>
        <div class="admin-checkboxes" style={{ marginBottom: '0.5rem' }}>
          {curatedCategories
            .filter((c) => !categoryTags.includes(c))
            .map((c) => (
              <button
                key={c}
                type="button"
                class="admin-button secondary"
                onClick={() => setCategoryTags([...categoryTags, c])}
              >
                + {c}
              </button>
            ))}
        </div>
        <TagInput values={categoryTags} onChange={setCategoryTags} placeholder="Add a category…" />
      </div>

      <div class="admin-field">
        <span>Subcategory</span>
        <TagInput values={subcategoryTags} onChange={setSubcategoryTags} placeholder="e.g. Lyrics Only, Artist Name…" />
      </div>

      <div class="admin-field">
        <span>Reference Type</span>
        <TagInput values={referenceTypeTags} onChange={setReferenceTypeTags} placeholder="e.g. Lyrical, Melodical, Nominal…" />
      </div>

      <div class="admin-field">
        <span>Song(s) Referenced</span>
        <SongReferencePicker supabase={supabase} excludeSongId={songId} values={references} onChange={setReferences} />
      </div>

      <div class="admin-field">
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input type="checkbox" checked={published} onChange={(e) => setPublished((e.target as HTMLInputElement).checked)} />
          <span>Published</span>
        </label>
      </div>

      <button type="submit" class="admin-button" disabled={saveStatus === 'saving'}>
        {saveStatus === 'saving' ? 'Saving…' : isEdit ? 'Save changes' : 'Add song'}
      </button>
      {saveError && <p class="admin-error">{saveError}</p>}
      {savedSlug && (
        <p class="admin-status">
          Saved. <a href={`/songs/${savedSlug}`} target="_blank" rel="noopener">View on site →</a>
          {backfilledCount > 0 &&
            ` Also linked ${backfilledCount} existing reference${backfilledCount === 1 ? '' : 's'} that were pointing at this title as plain text.`}
        </p>
      )}
    </form>
  );
}
