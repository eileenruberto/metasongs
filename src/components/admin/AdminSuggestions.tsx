import { useEffect, useState } from 'preact/hooks';
import type { SupabaseClient } from '@supabase/supabase-js';
import AdminPage from './AdminPage';

interface Suggestion {
  id: string;
  song_title: string;
  artist: string;
  song_link: string | null;
  songs_referenced: string | null;
  comments: string | null;
  name: string | null;
  email: string | null;
  created_at: string;
}

function SuggestionsList({ supabase }: { supabase: SupabaseClient }) {
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);

  const load = async () => {
    const { data } = await supabase.from('song_suggestions').select('*').order('created_at', { ascending: false });
    setSuggestions((data ?? []) as any);
  };

  useEffect(() => {
    load();
  }, []);

  const dismiss = async (id: string) => {
    await supabase.from('song_suggestions').delete().eq('id', id);
    await load();
  };

  if (suggestions === null) return <p class="admin-loading">Loading…</p>;

  return (
    <>
      <h1>Suggestions ({suggestions.length})</h1>
      {suggestions.length === 0 && <p class="admin-status">No suggestions waiting.</p>}
      {suggestions.map((s) => (
        <div class="admin-card" key={s.id}>
          <p>
            <strong>{s.song_title}</strong> — {s.artist}
          </p>
          {s.song_link && (
            <p class="admin-status">
              <a href={s.song_link} target="_blank" rel="noopener">
                {s.song_link}
              </a>
            </p>
          )}
          {s.songs_referenced && <p class="admin-status">References: {s.songs_referenced}</p>}
          {s.comments && <p class="admin-status">Comments: {s.comments}</p>}
          {(s.name || s.email) && (
            <p class="admin-status">
              From: {s.name || 'unknown'}
              {s.email && <> — <a href={`mailto:${s.email}`}>{s.email}</a></>}
            </p>
          )}
          <p class="admin-status">Submitted {new Date(s.created_at).toLocaleDateString()}</p>
          <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.5rem' }}>
            <a
              class="admin-button secondary"
              href={`/admin/songs/new${s.song_link ? `?link=${encodeURIComponent(s.song_link)}` : ''}`}
              target="_blank"
              rel="noopener"
            >
              Add this song →
            </a>
            <button type="button" class="admin-button danger" onClick={() => dismiss(s.id)}>
              Dismiss
            </button>
          </div>
        </div>
      ))}
    </>
  );
}

export default function AdminSuggestions({ supabaseUrl, supabaseAnonKey }: { supabaseUrl: string; supabaseAnonKey: string }) {
  return (
    <AdminPage supabaseUrl={supabaseUrl} supabaseAnonKey={supabaseAnonKey} active="/admin/suggestions">
      {({ supabase }) => <SuggestionsList supabase={supabase} />}
    </AdminPage>
  );
}
