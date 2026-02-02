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

function MusicPickerModal({ open, onClose, onSelect }) {
  const [q, setQ] = useState("");
  const [accessToken, setAccessToken] = useState(localStorage.getItem("spotify_access_token") || "");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [results, setResults] = useState([]);
  const audioRef = useRef(null);

  // Local timer only for preview playback inside the modal
  const previewStopTimerRef = useRef(null);

  const [playingId, setPlayingId] = useState(null);

  useEffect(() => {
    if (!open) return;
    setErr("");
    setResults([]);
    setPlayingId(null);
    setQ("");
    setAccessToken(localStorage.getItem("spotify_access_token") || "");
  }, [open]);

  const stop = () => {
    try {
      if (previewStopTimerRef.current) clearTimeout(previewStopTimerRef.current);
      previewStopTimerRef.current = null;
      const a = audioRef.current;
      if (a) {
        a.pause();
        a.currentTime = 0;
      }
    } catch {}
    setPlayingId(null);
  };

  const run = async () => {
    const term = String(q || "").trim();
    if (!accessToken) {
      setErr("Connecte-toi à Spotify pour rechercher une musique.");
      return;
    }
    if (!term) {
      setErr("Tape un titre ou un artiste.");
      return;
    }
    setLoading(true);
    setErr("");
    stop();
    try {
      const list = await spotifySearchTracks(accessToken, term);
      setResults(list);
      if (!list.length) setErr("Aucun résultat.");
    } catch (e) {
      console.error("music search error:", e);
      setErr("Recherche impossible.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const playPreview = async (t) => {
    if (!t?.preview_url) return;
    try {
      const a = audioRef.current;
      if (!a) return;
      if (playingId === t.track_id) {
        stop();
        return;
      }
      a.src = t.preview_url;
      a.currentTime = 0;
      const p = a.play();
      if (p?.catch) p.catch(() => {});
      setPlayingId(t.track_id);

      // Hard-stop after 30s (preview length) to avoid background audio
      if (previewStopTimerRef.current) clearTimeout(previewStopTimerRef.current);
      previewStopTimerRef.current = setTimeout(() => {
        try {
          a.pause();
        } catch {}
        setPlayingId(null);
      }, 30000);
    } catch (e) {
      console.log("preview blocked:", e);
    }
  };

  if (!open) return null;

  return (
    <div
      className="modal-backdrop modal-backdrop--blur"
      onClick={onClose}
    >
      <div
        className="modal-card modal-card--sheet allowScroll"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(920px, 98vw)",
          maxHeight: "calc(var(--appH, 100vh) - 18px)",
          overflow: "hidden",
          borderRadius: 18
        }}
      >
        {/* Top bar TikTok-like */}
        <div
          className="modal-header"
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 14px"
          }}
        >
          <button className="btn-ghost btn-sm" onClick={onClose} aria-label="Fermer">
            ✕
          </button>
          <div style={{ fontWeight: 900 }}>♪ Ajouter un son</div>
          <div style={{ width: 34 }} />
        </div>

        <div className="modal-body modal-body--scroll allowScroll" style={{ padding: 14, paddingTop: 8 }}>
          <div
            className="card"
            style={{
              padding: 10,
              display: "flex",
              gap: 10,
              alignItems: "center",
              borderRadius: 14
            }}
          >
            <input
              className="input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher un titre, un artiste…"
              style={{ flex: 1, minWidth: 0 }}
              onKeyDown={(e) => {
                if (e.key === "Enter") run();
              }}
              disabled={loading}
            />
            <button className="btn-primary btn-sm" onClick={run} disabled={loading}>
              {loading ? "..." : "Rechercher"}
            </button>
          </div>

          {!accessToken ? (
            <div className="card" style={{ padding: 10, marginTop: 10, borderRadius: 14 }}>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Connexion Spotify</div>
              <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 10 }}>
                Pour chercher et lire la musique entière, connecte-toi à Spotify.
              </div>
              <button
                type="button"
                className="btn-primary btn-sm"
                onClick={async () => {
                  try {
                    await spotifyLogin();
                  } catch (e) {
                    setErr(String(e?.message || e));
                  }
                }}
              >
                Connecter Spotify
              </button>
            </div>
          ) : null}

          {err ? (
            <p className="form-message error" style={{ marginTop: 10 }}>
              {err}
            </p>
          ) : (
            <p className="form-message" style={{ marginTop: 10, opacity: 0.8 }}>
              Résultats via Spotify. (Lecture complète via Spotify)
            </p>
          )}

          <audio ref={audioRef} />

          <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
            {results.map((t) => (
              <div
                key={t.provider + "_" + t.track_id}
                className="card"
                style={{
                  padding: 10,
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  borderRadius: 14
                }}
              >
                <img
                  src={t.artwork || "/avatar.png"}
                  alt=""
                  style={{ width: 48, height: 48, borderRadius: 12, objectFit: "cover" }}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = "/avatar.png";
                  }}
                />
                <div style={{ flex: 1, minWidth: 0, lineHeight: 1.2 }}>
                  <div style={{ fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {t.title}
                  </div>
                  <div style={{ opacity: 0.8, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {t.artist}
                  </div>
                </div>
                {t.external_url ? (
                  <a
                    className="btn-ghost btn-sm"
                    href={t.external_url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Ouvrir dans Spotify"
                    title="Ouvrir dans Spotify"
                  >
                    🔗
                  </a>
                ) : null}
                <button
                  type="button"
                  className="btn-primary btn-sm"
                  onClick={() => {
                    stop();
                    onSelect?.(t);
                    onClose?.();
                  }}
                >
                  Utiliser
                </button>
              </div>
            ))}
          </div>

          {results.length ? <div style={{ height: 10 }} /> : null}
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

  const [pickerOpen, setPickerOpen] = useState(false);
  const [track, setTrack] = useState(null);
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
                Tu peux ensuite ajouter un son (logique type TikTok) et régler les volumes.
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

        {/* Sound */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button type="button" className="btn-ghost btn-sm" onClick={() => setPickerOpen(true)} disabled={loading}>
            {track ? "♪ " + (track.title || "Son") : "♪ Ajouter un son"}
          </button>

          {track ? (
            <>
              <button
                type="button"
                className="btn-ghost btn-sm"
                onClick={previewFromStart}
                disabled={loading}
                title="Écouter le son depuis le début sélectionné"
              >
                ▶︎ Écouter
              </button>

              <button
                type="button"
                className="btn-ghost btn-sm"
                onClick={() => {
                  setTrack(null);
                  setMusicStart(0);
                }}
                disabled={loading}
              >
                Retirer
              </button>
            </>
          ) : null}
        </div>

        {track ? (
          <div className="card" style={{ padding: 12 }}>
            <div style={{ fontWeight: 900, marginBottom: 8, lineHeight: 1.2 }}>
              {track.title} <span style={{ opacity: 0.75, fontWeight: 600 }}>— {track.artist}</span>
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, opacity: 0.85 }}>Extrait de musique</span>

                {/* UI "Instagram" : une barre + une "ligne" de début, et une fenêtre (durée = vidéo) qui glisse */}
                <div
                  style={{
                    position: "relative",
                    height: 22,
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.16)",
                    overflow: "hidden"
                  }}
                >
                  {/* fenêtre sélectionnée */}
                  <div
                    style={{
                      position: "absolute",
                      left: `${(maxMusicStart ? (musicStart / maxMusicStart) * 100 : 0)}%`,
                      width: `${(29 ? (clipLenSec / 29) * 100 : 100)}%`,
                      top: 0,
                      bottom: 0,
                      borderRadius: 999,
                      background: "rgba(0,229,168,0.55)"
                    }}
                  />

                  {/* ligne de début (comme Instagram) */}
                  <div
                    style={{
                      position: "absolute",
                      left: `${(maxMusicStart ? (musicStart / maxMusicStart) * 100 : 0)}%`,
                      top: 2,
                      bottom: 2,
                      width: 3,
                      borderRadius: 999,
                      background: "rgba(255,255,255,0.92)",
                      transform: "translateX(-1px)",
                      boxShadow: "0 0 0 2px rgba(0,0,0,0.12)"
                    }}
                  />

                  {/* slider invisible au-dessus pour le drag (UX) */}
                  <input
                    type="range"
                    min="0"
                    max={maxMusicStart}
                    step="1"
                    value={musicStart}
                    onChange={(e) => setMusicStart(Number(e.target.value))}
                    disabled={loading}
                    aria-label="Choisir l'extrait"
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                      opacity: 0,
                      cursor: loading ? "not-allowed" : "pointer"
                    }}
                  />
                </div>
              </label>

              <label style={{ display: "grid", gap: 4 }}>
                <span style={{ fontSize: 12, opacity: 0.85 }}>Volume musique</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={musicVol}
                  onChange={(e) => setMusicVol(Number(e.target.value))}
                  disabled={loading}
                />
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <span style={{ fontSize: 12, opacity: 0.85 }}>Volume vidéo</span>
                  <button
                    type="button"
                    className="btn-ghost btn-sm"
                    onClick={toggleVideoMuted}
                    disabled={loading}
                    title={videoMuted || clamp01(videoVol) === 0 ? "Activer le son de la vidéo" : "Couper le son de la vidéo"}
                    aria-label="Couper/activer le son de la vidéo"
                    style={{ paddingInline: 10 }}
                  >
                    {videoMuted || clamp01(videoVol) === 0 ? "🔇" : "🔊"}
                  </button>
                </span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={videoVol}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setVideoVol(v);
                    if (v > 0 && videoMuted) setVideoMuted(false);
                    if (v > 0) lastVideoVolRef.current = clamp01(v);
                  }}
                  disabled={loading}
                />
              </label>
            </div>

            <audio ref={audioRef} />
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
      onClose={() => setPickerOpen(false)}
      onSelect={(t) => {
        setTrack(t);
        setMusicStart(0);
        // Auto-play chosen music as soon as a media exists (user gesture = selecting a track)
        setTimeout(() => {
          try {
            if ((files?.length || 0) > 0) previewFromStart();
          } catch {}
        }, 0);
      }}
    />
  </main>
);

}
