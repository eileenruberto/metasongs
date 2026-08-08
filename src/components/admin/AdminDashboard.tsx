import AdminPage from './AdminPage';

export default function AdminDashboard({ supabaseUrl, supabaseAnonKey }: { supabaseUrl: string; supabaseAnonKey: string }) {
  return (
    <AdminPage supabaseUrl={supabaseUrl} supabaseAnonKey={supabaseAnonKey} active="/admin">
      {() => (
        <>
          <h1>Dashboard</h1>
          <ul class="admin-dashboard-links">
            <li>
              <a href="/admin/songs/new">Add a song</a>
            </li>
            <li>
              <a href="/admin/songs">Manage songs</a>
            </li>
            <li>
              <a href="/admin/artists">Manage artists</a>
            </li>
            <li>
              <a href="/admin/suggestions">Suggestions inbox</a>
            </li>
          </ul>
        </>
      )}
    </AdminPage>
  );
}
