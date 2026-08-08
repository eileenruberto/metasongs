import { useState } from 'preact/hooks';
import type { SupabaseClient } from '@supabase/supabase-js';

export default function LoginForm({ supabase }: { supabase: SupabaseClient }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) setError(signInError.message);
    setSubmitting(false);
  };

  return (
    <form class="admin-login" onSubmit={handleSubmit}>
      <label>
        <span>Email</span>
        <input type="email" value={email} onInput={(e) => setEmail((e.target as HTMLInputElement).value)} required />
      </label>
      <label>
        <span>Password</span>
        <input
          type="password"
          value={password}
          onInput={(e) => setPassword((e.target as HTMLInputElement).value)}
          required
        />
      </label>
      <button type="submit" disabled={submitting}>
        {submitting ? 'Signing in…' : 'Sign in'}
      </button>
      {error && <p class="admin-error">{error}</p>}
    </form>
  );
}
