import { useEffect, useState } from 'preact/hooks';
import type { Session } from '@supabase/supabase-js';
import { getAdminClient } from './adminClient';

export function useAuthSession(supabaseUrl: string, supabaseAnonKey: string) {
  const supabase = getAdminClient(supabaseUrl, supabaseAnonKey);
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const status = session === undefined ? 'loading' : session === null ? 'signed-out' : 'signed-in';
  return { supabase, session: session ?? null, status } as const;
}
