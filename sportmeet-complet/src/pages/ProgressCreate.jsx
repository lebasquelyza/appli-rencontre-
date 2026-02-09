// sportmeet-complet/src/pages/ProgressCreate.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

const BUCKET = "progress-media";

/**
 * ✅ OPTION B (Spotify plein morceau)
 * - On utilise Spotify Search + Spotify Web Playback SDK (lecture complète, dans l'app)
 * - Nécessite que l'utilisateur se connecte à Spotify (souvent Premium requis pour le Web Playback SDK)
 *
 * Config:
 *   - VITE_SPOTIFY_CLIENT_ID dans Netlify/env
 *   - Redirect URI autorisée côté Spotify (ex: https://ton-site.netlify.app/progress/create)
 */
const SPOTIFY_CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID || "";

// --- PKCE helpers (client-only) ---
function b64url(bytes) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
async function sha256(str) {
  const data = new TextEncoder().encode(str);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return new Uint8Array(digest);
}
function randomVerifier(len = 64) {
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return b64url(arr);
}
async function makeChallenge(verifier) {
  const hashed = await sha256(verifier);
  return b64url(hashed);
}

function getRedirectUri() {
  // On revient sur la même page
  return window.location.origin + window.location.pathname;
}

async function spotifyLogin() {
  if (!SPOTIFY_CLIENT_ID) throw new Error("VITE_SPOTIFY_CLIENT_ID manquant.");
  const verifier = randomVerifier(64);
  localStorage.setItem("spotify_pkce_verifier", verifier);
  const challenge = await makeChallenge(verifier);

  const params = new URLSearchParams({
    response_type: "code",
    client_id: SPOTIFY_CLIENT_ID,
    scope: [
      "streaming",
      "user-read-email",
      "user-read-private",
      "user-modify-playback-state",
      "user-read-playback-state"
    ].join(" "),
    redirect_uri: getRedirectUri(),
    code_challenge_method: "S256",
    code_challenge: challenge
  });

  window.location.href = "https://accounts.spotify.com/authorize?" + params.toString();
}

async function spotifyExchangeCodeForToken(code) {
  const verifier = localStorage.getItem("spotify_pkce_verifier") || "";
  if (!verifier) throw new Error("PKCE verifier manquant.");
  const body = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    grant_type: "authorization_code",
    code,
    redirect_uri: getRedirectUri(),
    code_verifier: verifier
  });

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });
  if (!res.ok) throw new Error("Connexion Spotify impossible.");
  return await res.json();
}

async function spotifyRefreshToken(refreshToken) {
  const body = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    grant_type: "refresh_token",
    refresh_token: refreshToken
  });

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });
  if (!res.ok) throw new Error("Refresh Spotify impossible.");
  return await res.json();
}

async function spotifySearchTracks(accessToken, term) {
  const q = String(term || "").trim();
  if (!q) return [];
  const url = "https://api.spotify.com/v1/search?" + new URLSearchParams({ q, type: "track", limit: "25" }).toString();
  const res = await fetch(url, { headers: { Authorization: "Bearer " + accessToken } });
  if (!res.ok) return [];
  const data = await res.json();
  const items = data?.tracks?.items || [];
  return items.map((t) => ({
    provider: "spotify",
    track_id: String(t.id || ""),
    uri: String(t.uri || ""),
    title: String(t.name || "Titre"),
    artist: String((t.artists || []).map((a) => a.name).join(", ")),
    artwork: String(t.album?.images?.[0]?.url || ""),
    duration_ms: Number(t.duration_ms || 0),
    external_url: String(t.external_urls?.spotify || "")
  }));
}

function safeExt(file) {
  const byMime = (file?.type || "").split("/")[1];
  if (byMime) return byMime.replace("jpeg", "jpg");
  const byName = (file?.name || "").split(".").pop();
  return (byName || "bin").toLowerCase();
}

function randomId() {
  return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
}

function clamp01(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.min(1, Math.max(0, x));
}

