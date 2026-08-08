import { useEffect, useState } from 'preact/hooks';
import AdminPage from './AdminPage';
import SongForm from './SongForm';

export default function AdminSongEdit({ supabaseUrl, supabaseAnonKey }: { supabaseUrl: string; supabaseAnonKey: string }) {
  const [songId, setSongId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    setSongId(new URLSearchParams(window.location.search).get('id'));
  }, []);

  return (
    <AdminPage supabaseUrl={supabaseUrl} supabaseAnonKey={supabaseAnonKey} active="/admin/songs">
      {({ supabase }) => (
        <>
          <h1>Edit song</h1>
          {songId === undefined ? (
            <p class="admin-loading">Loading…</p>
          ) : songId === null ? (
            <p class="admin-error">No song id given.</p>
          ) : (
            <SongForm supabase={supabase} songId={songId} />
          )}
        </>
      )}
    </AdminPage>
  );
}
