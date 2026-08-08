import type { SupabaseClient } from '@supabase/supabase-js';

interface Props {
  supabase: SupabaseClient;
  active?: string;
}

const LINKS = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/songs', label: 'Songs' },
  { href: '/admin/songs/new', label: 'Add Song' },
  { href: '/admin/artists', label: 'Artists' },
  { href: '/admin/suggestions', label: 'Suggestions' },
];

export default function AdminNav({ supabase, active }: Props) {
  return (
    <nav class="admin-nav">
      {LINKS.map((link) => (
        <a href={link.href} class={active === link.href ? 'active' : ''}>
          {link.label}
        </a>
      ))}
      <button
        type="button"
        class="admin-signout"
        onClick={() => supabase.auth.signOut().then(() => window.location.assign('/admin'))}
      >
        Sign out
      </button>
    </nav>
  );
}
