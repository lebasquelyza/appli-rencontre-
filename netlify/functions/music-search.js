// netlify/functions/music-search.js
// Env vars: SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET

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
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Spotify token error: ${res.status} ${txt}`);
  }
  const data = await res.json();
  return String(data.access_token || "");
}

exports.handler = async (event) => {
  try {
    const term = String(event.queryStringParameters?.term || "").trim();
    const limit = Math.max(
      1,
      Math.min(50, Number(event.queryStringParameters?.limit || 25))
    );

    if (!term) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ results: [] }),
      };
    }

    const token = await getSpotifyToken();
    const q = encodeURIComponent(term);
    const searchUrl = `https://api.spotify.com/v1/search?type=track&limit=${limit}&q=${q}`;

    const res = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Spotify search error: ${res.status} ${txt}`);
    }

    const data = await res.json();
    const items = Array.isArray(data?.tracks?.items) ? data.tracks.items : [];

    const results = items.map((t) => {
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
        external_url: String(t?.external_urls?.spotify || ""),
      };
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ results }),
    };
  } catch (err) {
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: String(err?.message || err), results: [] }),
    };
  }
};
