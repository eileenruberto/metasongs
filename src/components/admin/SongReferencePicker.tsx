import { useRef, useState } from 'preact/hooks';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface ReferenceEntry {
  title: string;
  songId: string | null;
}

interface SongOption {
  id: string;
  title: string;
  artist: { name: string } | null;
}

interface Props {
  supabase: SupabaseClient;
  excludeSongId?: string;
  values: ReferenceEntry[];
  onChange: (values: ReferenceEntry[]) => void;
}

export default function SongReferencePicker({ supabase, excludeSongId, values, onChange }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SongOption[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = (q: string) => {
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      let req = supabase
        .from('songs')
        .select('id, title, artist:artists!songs_artist_id_fkey ( name )')
        .ilike('title', `%${q.trim()}%`)
        .order('title')
        .limit(8);
      const { data } = await req;
      setResults(((data ?? []) as any).filter((s: SongOption) => s.id !== excludeSongId));
      setOpen(true);
    }, 250);
  };

  const add = (entry: ReferenceEntry) => {
    if (values.some((v) => v.title === entry.title)) return;
    onChange([...values, entry]);
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  const remove = (title: string) => onChange(values.filter((v) => v.title !== title));

  return (
    <div>
      <ul class="song-row-list" style={{ marginBottom: '0.75rem' }}>
        {values.map((v) => (
          <li key={v.title} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0' }}>
            <span style={{ flex: 1 }}>
              {v.title} {!v.songId && <em class="admin-status" style={{ display: 'inline' }}>(not matched to a song)</em>}
            </span>
            <button type="button" class="admin-button secondary" onClick={() => remove(v.title)}>
              Remove
            </button>
          </li>
        ))}
      </ul>
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          value={query}
          placeholder="Search for a song this one references…"
          onInput={(e) => search((e.target as HTMLInputElement).value)}
          onFocus={() => query && setOpen(true)}
        />
        {open && query.trim() && (
          <div class="admin-card" style={{ position: 'absolute', zIndex: 10, width: '100%', marginTop: '0.25rem' }}>
            {results.map((r) => (
              <div
                key={r.id}
                style={{ padding: '0.3rem 0', cursor: 'pointer' }}
                onClick={() => add({ title: r.title, songId: r.id })}
              >
                {r.title} {r.artist && <span class="admin-status" style={{ display: 'inline' }}>— {r.artist.name}</span>}
              </div>
            ))}
            <button type="button" class="admin-button secondary" onClick={() => add({ title: query.trim(), songId: null })}>
              + Add "{query.trim()}" as text (no matching song found)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
