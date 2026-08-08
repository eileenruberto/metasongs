import { useEffect, useRef, useState } from 'preact/hooks';
import type { SupabaseClient } from '@supabase/supabase-js';

interface ArtistOption {
  id: string;
  name: string;
}

interface Props {
  supabase: SupabaseClient;
  value: ArtistOption | null;
  onChange: (artist: ArtistOption | null) => void;
}

export default function ArtistPicker({ supabase, value, onChange }: Props) {
  const [query, setQuery] = useState(value?.name ?? '');
  const [results, setResults] = useState<ArtistOption[]>([]);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setQuery(value?.name ?? '');
  }, [value?.id]);

  const search = (q: string) => {
    setQuery(q);
    onChange(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const { data } = await supabase.from('artists').select('id, name').ilike('name', `%${q.trim()}%`).order('name').limit(8);
      setResults(data ?? []);
      setOpen(true);
    }, 250);
  };

  const select = (artist: ArtistOption) => {
    onChange(artist);
    setQuery(artist.name);
    setOpen(false);
    setResults([]);
  };

  const createArtist = async () => {
    const name = query.trim();
    if (!name) return;
    setCreating(true);
    const { data, error } = await supabase.from('artists').insert({ name }).select('id, name').single();
    setCreating(false);
    if (!error && data) select(data);
  };

  const exactMatch = results.some((r) => r.name.toLowerCase() === query.trim().toLowerCase());

  return (
    <div style={{ position: 'relative' }}>
      <input
        type="text"
        value={query}
        placeholder="Search or add an artist…"
        onInput={(e) => search((e.target as HTMLInputElement).value)}
        onFocus={() => query && setOpen(true)}
      />
      {value && <p class="admin-status">Selected: {value.name}</p>}
      {open && (query.trim() || results.length > 0) && (
        <div class="admin-card" style={{ position: 'absolute', zIndex: 10, width: '100%', marginTop: '0.25rem' }}>
          {results.map((r) => (
            <div key={r.id} style={{ padding: '0.3rem 0', cursor: 'pointer' }} onClick={() => select(r)}>
              {r.name}
            </div>
          ))}
          {!exactMatch && query.trim() && (
            <button type="button" class="admin-button secondary" disabled={creating} onClick={createArtist}>
              {creating ? 'Adding…' : `+ Add new artist "${query.trim()}"`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