function MusicPickerModal({ open, onClose, onSelect, userId }) {
  const [tab, setTab] = useState("search"); // "search" | "library"
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [results, setResults] = useState([]);

  const [libLoading, setLibLoading] = useState(false);
  const [libErr, setLibErr] = useState("");
  const [libScope, setLibScope] = useState("all"); // "all" | "global" | "mine"
  const [libQuery, setLibQuery] = useState("");
  const [library, setLibrary] = useState([]);

  const [addToGlobal, setAddToGlobal] = useState(false);

  const audioRef = useRef(null);
  
  // --- Auto preview: play selected track when user adds photo/video (user gesture) ---
  const playSelectedTrackPreview = async () => {
    const t = selectedTrackRef.current || selectedTrack;
    const url = t?.preview_url;
    if (!url) return;

    const audio = audioRef.current;
    if (!audio) return;

    // If different track, swap src
    if (audio.src !== url) {
      audio.src = url;
    }

    try {
      await audio.play();
      setIsPreviewPlaying(true);
    } catch (e) {
      // Autoplay can be blocked in some cases; user can still press play manually.
      console.warn("Preview play blocked:", e);
    }
  };
const previewStopTimerRef = useRef(null);
  const [playingId, setPlayingId] = useState(null);

  const stop = () => {
    try {
      if (previewStopTimerRef.current) clearTimeout(previewStopTimerRef.current);
      previewStopTimerRef.current = null;
      const a = audioRef.current;
      if (a) { a.pause(); a.currentTime = 0; a.src = ""; }
    } catch {}
    setPlayingId(null);
  };

  const playPreview = async (t) => {
    if (!t?.preview_url) return;
    const id = t.track_id || t.id;
    if (playingId === id) { stop(); return; }
    stop();
    try {
      const a = audioRef.current;
      if (!a) return;
      a.src = t.preview_url;
      a.currentTime = 0;
      const p = a.play();
      if (p?.catch) p.catch(() => {});
      setPlayingId(id);
      previewStopTimerRef.current = setTimeout(() => { try { a.pause(); } catch {} setPlayingId(null); }, 30000);
    } catch {}
  };

  const runSearch = async () => {
    const term = String(q || "").trim();
    if (!term) { setErr("Tape un titre ou un artiste."); return; }
    setLoading(true); setErr(""); stop();
    try {
      const res = await fetch(`/.netlify/functions/music-search?term=${encodeURIComponent(term)}&limit=25&previewOnly=0`);
      const data = await res.json();
      const list = Array.isArray(data?.results) ? data.results : [];
      setResults(list);
      if (!list.length) setErr("Aucun résultat.");
    } catch (e) {
      console.error("music-search error:", e);
      setErr("Recherche impossible.");
      setResults([]);
    } finally { setLoading(false); }
  };

  const loadLibrary = async () => {
    if (!userId) return;
    setLibLoading(true); setLibErr("");
    try {
      const { data, error } = await supabase
        .from("music_library")
        .select("id, owner_id, provider, track_id, title, artist, artwork, preview_url, external_url, created_at, created_by")
        .or(`owner_id.is.null,owner_id.eq.${userId}`)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) { console.error("music_library select error:", error); setLibErr("Impossible de charger la bibliothèque."); setLibrary([]); return; }
      setLibrary(data || []);
    } catch (e) {
      console.error("music_library load exception:", e);
      setLibErr("Impossible de charger la bibliothèque.");
      setLibrary([]);
    } finally { setLibLoading(false); }
  };

  const addToLibrary = async (t) => {
    if (!userId) { setErr("Connecte-toi pour ajouter un son."); return; }
    setLoading(true); setErr("");
    try {
      const payload = {
        owner_id: addToGlobal ? null : userId,
        created_by: userId,
        provider: "spotify",
        track_id: String(t?.track_id || ""),
        title: String(t?.title || ""),
        artist: String(t?.artist || ""),
        artwork: String(t?.artwork || ""),
        preview_url: String(t?.preview_url || ""),
        external_url: String(t?.external_url || "")
      };
      const { error } = await supabase.from("music_library").insert(payload);
      if (error) { console.error("music_library insert error:", error); setErr("Déjà dans la bibliothèque (ou ajout impossible)."); }
      else { setErr(addToGlobal ? "Ajouté au global ✅" : "Ajouté à tes sons ✅"); if (tab === "library") loadLibrary(); }
    } catch (e) {
      console.error("music_library insert exception:", e);
      setErr("Impossible d’ajouter à la bibliothèque.");
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (!open) return;
    setTab("search"); setQ(""); setResults([]); setErr("");
    setLibErr(""); setLibQuery(""); setLibScope("all"); setAddToGlobal(false);
    stop();
    if (userId) loadLibrary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, userId]);

  const filteredLibrary = React.useMemo(() => {
    const qx = String(libQuery || "").trim().toLowerCase();
    return (library || []).filter((r) => {
      const isGlobal = r.owner_id == null;
      if (libScope === "global" && !isGlobal) return false;
      if (libScope === "mine" && isGlobal) return false;
      if (!qx) return true;
      return (`${r.title || ""} ${r.artist || ""}`).toLowerCase().includes(qx);
    });
  }, [library, libQuery, libScope]);

  if (!open) return null;

  return (
    <div className="modal-backdrop modal-backdrop--blur" onClick={onClose}>
      <div className="modal-card modal-card--sheet allowScroll" onClick={(e) => e.stopPropagation()}
        style={{ width: "min(920px, 98vw)", maxHeight: "calc(var(--appH, 100vh) - 18px)", overflow: "hidden", borderRadius: 18 }}>
        <div className="modal-header" style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between" }}>
          <button className="btn-ghost btn-sm" onClick={() => { stop(); onClose?.(); }} aria-label="Fermer">✕</button>
          <div style={{ fontWeight: 900 }}>Ajouter un son</div>
          <div style={{ width: 34 }} />
        </div>

        <div className="modal-body modal-body--scroll allowScroll" style={{ padding: 14, paddingTop: 8 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <button type="button" className={tab === "search" ? "btn-primary btn-sm" : "btn-ghost btn-sm"} onClick={() => setTab("search")}>Rechercher</button>
            <button type="button" className={tab === "library" ? "btn-primary btn-sm" : "btn-ghost btn-sm"} onClick={() => { setTab("library"); if (userId) loadLibrary(); }}>Bibliothèque</button>

            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
              <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, opacity: 0.9 }}>
                <input type="checkbox" checked={addToGlobal} onChange={(e) => setAddToGlobal(!!e.target.checked)} />
                Ajouter au global
              </label>
            </div>
          </div>

          {tab === "search" ? (
            <>
              <div className="card" style={{ padding: 10, display: "flex", gap: 10, alignItems: "center", borderRadius: 14 }}>
                <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un titre, un artiste…"
                  style={{ flex: 1, minWidth: 0 }} onKeyDown={(e) => { if (e.key === "Enter") runSearch(); }} disabled={loading} />
                <button className="btn-primary btn-sm" onClick={runSearch} disabled={loading}>{loading ? "..." : "Rechercher"}</button>
              </div>

              {err ? <p className="form-message error" style={{ marginTop: 10 }}>{err}</p> : null}

              <audio ref={audioRef} / onEnded={() => setIsPreviewPlaying(false)}>

              <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                {results.map((t) => (
                  <div
                    key={(t.provider || "spotify") + "_" + (t.track_id || "")}
                    className="card"
                    onClick={() => {
                      // Lecture uniquement via preview_url (pas de redirection Spotify)
                      if (t.preview_url) playPreview(t);
                    }}
                    style={{ padding: 10, display: "flex", gap: 10, alignItems: "center", borderRadius: 14, cursor: t.preview_url ? "pointer" : "default" }}
                  >
                    <img src={t.artwork || "/avatar.png"} alt="" style={{ width: 48, height: 48, borderRadius: 12, objectFit: "cover" }}
                      onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "/avatar.png"; }} />
                    <div style={{ flex: 1, minWidth: 0, lineHeight: 1.2 }}>
                      <div style={{ fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.title}</div>
                      <div style={{ opacity: 0.8, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.artist}</div>
                    </div>

                    <button
                      type="button"
                      className="btn-ghost btn-sm"
                      onClick={(e) => { e.stopPropagation(); if (t.preview_url) playPreview(t); }}
                      title={t.preview_url ? "Écouter un extrait" : "Pas d'extrait disponible"}
                      disabled={!t.preview_url}
                      style={!t.preview_url ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
                    >
                      {playingId === t.track_id ? "⏸" : "▶"}
                    </button>

                    <button type="button" className="btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); addToLibrary(t); }} disabled={loading} title="Ajouter à la bibliothèque">⭐</button>

                    <button type="button" className="btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); stop(); onSelect?.(t); onClose?.(); }}>
                      Utiliser
                    </button>
                  </div>
                ))}
              </div>
            </>
          ) : null}

          {tab === "library" ? (
            <>
              {!userId ? (
                <p className="form-message error">Connecte-toi pour accéder à ta bibliothèque.</p>
              ) : (
                <>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button type="button" className={libScope === "all" ? "btn-primary btn-sm" : "btn-ghost btn-sm"} onClick={() => setLibScope("all")}>Tous</button>
                      <button type="button" className={libScope === "global" ? "btn-primary btn-sm" : "btn-ghost btn-sm"} onClick={() => setLibScope("global")}>Global</button>
                      <button type="button" className={libScope === "mine" ? "btn-primary btn-sm" : "btn-ghost btn-sm"} onClick={() => setLibScope("mine")}>Mes sons</button>
                    </div>

                    <input className="input" value={libQuery} onChange={(e) => setLibQuery(e.target.value)} placeholder="Filtrer…" style={{ flex: 1, minWidth: 220 }} />

                    <button type="button" className="btn-ghost btn-sm" onClick={loadLibrary} disabled={libLoading}>{libLoading ? "..." : "Rafraîchir"}</button>
                  </div>

                  {libErr ? <p className="form-message error" style={{ marginTop: 10 }}>{libErr}</p> : null}

                  <audio ref={audioRef} />

                  <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                    {libLoading ? <p className="form-message">Chargement…</p> :
                      filteredLibrary.length === 0 ? <p className="form-message">Aucun son.</p> :
                      filteredLibrary.map((t) => {
                        const isGlobal = t.owner_id == null;
                        return (
                          <div key={t.id} className="card" style={{ padding: 10, display: "flex", gap: 10, alignItems: "center", borderRadius: 14 }}>
                            <img src={t.artwork || "/avatar.png"} alt="" style={{ width: 48, height: 48, borderRadius: 12, objectFit: "cover" }}
                              onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "/avatar.png"; }} />
                            <div style={{ flex: 1, minWidth: 0, lineHeight: 1.2 }}>
                              <div style={{ fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.title}</div>
                              <div style={{ opacity: 0.8, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {t.artist} {isGlobal ? "• Global" : "• Moi"}
                              </div>
                            </div>

                            {t.preview_url ? (
                              <button type="button" className="btn-ghost btn-sm" onClick={() => playPreview(t)} title="Écouter un extrait">
                                {playingId === t.id ? "⏸" : "▶"}
                              </button>
                            ) : null}

                            <button type="button" className="btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); stop(); onSelect?.(t); onClose?.(); }}>
                              Utiliser
                            </button>
                          </div>
                        );
                      })}
                  </div>
                </>
              )}
            </>
          ) : null}

          <div style={{ height: 10 }} />
        </div>
      </div>
    </div>
  );
}

export function ProgressCreate({ user }) {
  const navigate = useNavigate();

  // --- Spotify (Option B) ---
  const [spotifyToken, setSpotifyToken] = useState(localStorage.getItem("spotify_access_token") || "");
  const [spotifyRefreshTok, setSpotifyRefreshTok] = useState(localStorage.getItem("spotify_refresh_token") || "");
  const [spotifyDeviceId, setSpotifyDeviceId] = useState("");
  const spotifyStopTimerRef = useRef(null);

  // Handle Spotify OAuth redirect (PKCE)
  useEffect(() => {
    (async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        if (!code) return;
        const token = await spotifyExchangeCodeForToken(code);
        const access = token?.access_token || "";
        const refresh = token?.refresh_token || spotifyRefreshTok || "";
        const expiresIn = Number(token?.expires_in || 0);
        if (access) {
          localStorage.setItem("spotify_access_token", access);
          setSpotifyToken(access);
        }
        if (refresh) {
          localStorage.setItem("spotify_refresh_token", refresh);
          setSpotifyRefreshTok(refresh);
        }
        if (expiresIn) {
          localStorage.setItem("spotify_expires_at", String(Date.now() + (expiresIn - 30) * 1000));
        }
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (e) {
        console.log("Spotify OAuth error:", e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ensureSpotifyAccessToken = async () => {
    const exp = Number(localStorage.getItem("spotify_expires_at") || 0);
    if (spotifyToken && exp && Date.now() < exp) return spotifyToken;
    if (!spotifyRefreshTok) return spotifyToken;
    try {
      const refreshed = await spotifyRefreshToken(spotifyRefreshTok);
      const access = refreshed?.access_token || "";
      const expiresIn = Number(refreshed?.expires_in || 0);
      if (access) {
        localStorage.setItem("spotify_access_token", access);
        setSpotifyToken(access);
      }
      if (expiresIn) {
        localStorage.setItem("spotify_expires_at", String(Date.now() + (expiresIn - 30) * 1000));
      }
      return access || spotifyToken;
    } catch (e) {
      console.log("Spotify refresh error:", e);
      return spotifyToken;
    }
  };

  // Load Spotify Web Playback SDK (Premium généralement requis)
  useEffect(() => {
    if (!spotifyToken) return;
    if (window.__spotify_sdk_loading__) return;
    window.__spotify_sdk_loading__ = true;

    const load = () =>
      new Promise((resolve) => {
        if (document.getElementById("spotify-sdk")) return resolve();
        const s = document.createElement("script");
        s.id = "spotify-sdk";
        s.src = "https://sdk.scdn.co/spotify-player.js";
        s.async = true;
        s.onload = () => resolve();
        document.body.appendChild(s);
      });

    load().then(() => {
      window.onSpotifyWebPlaybackSDKReady = () => {
        try {
          const player = new window.Spotify.Player({
            name: "MatchFit Player",
            getOAuthToken: async (cb) => {
              const tok = await ensureSpotifyAccessToken();
              cb(tok || spotifyToken);
            },
            volume: 0.8
          });

          player.addListener("ready", ({ device_id }) => {
            setSpotifyDeviceId(device_id);
          });

          player.addListener("not_ready", () => {});

          player.connect();
          window.__spotify_player__ = player;
        } catch (e) {
          console.log("Spotify SDK init error:", e);
        }
      };
      // If SDK already ready, fire manually
      if (window.Spotify && window.Spotify.Player) {
        window.onSpotifyWebPlaybackSDKReady?.();
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spotifyToken]);

  const spotifyPlaySegment = async (uri, startMs = 0, durationMs = 30000) => {
    if (!uri) return;
    const token = await ensureSpotifyAccessToken();
    if (!token) {
      setBanner("Connecte-toi à Spotify pour lire la musique entière.", true);
      return;
    }
    if (!spotifyDeviceId) {
      setBanner("Player Spotify non prêt (Premium requis).", true);
      return;
    }
    try {
      // Start playback at position
      await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${encodeURIComponent(spotifyDeviceId)}`, {
        method: "PUT",
        headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
        body: JSON.stringify({ uris: [uri], position_ms: Math.max(0, Math.floor(startMs)) })
      });

      if (spotifyStopTimerRef.current) clearTimeout(spotifyStopTimerRef.current);
      spotifyStopTimerRef.current = setTimeout(async () => {
        try {
          await fetch(`https://api.spotify.com/v1/me/player/pause?device_id=${encodeURIComponent(spotifyDeviceId)}`, {
            method: "PUT",
            headers: { Authorization: "Bearer " + token }
          });
        } catch {}
      }, Math.max(1000, Math.floor(durationMs)));
    } catch (e) {
      console.log("Spotify play error:", e);
      setBanner("Impossible de lire sur Spotify (Premium/login requis).", true);
    }
  };

  // Media
  const [files, setFiles] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const activeFile = files[activeIndex] || null;
  const previewVideoRef = useRef(null);

  // Minimal preview controls (progress + play/pause)
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [previewProgress, setPreviewProgress] = useState(0); // 0..1
  const [previewDuration, setPreviewDuration] = useState(0);

  const togglePreviewPlay = async () => {
    const v = previewVideoRef.current;
    if (!v) return;
    try {
      if (v.paused) {
        const p = v.play();
        if (p?.catch) p.catch(() => {});
        setPreviewPlaying(true);
      } else {
        v.pause();
        setPreviewPlaying(false);
      }
    } catch {}
  };

  const hasVideo = useMemo(() => files.some((f) => String(f.type || "").startsWith("video/")), [files]);
  const imagesOnly = files.length > 0 && !hasVideo;

  // Swipe preview for photos
  const previewStripRef = useRef(null);
  const lastManualSwipeRef = useRef(0);
  const lastAutoSwipeRef = useRef(0);
  const lastInteractionRef = useRef(Date.now());

  // Allow normal page scroll unless the user intends a horizontal swipe on the photo carousel
  const previewSwipeRef = useRef({
    active: false,
    decided: false,
    horizontal: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    pointerId: null,
  });

  const onPreviewPointerDown = (e) => {
    lastInteractionRef.current = Date.now();
    const el = previewStripRef.current;
    if (!el) return;
    // Only for primary button / touch
    if (e.button !== undefined && e.button !== 0) return;

    previewSwipeRef.current = {
      active: true,
      decided: false,
      horizontal: false,
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      pointerId: e.pointerId,
    };

    try {
      el.setPointerCapture?.(e.pointerId);
    } catch {}
  };

  const onPreviewPointerMove = (e) => {
    lastInteractionRef.current = Date.now();
    const g = previewSwipeRef.current;
    if (!g?.active) return;

    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;

    if (!g.decided) {
      if (Math.abs(dx) + Math.abs(dy) < 6) return;
      // decide whether user is trying to swipe horizontally through photos
      g.horizontal = Math.abs(dx) > Math.abs(dy);
      g.decided = true;
    }

    if (g.horizontal) {
      // Prevent the page scroll and manually scroll the carousel horizontally
      e.preventDefault();
      const el = previewStripRef.current;
      if (!el) return;
      el.scrollLeft -= e.clientX - g.lastX;
      g.lastX = e.clientX;
    }
  };

  const onPreviewPointerEnd = (e) => {
    const el = previewStripRef.current;
    const g = previewSwipeRef.current;
    if (el && g?.pointerId != null) {
      try {
        el.releasePointerCapture?.(g.pointerId);
      } catch {}
    }
    previewSwipeRef.current = { active: false, decided: false, horizontal: false, startX: 0, startY: 0, lastX: 0, pointerId: null };
  };
  useEffect(() => {
    const el = previewStripRef.current;
    if (!el) return;
    // reset scroll when a new selection is made
    el.scrollLeft = activeIndex * (el.clientWidth || 0);
  }, [files.length, activeIndex]);
  const onPreviewStripScroll = () => {
    lastManualSwipeRef.current = Date.now();
    lastInteractionRef.current = Date.now();
    const el = previewStripRef.current;
    if (!el) return;
    const w = el.clientWidth || 1;
    const idx = Math.round(el.scrollLeft / w);
    if (idx !== activeIndex) {
      setActiveIndex(Math.max(0, Math.min(files.length - 1, idx)));
    }
  };

  useEffect(() => {
    if (!imagesOnly || files.length <= 1) return;
    const el = previewStripRef.current;
    if (!el) return;

    const tick = () => {
      const now = Date.now();

      // manual by default; only auto-advance after 8s of no interaction
      if (now - lastInteractionRef.current < 8000) return;

      // don't auto-advance too frequently
      if (now - lastAutoSwipeRef.current < 8000) return;

      const w = el.clientWidth || 1;
      if (!w) return;

      const nextIdx = (activeIndex + 1) % files.length;
      lastAutoSwipeRef.current = now;
      el.scrollTo({ left: nextIdx * w, behavior: "smooth" });
      setActiveIndex(nextIdx);
    };

    const id = window.setInterval(tick, 500);
    return () => window.clearInterval(id);
  }, [imagesOnly, files.length, activeIndex]);

  const [videoDurationSec, setVideoDurationSec] = useState(15);
  const fileInputRef = useRef(null);
  const previewUrl = useMemo(() => {
    if (!activeFile) return "";
    try {
      return URL.createObjectURL(activeFile);
    } catch {
      return "";
    }
  }, [activeFile]);

// Read video duration (for "Instagram-like" music segment selection)
useEffect(() => {
  if (!activeFile || !previewUrl || !String(activeFile.type || "").startsWith("video/")) {
    setVideoDurationSec(15);
    return;
  }
  let cancelled = false;
  const v = document.createElement("video");
  v.preload = "metadata";
  v.src = previewUrl;
  const onMeta = () => {
    if (cancelled) return;
    const d = Number(v.duration);
    if (Number.isFinite(d) && d > 0) {
      // keep a reasonable precision (seconds)
      setVideoDurationSec(Math.max(1, Math.round(d)));
    }
  };
  v.addEventListener("loadedmetadata", onMeta);
  // Safari sometimes needs a load() call
  try { v.load(); } catch {}
  return () => {
    cancelled = true;
    v.removeEventListener("loadedmetadata", onMeta);
    try { v.src = ""; } catch {}
  };
}, [activeFile, previewUrl]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        try {
          URL.revokeObjectURL(previewUrl);
        } catch {}
      }
    };
  }, [previewUrl]);

  // Sync minimal preview controls for video
  useEffect(() => {
    if (!hasVideo) return;
    const v = previewVideoRef.current;
    if (!v) return;
    const update = () => {
      const dur = Number(v.duration || 0);
      setPreviewDuration(dur);
      const ct = Number(v.currentTime || 0);
      setPreviewProgress(dur > 0 ? Math.min(1, Math.max(0, ct / dur)) : 0);
      setPreviewPlaying(!v.paused);
    };
    update();
    v.addEventListener("timeupdate", update);
    v.addEventListener("loadedmetadata", update);
    v.addEventListener("play", update);
    v.addEventListener("pause", update);
    return () => {
      v.removeEventListener("timeupdate", update);
      v.removeEventListener("loadedmetadata", update);
      v.removeEventListener("play", update);
      v.removeEventListener("pause", update);
    };
  }, [hasVideo, previewUrl]);

  // TikTok-like sound selection

const clipLenSec = useMemo(() => {
   // Clip utilisé pour la musique (30s). Pour Spotify (piste entière) on joue 30s; iTunes fallback reste 29s.
  const raw = Number(videoDurationSec || 0);
  if (!Number.isFinite(raw) || raw <= 0) return 15;
  return Math.min(29, Math.max(1, Math.round(raw)));
}, [videoDurationSec]);

const maxMusicStart = useMemo(() => {
  // We must fit the video length inside the 30s preview window (0..29)
  return Math.max(0, 29 - clipLenSec);
}, [clipLenSec]);
  const [track, setTrack] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Si l’utilisateur choisit un son depuis le feed, on le récupère ici
  useEffect(() => {
    try {
      const raw = localStorage.getItem("mf_selected_track");
      if (!raw) return;
      localStorage.removeItem("mf_selected_track");

      const t = JSON.parse(raw);
      if (t && (t.track_id || t.preview_url)) {
        setTrack({
          provider: t.provider || "spotify",
          track_id: t.track_id || null,
          title: t.title || "",
          artist: t.artist || "",
          artwork: t.artwork || "",
          preview_url: t.preview_url || "",
          external_url: t.external_url || ""
        });
        setMusicStart(0);
      }
    } catch {}
  }, []);
  const [musicStart, setMusicStart] = useState(0); // 0..29
  const [musicVol, setMusicVol] = useState(0.6);
  const [videoVol, setVideoVol] = useState(1.0);
  const [videoMuted, setVideoMuted] = useState(false);
  const lastVideoVolRef = useRef(1.0);

  const audioRef = useRef(null); // for start preview from selected track
  const previewStopTimerRef = useRef(null);

  // Caption
  const [caption, setCaption] = useState("");

  // Banner
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [isError, setIsError] = useState(false);
  const setBanner = (text, err = false) => {
    setMsg(text);
    setIsError(err);
    window.clearTimeout(setBanner.__t);
    setBanner.__t = window.setTimeout(() => setMsg(""), 3500);
  };

  useEffect(() => {
    if (!user?.id) setBanner("Connecte-toi pour publier.", true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const onPick = (e) => {
    const list = Array.from(e.target.files || []);
    if (!list.length) return;

    const cleaned = [];
    for (const f of list) {
      const type = String(f.type || "");
      if (!type.startsWith("video/") && !type.startsWith("image/")) continue;
      cleaned.push(f);
    }
    if (!cleaned.length) {
      setBanner("Fichier non supporté. Choisis une vidéo ou une image.", true);
      return;
    }

    // ✅ TikTok logic:
    // - If user picks at least one video, we keep ONLY the first video (TikTok style "one video").
    // - Otherwise (images only), we keep all images and allow horizontal swipe preview.
    const firstVideo = cleaned.find((f) => String(f.type || "").startsWith("video/"));
    if (firstVideo) {
      setFiles([firstVideo]);
      setActiveIndex(0);
    } else {
      setFiles(cleaned);
      setActiveIndex(0);
    }

    // Auto-play selected music as soon as media is picked (user gesture = picking media)
    try {
      if (track?.uri || track?.preview_url) {
        // ensure audio element exists
        setTimeout(() => {
          try { previewFromStart(); } catch {}
        }, 0);
      }
    } catch {}

    // allow re-picking the same file(s)
    try {
      e.target.value = "";
    } catch {}
  };

  const openMediaPicker = () => {
    if (loading || !user?.id) return;
    try {
      fileInputRef.current?.click();
    } catch {}
  };

    const previewFromStart = async () => {
    try {
      // Spotify full track
      if (track?.provider === "spotify" && track?.uri) {
        const startMs = Math.max(0, Math.floor(Number(musicStart || 0) * 1000));
        await spotifyPlaySegment(track.uri, startMs, 30000);
        return;
      }

      // iTunes fallback (preview 30s)
      if (!track?.preview_url) return;
      const a = audioRef.current;
      if (!a) return;
      a.src = track.preview_url;
      a.volume = clamp01(musicVol);
      a.currentTime = Math.min(maxMusicStart, Math.max(0, Number(musicStart || 0)));
      const p = a.play();
      if (p?.catch) p.catch(() => {});
      if (previewStopTimerRef.current) clearTimeout(previewStopTimerRef.current);
      previewStopTimerRef.current = setTimeout(() => {
        try { a.pause(); } catch {}
      }, (clipLenSec + 0.15) * 1000);
    } catch (e) {
      console.log("preview blocked:", e);
    }
  };

  // Apply volume on preview video
  useEffect(() => {
    const v = previewVideoRef.current;
    if (!v) return;
    v.muted = !!videoMuted || clamp01(videoVol) === 0;
    // On iOS, muted can override volume, but we keep volume in sync for other browsers
    v.volume = clamp01(videoVol);
  }, [videoVol, videoMuted]);

  const toggleVideoMuted = () => {
    setVideoMuted((m) => {
      const next = !m;
      if (next) {
        // remember last non-zero volume
        if (clamp01(videoVol) > 0) lastVideoVolRef.current = clamp01(videoVol);
        setVideoVol(0);
      } else {
        setVideoVol(clamp01(lastVideoVolRef.current || 1));
      }
      return next;
    });
  };

  const withTimeout = (promise, ms, label = "Opération") => {
    let t;
    const timeout = new Promise((_, rej) => {
      t = window.setTimeout(() => rej(new Error(label + " trop longue. Vérifie ta connexion.")), ms);
    });
    return Promise.race([promise, timeout]).finally(() => window.clearTimeout(t));
  };

  const uploadAndCreate = async () => {
    if (!user?.id) {
      navigate("/settings");
      return;
    }
    if (!files.length) {
      setBanner("Ajoute une vidéo ou une image.", true);
      return;
    }

    setLoading(true);
    setIsError(false);
    setBanner("Publication…");
    try {
      // profile_id (best-effort)
      let profileId = null;
      const { data: prof, error: pErr } = await withTimeout(supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(), 15000, "Chargement profil");

      if (pErr) console.error("progress create profile fetch error:", pErr);
      profileId = prof?.id ?? null;

      // upload media(s)
      const cap = String(caption || "").trim();
      const musicTitle = track
        ? `${track.title}${track.artist ? " — " + track.artist : ""}`
        : null;

      // On publie 1 post par média (TikTok-like: l'utilisateur peut sélectionner plusieurs médias d'un coup)
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const ext = safeExt(f);
        const path = `progress/${user.id}/${randomId()}_${i}.${ext}`;

        setBanner(`Upload… (${i + 1}/${files.length})`);

        const { error: upErr } = await withTimeout(
          supabase.storage.from(BUCKET).upload(path, f, {
            cacheControl: "3600",
            upsert: false
          }),
          60000,
          "Upload"
        );

        if (upErr) {
          console.error("progress media upload error:", upErr);
          setBanner("Upload impossible (bucket/RLS).", true);
          return;
        }

        const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
        const publicUrl = data?.publicUrl || "";
        if (!publicUrl) {
          setBanner("Impossible de récupérer l'URL publique.", true);
          return;
        }

        const mediaType = String(f.type || "").startsWith("video/") ? "video" : "image";

        setBanner(`Publication… (${i + 1}/${files.length})`);

        const { error: insErr } = await withTimeout(
          supabase.from("progress_posts").insert({
            user_id: user.id,
            profile_id: profileId,
            media_url: publicUrl,
            media_type: mediaType,
            caption: cap || null,
            is_public: true,

            // music (preview 30s)
            music_url: track?.preview_url || null,
            music_title: musicTitle,
            music_provider: track?.provider || null,
            music_track_id: track?.track_id || null,
            music_start_sec: track?.preview_url ? Math.min(maxMusicStart, Math.max(0, Number(musicStart || 0))) : 0,

            // default volumes
            music_volume: clamp01(musicVol),
            video_volume: clamp01(videoVol)
          }),
          20000,
          "Publication"
        );

        if (insErr) {
          console.error("progress post insert error:", insErr);
          setBanner(insErr.message || "Impossible de publier.", true);
          return;
        }
      }
setBanner("Publié ✅");
      setTimeout(() => navigate("/feed"), 350);
    } catch (e) {
      console.error("progress create exception:", e);
      setBanner("Impossible de publier.", true);
    } finally {
      setLoading(false);
    }
  };

return (
  <main className="page" style={{ minHeight: "calc(var(--appH, 100vh))" }}>
    <div className="shell" style={{ paddingBottom: 16 }}>
      <div
        className="card"
        style={{
          padding: 10,
          maxWidth: 920,
          margin: "8px auto 12px",
          display: "flex",
          gap: 10,
          alignItems: "center"
        }}
      >
        <button className="btn-ghost btn-sm" onClick={() => navigate("/feed")}>
          ←
        </button>
        <div style={{ fontWeight: 900 }}>Nouvelle progression</div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          {/* Input caché (ouvert via le bouton "Ajouter une photo ou vidéo") */}
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*,image/*"
            multiple
            onChange={onPick}
            disabled={!user?.id || loading}
            style={{ display: "none" }}
          />

          <button type="button" className="btn-ghost btn-sm" onClick={() => setPickerOpen(true)} disabled={loading}>
            + Son
          </button>
          {/* Son sélectionné affiché juste au-dessus de la photo */}


          <button
            type="button"
            className="btn-primary btn-sm"
            onClick={uploadAndCreate}
            disabled={!user?.id || loading || files.length === 0}
            title="Publier"
          >
            {loading ? "..." : "Publier"}
          </button>
        </div>
      </div>

      <div
        className="card"
        style={{
          padding: 12,
          maxWidth: 520,
          margin: "0 auto",
          display: "grid",
          gap: 12
        }}
      >
        {msg ? <p className={`form-message ${isError ? "error" : ""}`}>{msg}</p> : null}

        
        {/* ✅ Son sélectionné (au-dessus de la photo) */}
        {track ? (
          <div
            className="card"
            style={{
              padding: "8px 10px",
              borderRadius: 14,
              display: "flex",
              alignItems: "center",
              gap: 10,
              maxWidth: "100%",
            }}
          >
            <img
              src={track.artwork || "/avatar.png"}
              alt=""
              style={{ width: 28, height: 28, borderRadius: 10, objectFit: "cover" }}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = "/avatar.png";
              }}
            />
            <div style={{ flex: 1, minWidth: 0, lineHeight: 1.15 }}>
              <div
                style={{
                  fontWeight: 900,
                  fontSize: 12,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {track.title || "Son sélectionné"}
              </div>
              <div
                style={{
                  opacity: 0.75,
                  fontSize: 11,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {track.artist || ""}
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button
                type="button"
                className="btn-ghost btn-sm"
                onClick={() => {
                  // Lecture uniquement via preview_url (pas de redirection Spotify)
                  if (!track?.preview_url) return;
                  previewFromStart();
                }}
                disabled={!track?.preview_url}
                title={track?.preview_url ? "Écouter l'extrait" : "Extrait indisponible"}
                style={!track?.preview_url ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
              >
                ▶
              </button>

              <button
                type="button"
                className="btn-ghost btn-sm"
                onClick={() => {
                  try {
                    const a = audioRef.current;
                    if (a) a.pause();
                  } catch {}
                  setTrack(null);
                  setMusicStart(0);
                }}
                aria-label="Supprimer le son"
                title="Supprimer le son"
              >
                ✕
              </button>
            </div>
          </div>
        ) : null}

{/* Preview */}
        <div
          style={{
            borderRadius: 18,
            overflow: "hidden",
            background: "#000",
            width: "100%",
            aspectRatio: "9 / 16",
            display: "grid",
            placeItems: "center",
             position: "relative"
           }}
        >
          {previewUrl ? (
            hasVideo ? (
              <>
              <video
                ref={previewVideoRef}
                src={previewUrl}
                playsInline
                muted={videoMuted || Number(videoVol) === 0}
                onClick={togglePreviewPlay}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
              {/* Minimal overlay: progress bar + play/pause */}
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  inset: 0,
                  pointerEvents: "none",
                }}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePreviewPlay();
                  }}
                  style={{
                    position: "absolute",
                    right: 12,
                    bottom: 18,
                    width: 34,
                    height: 34,
                    borderRadius: 999,
                    border: "none",
                    background: "rgba(0,0,0,0.55)",
                    color: "white",
                    fontSize: 16,
                    fontWeight: 900,
                    display: "grid",
                    placeItems: "center",
                    pointerEvents: "auto",
                  }}
                  title={previewPlaying ? "Pause" : "Lire"}
                >
                  {previewPlaying ? "⏸" : "▶︎"}
                </button>

                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: 4,
                    background: "rgba(255,255,255,0.25)",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${Math.round(previewProgress * 1000) / 10}%`,
                      background: "rgba(255,255,255,0.95)",
                    }}
                  />
                </div>
              </div>
            </>
            ) : imagesOnly && files.length > 1 ? (
              <>
                <div
                  ref={previewStripRef}
                  onScroll={onPreviewStripScroll}
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "row",
                    overflowX: "auto",
                    overflowY: "hidden",
                    scrollSnapType: "x mandatory",
                    WebkitOverflowScrolling: "touch",
                    overscrollBehaviorX: "contain"
                  }}
                >
                  {files.map((f, i) => {
                    const url = (() => {
                      try {
                        return URL.createObjectURL(f);
                      } catch {
                        return "";
                      }
                    })();
                    return (
                      <div
                        key={i}
                        style={{
                          flex: "0 0 100%",
                          width: "100%",
                          height: "100%",
                          scrollSnapAlign: "center",
                          position: "relative"
                        }}
                      >
                        <img
                          src={url}
                          alt={`Aperçu ${i + 1}`}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Dots (suivi) */}
                <div
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: 10,
                    display: "flex",
                    justifyContent: "center",
                    gap: 6,
                    pointerEvents: "none"
                  }}
                >
                  {files.map((_, i) => (
                    <span
                      key={i}
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 999,
                        background: i === activeIndex ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.35)"
                      }}
                    />
                  ))}
                </div>
              </>
            ) : (
              <img src={previewUrl} alt="Aperçu" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            )
          ) : (
            <div style={{ color: "white", opacity: 0.85, textAlign: "center", padding: 14 }}>
              <div style={{ fontWeight: 900 }}>Ajoute une vidéo ou une image</div>
              <div style={{ marginTop: 6, lineHeight: 1.35, opacity: 0.9 }}>
              </div>
              <div style={{ marginTop: 12 }}>
                <button
                  type="button"
                  className="btn-primary btn-sm"
                  onClick={openMediaPicker}
                  disabled={!user?.id || loading}
                >
                  Ajouter une photo ou une vidéo
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Thumbnails (multi media) */}
        {files.length > 1 ? (
          <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "6px 2px 2px" }}>
            {files.map((f, i) => {
              const url = (() => {
                try {
                  return URL.createObjectURL(f);
                } catch {
                  return "";
                }
              })();
              const isActive = i === activeIndex;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => { lastInteractionRef.current = Date.now(); setActiveIndex(i); const el = previewStripRef.current; if (el && !hasVideo) el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" }); }}
                  className="btn-ghost btn-sm"
                  style={{
                    padding: 0,
                    borderRadius: 10,
                    border: isActive ? "2px solid var(--brand, #00e5a8)" : "1px solid rgba(255,255,255,0.18)",
                    overflow: "hidden",
                    minWidth: 64,
                    width: 64,
                    height: 64,
                    position: "relative",
                    flex: "0 0 auto"
                  }}
                                  >
                  {String(f.type || "").startsWith("video/") ? (
                    <div style={{ width: "100%", height: "100%", background: "rgba(0,0,0,0.25)", display: "grid", placeItems: "center" }}>
                      <span style={{ fontWeight: 900, fontSize: 12 }}>VIDÉO</span>
                    </div>
                  ) : (
                    <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  )}

                  <span
                    onClick={(ev) => {
                      ev.preventDefault();
                      ev.stopPropagation();
                      setFiles((prev) => {
                        const next = prev.slice();
                        next.splice(i, 1);
                        const nextIndex = Math.max(0, Math.min(activeIndex, next.length - 1));
                        setActiveIndex(nextIndex);
                        return next;
                      });
                    }}
                    style={{
                      position: "absolute",
                      top: 4,
                      right: 4,
                      width: 18,
                      height: 18,
                      borderRadius: 999,
                      background: "rgba(0,0,0,0.55)",
                      display: "grid",
                      placeItems: "center",
                      fontSize: 12,
                      lineHeight: 1,
                      color: "white"
                    }}
                  >
                    ×
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}

        {/* Changer le média (sans bouton +Média) */}
        {files.length ? (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <button
              type="button"
              className="btn-ghost btn-sm"
              onClick={openMediaPicker}
              disabled={!user?.id || loading}
            >
              Ajouter
            </button>
            <div style={{ opacity: 0.75, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {files.length ? `Média ${activeIndex + 1}/${files.length}` : ""}
            </div>
          </div>
        ) : null}

        {/* Caption */}
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontWeight: 900 }}>Description</div>
          <textarea
            className="input"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Ajouter une description…"
            rows={3}
            disabled={!user?.id || loading}
            style={{ width: "100%", resize: "vertical" }}
          />
        </div>
      </div>
    </div>

      <MusicPickerModal
        open={pickerOpen}
        userId={user?.id}
        onClose={() => setPickerOpen(false)}
        onSelect={(t) => { setTrack(t); setPickerOpen(false); }}
      />

  </main>
);

}
