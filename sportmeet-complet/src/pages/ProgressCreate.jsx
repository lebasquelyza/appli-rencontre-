// sportmeet-complet/src/pages/ProgressCreate.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

const BUCKET = "progress-media";

// iTunes Search API (no auth, CORS OK). Returns previewUrl (30s).
async function searchItunesTracks(term) {
  const q = String(term || "").trim();
  if (!q) return [];
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=song&limit=20`;
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

export function ProgressCreate({ user }) {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [caption, setCaption] = useState("");

  // Music search + selection (preview 30s)
  const [musicQuery, setMusicQuery] = useState("");
  const [musicLoading, setMusicLoading] = useState(false);
  const [musicErr, setMusicErr] = useState("");
  const [musicResults, setMusicResults] = useState([]);
  const [selectedTrack, setSelectedTrack] = useState(null); // {provider, track_id, title, artist, artwork, preview_url}
  const [musicStart, setMusicStart] = useState(0); // seconds within preview (0..29)
  const [musicVol, setMusicVol] = useState(0.6);
  const [videoVol, setVideoVol] = useState(1.0);
  const previewAudioRef = useRef(null);

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

  const runMusicSearch = async () => {
    const q = String(musicQuery || "").trim();
    if (!q) {
      setMusicErr("Écris un titre ou un artiste.");
      return;
    }
    setMusicLoading(true);
    setMusicErr("");
    try {
      const results = await searchItunesTracks(q);
      setMusicResults(results);
      if (!results.length) setMusicErr("Aucun résultat.");
    } catch (e) {
      console.error("music search error:", e);
      setMusicErr("Recherche impossible.");
      setMusicResults([]);
    } finally {
      setMusicLoading(false);
    }
  };

  const selectTrack = (t) => {
    setSelectedTrack(t);
    setMusicStart(0);
    setMusicErr("");
    // stop previous preview
    try {
      const a = previewAudioRef.current;
      if (a) {
        a.pause();
        a.currentTime = 0;
      }
    } catch {}
  };

  const playPreviewFromStart = async () => {
    try {
      const a = previewAudioRef.current;
      if (!a) return;
      a.volume = Math.min(1, Math.max(0, Number(musicVol || 0)));
      a.currentTime = Math.min(29, Math.max(0, Number(musicStart || 0)));
      const p = a.play();
      if (p?.catch) p.catch(() => {});
    } catch (e) {
      console.log("preview play blocked:", e);
    }
  };

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

      const musicTitle = selectedTrack
        ? `${selectedTrack.title}${selectedTrack.artist ? " — " + selectedTrack.artist : ""}`
        : null;
      const musicUrl = selectedTrack?.preview_url || null;

      const { error: insErr } = await supabase.from("progress_posts").insert({
        user_id: user.id,
        profile_id: profileId,
        media_url: publicUrl,
        media_type: mediaType,
        caption: cap || null,
        is_public: true,

        // music (preview 30s)
        music_url: musicUrl,
        music_title: musicTitle,
        music_provider: selectedTrack?.provider || null,
        music_track_id: selectedTrack?.track_id || null,
        music_start_sec: musicUrl ? Math.min(29, Math.max(0, Number(musicStart || 0))) : 0,

        // default volumes (can be overridden client-side)
        music_volume: Math.min(1, Math.max(0, Number(musicVol || 0.6))),
        video_volume: Math.min(1, Math.max(0, Number(videoVol || 1.0)))
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
      <div className="shell">
        <section className="card" style={{ padding: 16, maxWidth: 820, margin: "8px auto 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "space-between" }}>
            <button className="btn-ghost" onClick={() => navigate("/feed")}>
              ← Retour
            </button>
            <h1 style={{ margin: 0 }}>Publier</h1>
            <div style={{ width: 80 }} />
          </div>

          {msg ? (
            <p className={`form-message ${isError ? "error" : ""}`} style={{ marginTop: 12 }}>
              {msg}
            </p>
          ) : null}

          {/* MEDIA */}
          <div className="card" style={{ padding: 14, marginTop: 14 }}>
            <h3 style={{ marginTop: 0 }}>Média</h3>
            <p style={{ opacity: 0.85, marginTop: 6 }}>Ajoute une vidéo ou une image de ta progression.</p>

            <input
              type="file"
              accept="video/*,image/*"
              onChange={onPick}
              disabled={!user?.id || loading}
              style={{ marginTop: 10 }}
            />

            {previewUrl ? (
              <div style={{ marginTop: 12 }}>
                {file?.type?.startsWith("video/") ? (
                  <video
                    src={previewUrl}
                    controls
                    playsInline
                    style={{ width: "100%", maxHeight: 420, borderRadius: 14, background: "#000" }}
                  />
                ) : (
                  <img
                    src={previewUrl}
                    alt="Aperçu"
                    style={{ width: "100%", maxHeight: 420, objectFit: "cover", borderRadius: 14 }}
                  />
                )}
              </div>
            ) : null}
          </div>

          {/* MUSIC */}
          <div className="card" style={{ padding: 14, marginTop: 12 }}>
            <h3 style={{ marginTop: 0 }}>Musique</h3>
            <p style={{ opacity: 0.85, marginTop: 6 }}>
              Recherche un titre / artiste, puis choisis la partie du son (preview 30s).
            </p>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
              <input
                className="input"
                style={{ flex: 1, minWidth: 220 }}
                value={musicQuery}
                onChange={(e) => setMusicQuery(e.target.value)}
                placeholder="Ex: Drake, Dua Lipa, Eminem…"
                disabled={loading}
              />
              <button className="btn-primary" onClick={runMusicSearch} disabled={loading || musicLoading}>
                {musicLoading ? "..." : "Rechercher"}
              </button>
              {selectedTrack ? (
                <button className="btn-ghost" onClick={() => setSelectedTrack(null)} disabled={loading}>
                  Retirer
                </button>
              ) : null}
            </div>

            {musicErr ? (
              <p className="form-message error" style={{ marginTop: 10 }}>
                {musicErr}
              </p>
            ) : null}

            {selectedTrack ? (
              <div className="card" style={{ padding: 12, marginTop: 12 }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <img
                    src={selectedTrack.artwork || "/avatar.png"}
                    alt=""
                    style={{ width: 56, height: 56, borderRadius: 12, objectFit: "cover" }}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = "/avatar.png";
                    }}
                  />
                  <div style={{ lineHeight: 1.25 }}>
                    <div style={{ fontWeight: 800 }}>{selectedTrack.title}</div>
                    <div style={{ opacity: 0.8 }}>{selectedTrack.artist}</div>
                    <div style={{ opacity: 0.65, fontSize: 12 }}>Source : iTunes (preview 30s)</div>
                  </div>
                </div>

                <audio
                  ref={previewAudioRef}
                  src={selectedTrack.preview_url}
                  preload="auto"
                  controls
                  style={{ width: "100%", marginTop: 10 }}
                  onPlay={() => {
                    try {
                      const a = previewAudioRef.current;
                      if (a) a.volume = Math.min(1, Math.max(0, Number(musicVol || 0)));
                    } catch {}
                  }}
                />

                <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                  <label style={{ display: "grid", gap: 4 }}>
                    <span style={{ fontSize: 12, opacity: 0.85 }}>
                      Début musique (0–29s) : {Math.round(musicStart)}s
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
                    <button className="btn-ghost btn-sm" onClick={playPreviewFromStart} disabled={loading}>
                      ▶︎ Écouter depuis {Math.round(musicStart)}s
                    </button>
                  </div>

                  <label style={{ display: "grid", gap: 4 }}>
                    <span style={{ fontSize: 12, opacity: 0.85 }}>Volume musique (par défaut)</span>
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
                    <span style={{ fontSize: 12, opacity: 0.85 }}>Volume vidéo (par défaut)</span>
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
              </div>
            ) : musicResults.length ? (
              <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                {musicResults.map((t) => (
                  <button
                    key={t.provider + "_" + t.track_id}
                    type="button"
                    className="card"
                    style={{ padding: 10, textAlign: "left", display: "flex", gap: 10, alignItems: "center" }}
                    onClick={() => selectTrack(t)}
                    disabled={loading}
                    title="Sélectionner"
                  >
                    <img
                      src={t.artwork || "/avatar.png"}
                      alt=""
                      style={{ width: 44, height: 44, borderRadius: 10, objectFit: "cover" }}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = "/avatar.png";
                      }}
                    />
                    <div style={{ lineHeight: 1.25 }}>
                      <div style={{ fontWeight: 800 }}>{t.title}</div>
                      <div style={{ opacity: 0.8, fontSize: 13 }}>{t.artist}</div>
                    </div>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {/* CAPTION */}
          <div className="card" style={{ padding: 14, marginTop: 12 }}>
            <h3 style={{ marginTop: 0 }}>Légende</h3>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Ex: Semaine 3 : +5kg au squat 💪"
              rows={3}
              className="input"
              style={{ width: "100%", resize: "vertical" }}
              disabled={!user?.id || loading}
            />
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
            <button className="btn-primary" onClick={uploadAndCreate} disabled={!user?.id || loading}>
              {loading ? "Publication…" : "Publier"}
            </button>
            <button className="btn-ghost" onClick={() => navigate("/feed")} disabled={loading}>
              Annuler
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
