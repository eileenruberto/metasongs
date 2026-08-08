import { useRef, useState } from 'preact/hooks';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface FeaturedArtistEntry {
  id: string;
  name: string;
}

interface Props {
  supabase: SupabaseClient;
  values: FeaturedArtistEntry[];
  onChange: (values: FeaturedArtistEntry[]) => void;
}

export default function FeaturedArtistsPicker({ supabase, values, onChange }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FeaturedArtistEntry[]>([]);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = (q: string) => {
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const { data } = await supabase.from('artists').select('id, name').ilike('name', `%${q.trim()}%`).order('name').limit(8);
      setResults((data ?? []).filter((a: FeaturedArtistEntry) => !values.some((v) => v.id === a.id)));
      setOpen(true);
    }, 250);
  };

  const add = (artist: FeaturedArtistEntry) => {
    if (values.some((v) => v.id === artist.id)) return;
    onChange([...values, artist]);
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  const remove = (id: string) => onChange(values.filter((v) => v.id !== id));

  const createArtist = async () => {
    const name = query.trim();
    if (!name) return;
    setCreating(true);
    const { data, error } = await supabase.from('artists').insert({ name }).select('id, name').single();
    setCreating(false);
    if (!error && data) add(data);
  };

  const exactMatch = results.some((r) => r.name.toLowerCase() === query.trim().toLowerCase());

  return (
    <div>
      <div class="admin-checkboxes" style={{ marginBottom: '0.5rem' }}>
        {values.map((v) => (
          <label key={v.id}>
            {v.name}
            <button
              type="button"
              aria-label={`Remove ${v.name}`}
              onClick={() => remove(v.id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, font: 'inherit' }}
            >
              ×
            </button>
          </label>
        ))}
      </div>
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          value={query}
          placeholder="Search or add a featured artist…"
          onInput={(e) => search((e.target as HTMLInputElement).value)}
          onFocus={() => query && setOpen(true)}
        />
        {open && query.trim() && (
          <div class="admin-card" style={{ position: 'absolute', zIndex: 10, width: '100%', marginTop: '0.25rem' }}>
            {results.map((r) => (
              <div key={r.id} style={{ padding: '0.3rem 0', cursor: 'pointer' }} onClick={() => add(r)}>
                {r.name}
              </div>
            ))}
            {!exactMatch && (
              <button type="button" class="admin-button secondary" disabled={creating} onClick={createArtist}>
                {creating ? 'Adding…' : `+ Add new artist "${query.trim()}"`}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
