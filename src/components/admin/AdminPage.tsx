import type { ComponentChildren } from 'preact';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { useAuthSession } from '../../lib/useAuthSession';
import LoginForm from './LoginForm';
import AdminNav from './AdminNav';

interface Props {
  supabaseUrl: string;
  supabaseAnonKey: string;
  active: string;
  children: (ctx: { supabase: SupabaseClient; session: Session }) => ComponentChildren;
}

// Shared shell for every admin page: gates on auth, shows the nav once
// signed in, then hands the live supabase client + session to the page's
// own content. Everything here stays inside Preact -- an Astro page only
// ever mounts one top-level component like this, since Astro can't pass a
// live function as a child into a framework island.
export default function AdminPage({ supabaseUrl, supabaseAnonKey, active, children }: Props) {
  const { supabase, session, status } = useAuthSession(supabaseUrl, supabaseAnonKey);

  if (status === 'loading') return <p class="admin-loading">Loading…</p>;
  if (status === 'signed-out') return <LoginForm supabase={supabase} />;

  return (
    <>
      <AdminNav supabase={supabase} active={active} />
      {children({ supabase, session: session! })}
    </>
  );
}
