import { useEffect, useState } from 'preact/hooks';
import AdminPage from './AdminPage';
import SongForm from './SongForm';

export default function AdminSongNew({ supabaseUrl, supabaseAnonKey }: { supabaseUrl: string; supabaseAnonKey: string }) {
  const [initialLink, setInitialLink] = useState<string | undefined>(undefined);

  useEffect(() => {
    setInitialLink(new URLSearchParams(window.location.search).get('link') ?? '');
  }, []);

  return (
    <AdminPage supabaseUrl={supabaseUrl} supabaseAnonKey={supabaseAnonKey} active="/admin/songs/new">
      {({ supabase }) => (
        <>
          <h1>Add a song</h1>
          {initialLink === undefined ? (
            <p class="admin-loading">Loading…</p>
          ) : (
            <SongForm supabase={supabase} initialLink={initialLink} />
          )}
        </>
      )}
    </AdminPage>
  );
}
