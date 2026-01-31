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
    } catch (e) {
      console.log("preview blocked:", e);
    }
  };

  if (!open) return null;

  return (
    <div
      className="modal-backdrop modal-backdrop--blur"
      onClick={onClose}
      style={{ background: "rgba(0,0,0,.72)" }}
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
  const [file, setFile] = useState(null);
  const previewVideoRef = useRef(null);
  const previewUrl = useMemo(() => {
    if (!file) return "";
    try {
      return URL.createObjectURL(file);
    } catch {
      return "";
    }
  }, [file]);

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
  const [pickerOpen, setPickerOpen] = useState(false);
  const [track, setTrack] = useState(null);
  const [musicStart, setMusicStart] = useState(0); // 0..29
  const [musicVol, setMusicVol] = useState(0.6);
  const [videoVol, setVideoVol] = useState(1.0);

  const audioRef = useRef(null); // for start preview from selected track

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
    const f = e.target.files?.[0] || null;
    if (!f) return;

    const type = String(f.type || "");
    if (!type.startsWith("video/") && !type.startsWith("image/")) {
      setBanner("Fichier non supporté. Choisis une vidéo ou une image.", true);
      return;
    }
    setFile(f);
  };

  const previewFromStart = async () => {
    if (!track?.preview_url) return;
    try {
      const a = audioRef.current;
      if (!a) return;
      a.src = track.preview_url;
      a.volume = clamp01(musicVol);
      a.currentTime = Math.min(29, Math.max(0, Number(musicStart || 0)));
      const p = a.play();
      if (p?.catch) p.catch(() => {});
    } catch (e) {
      console.log("preview from start blocked:", e);
    }
  };

  // Apply volume on preview video
  useEffect(() => {
    const v = previewVideoRef.current;
    if (!v) return;
    v.volume = clamp01(videoVol);
  }, [videoVol]);

  const uploadAndCreate = async () => {
    if (!user?.id) {
      navigate("/settings");
      return;
    }
    if (!file) {
      setBanner("Ajoute une vidéo ou une image.", true);
      return;
    }

    setLoading(true);
    setIsError(false);

    try {
      // profile_id (best-effort)
      let profileId = null;
      const { data: prof, error: pErr } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (pErr) console.error("progress create profile fetch error:", pErr);
      profileId = prof?.id ?? null;

      // upload media
      const ext = safeExt(file);
      const path = `progress/${user.id}/${randomId()}.${ext}`;

      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
        cacheControl: "3600",
        upsert: false
      });

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

      const mediaType = String(file.type || "").startsWith("video/") ? "video" : "image";
      const cap = String(caption || "").trim();

      const musicTitle = track
        ? `${track.title}${track.artist ? " — " + track.artist : ""}`
        : null;

      const { error: insErr } = await supabase.from("progress_posts").insert({
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
        music_start_sec: track?.preview_url ? Math.min(29, Math.max(0, Number(musicStart || 0))) : 0,

        // default volumes
        music_volume: clamp01(musicVol),
        video_volume: clamp01(videoVol)
      });

      if (insErr) {
        console.error("progress post insert error:", insErr);
        setBanner(insErr.message || "Impossible de publier.", true);
        return;
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
      {/* ✅ Fullscreen preview like TikTok */}
      <div
        style={{
          position: "relative",
          height: "calc(var(--appH, 100vh))",
          background: "#000",
          overflow: "hidden"
        }}
      >
        {/* Media preview */}
        {previewUrl ? (
          file?.type?.startsWith("video/") ? (
            <video
              ref={previewVideoRef}
              src={previewUrl}
              playsInline
              controls
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <img
              src={previewUrl}
              alt="Aperçu"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          )
        ) : (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              color: "white",
              opacity: 0.9,
              padding: 16,
              textAlign: "center"
            }}
          >
            <div style={{ maxWidth: 520 }}>
              <div style={{ fontSize: 18, fontWeight: 900 }}>Publier une progression</div>
              <div style={{ marginTop: 8, opacity: 0.85, lineHeight: 1.35 }}>
                Ajoute une vidéo ou une image, puis choisis un son (style TikTok).
              </div>

              <label
                className="btn-primary"
                style={{ marginTop: 14, display: "inline-flex", gap: 8, alignItems: "center", cursor: "pointer" }}
              >
                ➕ Ajouter un média
                <input
                  type="file"
                  accept="video/*,image/*"
                  onChange={onPick}
                  disabled={!user?.id || loading}
                  style={{ display: "none" }}
                />
              </label>
            </div>
          </div>
        )}

        {/* Top-left close */}
        <button
          type="button"
          className="btn-ghost btn-sm"
          onClick={() => navigate("/feed")}
          style={{
            position: "absolute",
            left: 12,
            top: 12,
            zIndex: 10,
            background: "rgba(0,0,0,.35)",
            color: "white",
            borderRadius: 999
          }}
        >
          ✕
        </button>

        {/* Right side actions */}
        <div
          style={{
            position: "absolute",
            right: 12,
            top: 70,
            zIndex: 10,
            display: "grid",
            gap: 10,
            justifyItems: "end"
          }}
        >
          <label
            className="btn-ghost btn-sm"
            style={{
              background: "rgba(0,0,0,.35)",
              color: "white",
              borderRadius: 999,
              cursor: "pointer"
            }}
            title="Ajouter un média"
          >
            ➕
            <input
              type="file"
              accept="video/*,image/*"
              onChange={onPick}
              disabled={!user?.id || loading}
              style={{ display: "none" }}
            />
          </label>

          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={() => setPickerOpen(true)}
            style={{ background: "rgba(0,0,0,.35)", color: "white", borderRadius: 999 }}
            disabled={loading}
            title="Ajouter un son"
          >
            ♪
          </button>

          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={uploadAndCreate}
            style={{ background: "rgba(0,0,0,.35)", color: "white", borderRadius: 999 }}
            disabled={!user?.id || loading || !file}
            title="Publier"
          >
            {loading ? "…" : "✔︎"}
          </button>
        </div>

        {/* Bottom sheet controls */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 10,
            padding: 12,
            paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)",
            background: "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,.70) 45%, rgba(0,0,0,.86) 100%)",
            color: "white"
          }}
        >
          {msg ? (
            <div
              className={`form-message ${isError ? "error" : ""}`}
              style={{
                marginBottom: 10,
                background: isError ? "rgba(180,0,0,.35)" : "rgba(0,0,0,.25)",
                color: "white"
              }}
            >
              {msg}
            </div>
          ) : null}

          {/* Sound pill */}
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn-ghost btn-sm"
              onClick={() => setPickerOpen(true)}
              style={{
                background: "rgba(255,255,255,.14)",
                color: "white",
                borderRadius: 999
              }}
            >
              {track ? "♪ " + (track.title || "Son") : "♪ Ajouter un son"}
            </button>

            {track ? (
              <button
                type="button"
                className="btn-ghost btn-sm"
                onClick={() => {
                  setTrack(null);
                  setMusicStart(0);
                }}
                style={{ background: "rgba(255,255,255,.12)", color: "white", borderRadius: 999 }}
              >
                Retirer
              </button>
            ) : null}
          </div>

          {/* Trim + volumes */}
          {track ? (
            <div className="card" style={{ marginTop: 10, padding: 12, background: "rgba(0,0,0,.25)" }}>
              <div style={{ fontWeight: 900, marginBottom: 8, lineHeight: 1.2 }}>
                {track.title} <span style={{ opacity: 0.75, fontWeight: 600 }}>— {track.artist}</span>
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                <label style={{ display: "grid", gap: 4 }}>
                  <span style={{ fontSize: 12, opacity: 0.85 }}>
                    Début (0–29s) : {Math.round(musicStart)}s
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="29"
                    step="1"
                    value={musicStart}
                    onChange={(e) => setMusicStart(Number(e.target.value))}
                    disabled={loading}
                  />
                </label>

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button className="btn-ghost btn-sm" onClick={previewFromStart} disabled={loading}>
                    ▶︎ Écouter depuis {Math.round(musicStart)}s
                  </button>
                </div>

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

                <label style={{ display: "grid", gap: 4 }}>
                  <span style={{ fontSize: 12, opacity: 0.85 }}>Volume vidéo</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={videoVol}
                    onChange={(e) => setVideoVol(Number(e.target.value))}
                    disabled={loading}
                  />
                </label>
              </div>

              <audio ref={audioRef} />
            </div>
          ) : null}

          {/* Caption */}
          <textarea
            className="input"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Ajouter une description…"
            rows={2}
            style={{
              width: "100%",
              marginTop: 10,
              background: "rgba(255,255,255,.10)",
              color: "white",
              border: "1px solid rgba(255,255,255,.18)"
            }}
            disabled={!user?.id || loading}
          />
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
