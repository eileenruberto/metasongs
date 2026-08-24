import { useEffect, useState } from 'preact/hooks';
import type { SupabaseClient } from '@supabase/supabase-js';
import AdminPage from './AdminPage';

interface SongRow {
  id: string;
  title: string;
  slug: string;
  published: boolean;
  artist: { name: string } | null;
  song_tags: { tag_type: string }[];
}

// Mirrors isMetasong() in the site's data layer: a song counts as a real,
// curated metasong (vs. a stub row that exists only as a target for other
// songs' references) if it has at least one category tag.
function isMetasong(song: Pick<SongRow, 'song_tags'>): boolean {
  return song.song_tags.some((t) => t.tag_type === 'category');
}

function CreatedToast({ slug, onDismiss }: { slug: string; onDismiss: () => void }) {
  return (
    <div class="admin-toast admin-toast-success">
      <button type="button" class="admin-toast-dismiss" aria-label="Dismiss" onClick={onDismiss}>
        ×
      </button>
      <h2 class="admin-toast-heading">Song added successfully</h2>
      <div class="admin-toast-actions">
        <a href={`/songs/${slug}`} target="_blank" rel="noopener" class="admin-toast-pill">
          View on site <span aria-hidden="true">↗</span>
        </a>
        <a href="/admin/songs/new" class="admin-toast-pill">
          Add new song
        </a>
      </div>
    </div>
  );
}

function SongsGroupTable({
  songs,
  onDelete,
}: {
  songs: SongRow[];
  onDelete: (id: string, title: string) => void;
}) {
  if (songs.length === 0) return <p class="admin-status">None yet.</p>;

  return (
    <table class="admin-table">
      <thead>
        <tr>
          <th>Title</th>
          <th>Artist</th>
          <th>Published</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {songs.map((s) => (
          <tr key={s.id}>
            <td>{s.title}</td>
            <td>{s.artist?.name}</td>
            <td>{s.published ? 'Yes' : 'No'}</td>
            <td style={{ display: 'flex', gap: '0.75rem' }}>
              <a href={`/admin/songs/edit?id=${s.id}`}>Edit</a>
              <a href={`/songs/${s.slug}`} target="_blank" rel="noopener">
                View
              </a>
              <a href="#" onClick={(e) => (e.preventDefault(), onDelete(s.id, s.title))}>
                Delete
              </a>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SongsTable({ supabase }: { supabase: SupabaseClient }) {
  const [songs, setSongs] = useState<SongRow[] | null>(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [createdSlug, setCreatedSlug] = useState<string | null>(null);

  useEffect(() => {
    const slug = new URLSearchParams(window.location.search).get('created');
    if (slug) {
      setCreatedSlug(slug);
      const url = new URL(window.location.href);
      url.searchParams.delete('created');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  const load = async () => {
    const { data } = await supabase
      .from('songs')
      .select('id, title, slug, published, artist:artists!songs_artist_id_fkey ( name ), song_tags ( tag_type )')
      .order('title');
    setSongs((data ?? []) as any);
  };

  useEffect(() => {
    load();
  }, []);

  const remove = async (id: string, title: string) => {
    if (!window.confirm(`Delete "${title}"? This can't be undone.`)) return;
    setStatus('Deleting…');
    const { error } = await supabase.from('songs').delete().eq('id', id);
    setStatus(error ? error.message : '');
    await load();
  };

  if (songs === null) return <p class="admin-loading">Loading…</p>;

  const filtered = query.trim()
    ? songs.filter(
        (s) =>
          s.title.toLowerCase().includes(query.trim().toLowerCase()) ||
          (s.artist?.name ?? '').toLowerCase().includes(query.trim().toLowerCase())
      )
    : songs;

  const metasongs = filtered.filter(isMetasong);
  const referencedSongs = filtered.filter((s) => !isMetasong(s));

  return (
    <>
      {createdSlug && <CreatedToast slug={createdSlug} onDismiss={() => setCreatedSlug(null)} />}
      <h1>Songs ({songs.length})</h1>
      <input
        type="text"
        class="admin-search"
        placeholder="Search by title or artist…"
        value={query}
        onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
      />
      {status && <p class="admin-status">{status}</p>}

      <h2>Metasongs ({metasongs.length})</h2>
      <SongsGroupTable songs={metasongs} onDelete={remove} />

      <h2>Referenced Songs ({referencedSongs.length})</h2>
      <SongsGroupTable songs={referencedSongs} onDelete={remove} />
    </>
  );
}

export default function AdminSongsList({ supabaseUrl, supabaseAnonKey }: { supabaseUrl: string; supabaseAnonKey: string }) {
  return (
    <AdminPage supabaseUrl={supabaseUrl} supabaseAnonKey={supabaseAnonKey} active="/admin/songs">
      {({ supabase }) => <SongsTable supabase={supabase} />}
    </AdminPage>
  );
}
