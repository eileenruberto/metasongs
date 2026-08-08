import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

// Separate from src/lib/supabase.ts, which is used at build time in Astro
// frontmatter (Node). This one runs in the browser inside the admin's Preact
// islands, so the URL/key are passed in as props from the page rather than
// read via import.meta.env (which isn't available in client bundles unless
// PUBLIC_-prefixed).
export function getAdminClient(supabaseUrl: string, supabaseAnonKey: string): SupabaseClient {
  if (!client) {
    client = createClient(supabaseUrl, supabaseAnonKey);
  }
  return client;
}
