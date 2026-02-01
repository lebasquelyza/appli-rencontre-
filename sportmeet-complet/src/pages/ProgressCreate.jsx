// sportmeet-complet/src/pages/ProgressCreate.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

const BUCKET = "progress-media";

/**
 * ✅ NOTE LICENCE / TECH
 * Pour imiter TikTok sans SDK payant/licencié, on utilise iTunes Search API (gratuit, sans clé)
 * qui retourne un preview 30s (previewUrl). Donc la sélection de "partie du son" est sur 0–29s.
 */
async function searchItunesTracks(term) {
  const q = String(term || "").trim();
  if (!q) return [];
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=song&limit=25`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  const results = Array.isArray(data?.results) ? data.results : [];
  return results
    .map((t) => ({
      provider: "itunes",
      track_id: String(t.trackId || ""),
      title: String(t.trackName || "Titre"),
      artist: String(t.artistName || ""),
      artwork: String(t.artworkUrl100 || t.artworkUrl60 || ""),
      preview_url: String(t.previewUrl || "")
    }))
    .filter((t) => t.preview_url);
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
    if (!term) {
      setErr("Tape un titre ou un artiste.");
      return;
    }
    setLoading(true);
    setErr("");
    stop();
    try {
      const list = await searchItunesTracks(term);
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

          {err ? (
            <p className="form-message error" style={{ marginTop: 10 }}>
              {err}
            </p>
          ) : (
            <p className="form-message" style={{ marginTop: 10, opacity: 0.8 }}>
              Résultats via iTunes (preview 30s).
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

                <button
                  type="button"
                  className="btn-ghost btn-sm"
                  onClick={() => playPreview(t)}
                  title="Écouter"
                  aria-label="Écouter"
                >
                  {playingId === t.track_id ? "⏸" : "▶︎"}
                </button>

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

  // Media
  const [files, setFiles] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const activeFile = files[activeIndex] || null;
  const previewVideoRef = useRef(null);

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

  // TikTok-like sound selection

const clipLenSec = useMemo(() => {
  // iTunes previews are ~30s; we limit the usable clip to 29s for safety
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

    setFiles(cleaned);
    setActiveIndex(0);

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
    if (!track?.preview_url) return;
    try {
      const a = audioRef.current;
      if (!a) return;
      a.src = track.preview_url;
      a.volume = clamp01(musicVol);
      a.currentTime = Math.min(maxMusicStart, Math.max(0, Number(musicStart || 0)));
      const p = a.play();
      if (p?.catch) p.catch(() => {});
      // Stop the preview at the end of the selected clip (Instagram-like)
      if (previewStopTimerRef.current) clearTimeout(previewStopTimerRef.current);
      previewStopTimerRef.current = setTimeout(() => {
        try {
          a.pause();
        } catch {}
      }, (clipLenSec + 0.15) * 1000);
    } catch (e) {
      console.log("preview from start blocked:", e);
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
            disabled={!user?.id || loading || !file}
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
            placeItems: "center"
          }}
        >
          {previewUrl ? (
            activeFile?.type?.startsWith("video/") ? (
              <video
                ref={previewVideoRef}
                src={previewUrl}
                playsInline
                controls
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
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
                  onClick={() => setActiveIndex(i)}
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
                  title={f.name}
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
              Changer la photo/vidéo
            </button>
            <div style={{ opacity: 0.75, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {activeFile?.name || ""}
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
      }}
    />
  </main>
);

}
