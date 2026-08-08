import { useEffect, useState } from 'preact/hooks';
import type { SupabaseClient } from '@supabase/supabase-js';
import AdminPage from './AdminPage';

interface ArtistRow {
  id: string;
  name: string;
  image_url: string | null;
  is_most_referenced: boolean;
}

function ArtistRowEditor({ artist, supabase, onSaved }: { artist: ArtistRow; supabase: SupabaseClient; onSaved: () => void }) {
  const [name, setName] = useState(artist.name);
  const [imageUrl, setImageUrl] = useState(artist.image_url ?? '');
  const [status, setStatus] = useState('');
  const dirty = name !== artist.name || imageUrl !== (artist.image_url ?? '');

  const save = async () => {
    setStatus('Saving…');
    const { error } = await supabase
      .from('artists')
      .update({ name: name.trim(), image_url: imageUrl.trim() || null })
      .eq('id', artist.id);
    setStatus(error ? error.message : 'Saved');
    if (!error) onSaved();
  };

  return (
    <tr>
      <td>{imageUrl && <img src={imageUrl} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />}</td>
      <td>
        <input type="text" value={name} onInput={(e) => setName((e.target as HTMLInputElement).value)} />
      </td>
      <td>
        <input
          type="url"
          value={imageUrl}
          placeholder="Image URL"
          onInput={(e) => setImageUrl((e.target as HTMLInputElement).value)}
        />
      </td>
      <td>
        {dirty && (
          <button type="button" class="admin-button secondary" onClick={save}>
            Save
          </button>
        )}
        <span class="admin-status" style={{ display: 'inline' }}>
          {status}
        </span>
      </td>
    </tr>
  );
}

function ArtistsTable({ supabase }: { supabase: SupabaseClient }) {
  const [artists, setArtists] = useState<ArtistRow[] | null>(null);
  const [query, setQuery] = useState('');

  const load = async () => {
    const { data } = await supabase.from('artists').select('id, name, image_url, is_most_referenced').order('name');
    setArtists((data ?? []) as any);
  };

  useEffect(() => {
    load();
  }, []);

  if (artists === null) return <p class="admin-loading">Loading…</p>;

  const filtered = query.trim()
    ? artists.filter((a) => a.name.toLowerCase().includes(query.trim().toLowerCase()))
    : artists;

  return (
    <>
      <h1>Artists ({artists.length})</h1>
      <input
        type="text"
        class="admin-search"
        placeholder="Search artists…"
        value={query}
        onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
      />
      <table class="admin-table">
        <thead>
          <tr>
            <th></th>
            <th>Name</th>
            <th>Image URL</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((a) => (
            <ArtistRowEditor key={a.id} artist={a} supabase={supabase} onSaved={load} />
          ))}
        </tbody>
      </table>
    </>
  );
}

export default function AdminArtistsList({ supabaseUrl, supabaseAnonKey }: { supabaseUrl: string; supabaseAnonKey: string }) {
  return (
    <AdminPage supabaseUrl={supabaseUrl} supabaseAnonKey={supabaseAnonKey} active="/admin/artists">
      {({ supabase }) => <ArtistsTable supabase={supabase} />}
    </AdminPage>
  );
}
