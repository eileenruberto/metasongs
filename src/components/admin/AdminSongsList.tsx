import { useEffect, useState } from 'preact/hooks';
import type { SupabaseClient } from '@supabase/supabase-js';
import AdminPage from './AdminPage';

interface SongRow {
  id: string;
  title: string;
  slug: string;
  published: boolean;
  artist: { name: string } | null;
}

function SongsTable({ supabase }: { supabase: SupabaseClient }) {
  const [songs, setSongs] = useState<SongRow[] | null>(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');

  const load = async () => {
    const { data } = await supabase
      .from('songs')
      .select('id, title, slug, published, artist:artists!songs_artist_id_fkey ( name )')
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

  return (
    <>
      <h1>Songs ({songs.length})</h1>
      <input
        type="text"
        class="admin-search"
        placeholder="Search by title or artist…"
        value={query}
        onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
      />
      {status && <p class="admin-status">{status}</p>}
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
          {filtered.map((s) => (
            <tr key={s.id}>
              <td>{s.title}</td>
              <td>{s.artist?.name}</td>
              <td>{s.published ? 'Yes' : 'No'}</td>
              <td style={{ display: 'flex', gap: '0.75rem' }}>
                <a href={`/admin/songs/edit?id=${s.id}`}>Edit</a>
                <a href={`/songs/${s.slug}`} target="_blank" rel="noopener">
                  View
                </a>
                <a href="#" onClick={(e) => (e.preventDefault(), remove(s.id, s.title))}>
                  Delete
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
