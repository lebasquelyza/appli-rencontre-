// sportmeet-complet/src/pages/ProgressCreate.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

const BUCKET = "progress-media";

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
        try { URL.revokeObjectURL(previewUrl); } catch {}
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

      const { error: insErr } = await supabase.from("progress_posts").insert({
        user_id: user.id,
        profile_id: profileId,
        media_url: publicUrl,
        media_type: mediaType,
        caption: cap || null,
        is_public: true
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
