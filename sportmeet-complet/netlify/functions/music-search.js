// netlify/functions/music-search.js
// Spotify catalogue search (metadata + preview_url when available)
//
// Env vars required:
// - SPOTIFY_CLIENT_ID
// - SPOTIFY_CLIENT_SECRET
//
// Endpoint:
//   GET /.netlify/functions/music-search?term=your+query
// Optional:
//   limit (default 25, max 50)
//   previewOnly (default 1) => return only tracks that have preview_url
//   market (optional) => e.g. FR, US... (affects availability)
//
// Important:
// Spotify preview_url is frequently null for many tracks. With previewOnly=1
// you may get few/no results for some searches.

async function getSpotifyToken() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET env vars");
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Spotify token error: ${res.status} ${txt}`);
  }

  const data = await res.json();
  return String(data.access_token || "");
}

function json(statusCode, obj) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type"
    },
    body: JSON.stringify(obj)
  };
}

exports.handler = async (event) => {
  try {
    const qs = event.queryStringParameters || {};

    const term = String(qs.term || "").trim();
    const limit = Math.max(1, Math.min(50, Number(qs.limit || 25)));
    const previewOnly = String(qs.previewOnly || "1") === "1";
    const market = qs.market ? String(qs.market).trim() : "";

    if (!term) {
      return json(200, { results: [] });
    }

    const token = await getSpotifyToken();

    // Ask Spotify for more items than the UI limit so we can filter to preview tracks.
    // This increases the chance of returning results when previewOnly=1.
    const fetchLimit = Math.max(limit, previewOnly ? 50 : limit);

    const q = encodeURIComponent(term);
    const marketParam = market ? `&market=${encodeURIComponent(market)}` : "";
    const searchUrl = `https://api.spotify.com/v1/search?type=track&limit=${fetchLimit}&q=${q}${marketParam}`;

    const res = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Spotify search error: ${res.status} ${txt}`);
    }

    const data = await res.json();
    const items = Array.isArray(data?.tracks?.items) ? data.tracks.items : [];

    const filtered = previewOnly ? items.filter((t) => !!t?.preview_url) : items;

    const results = filtered.slice(0, limit).map((t) => {
      const artists = Array.isArray(t?.artists)
        ? t.artists.map((a) => a?.name).filter(Boolean)
        : [];
      const images = Array.isArray(t?.album?.images) ? t.album.images : [];
      const artwork = images?.[1]?.url || images?.[0]?.url || images?.[2]?.url || "";

      return {
        provider: "spotify",
        track_id: String(t?.id || ""),
        title: String(t?.name || "Titre"),
        artist: artists.join(", "),
        artwork: String(artwork || ""),
        preview_url: String(t?.preview_url || ""),
        duration_ms: Number(t?.duration_ms || 0),
        external_url: String(t?.external_urls?.spotify || "")
      };
    });

    return json(200, { results });
  } catch (err) {
    // Keep statusCode 200 so the UI can show a friendly message without a hard failure.
    return json(200, { error: String(err?.message || err), results: [] });
  }
};
