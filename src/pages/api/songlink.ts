import type { APIRoute } from 'astro';

// Proxies to Odesli's API server-side. Odesli's CORS policy only allows
// localhost and their own domain, not arbitrary production origins, so the
// browser can't call it directly once deployed -- this sidesteps that
// entirely, since CORS is a browser-only restriction and doesn't apply to
// server-to-server requests.
export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const target = url.searchParams.get('url');
  if (!target) {
    return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const res = await fetch(`https://api.song.link/v1-alpha.1/links?url=${encodeURIComponent(target)}`);
    if (!res.ok) {
      return new Response(JSON.stringify({ error: 'Could not resolve that link.' }), {
        status: res.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const data = await res.json();
    return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to reach song.link.' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
