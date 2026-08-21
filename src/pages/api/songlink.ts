import type { APIRoute } from 'astro';

// Odesli/song.link's public API (v1-alpha.1) was discontinued on July 31,
// 2026, with no replacement version. This looks Apple Music tracks up via
// Apple's free, key-free iTunes Search API instead. Spotify auto-lookup was
// dropped: as of February 2026 the Spotify Web API requires the app owner to
// have a Premium subscription, so there's no free path to it -- Spotify
// links/URLs are pasted in manually in the form instead.
export const prerender = false;

function parseAppleMusicTrackId(target: URL): string | null {
  if (!target.hostname.endsWith('music.apple.com')) return null;
  // Song links: .../song/some-title/1234567890
  // Album links with a track: .../album/some-title/1234567890?i=9876543210
  const i = target.searchParams.get('i');
  if (i) return i;
  const match = target.pathname.match(/\/song\/[^/]+\/(\d+)/);
  return match ? match[1] : null;
}

export const GET: APIRoute = async ({ url }) => {
  const target = url.searchParams.get('url');
  if (!target) {
    return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return new Response(JSON.stringify({ error: 'Could not resolve that link.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const appleId = parseAppleMusicTrackId(parsed);
  if (!appleId) {
    const isSpotify = parsed.hostname.endsWith('spotify.com');
    return new Response(
      JSON.stringify({
        error: isSpotify
          ? 'Spotify links can\u2019t be auto-resolved -- paste the Spotify URL directly into the Spotify field below.'
          : 'Could not resolve that link. Paste an Apple Music song link.',
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const res = await fetch(`https://itunes.apple.com/lookup?id=${appleId}`);
    if (!res.ok) {
      return new Response(JSON.stringify({ error: 'Could not resolve that link.' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const data = await res.json();
    const track = data.results?.[0];
    if (!track) {
      return new Response(JSON.stringify({ error: 'Could not resolve that link.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        title: track.trackName ?? '',
        artistName: track.artistName ?? '',
        imageUrl: (track.artworkUrl100 as string)?.replace('100x100', '512x512') ?? '',
        appleMusicUrl: track.trackViewUrl ?? '',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to reach iTunes.' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
