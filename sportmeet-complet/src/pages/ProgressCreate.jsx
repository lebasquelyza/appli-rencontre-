
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

/**
 * ProgressCreate (patched)
 * - Publie (upload Storage + insert DB)
 * - Affiche "Upload 1/2/3"
 * - Le bouton passe en "..." pendant le publish
 * - Après succès -> redirection FORCÉE vers /feed
 *
 * NOTE: garde ton style (page/card/btn-ghost/btn-primary) et ne touche pas le reste.
 */
export default function ProgressCreate({ user }) {
  const navigate = useNavigate();

  const [authedUser, setAuthedUser] = useState(user ?? null);

  const [files, setFiles] = useState([]);
  const [caption, setCaption] = useState("");
  const [visibility, setVisibility] = useState("public"); // "public" | "private"

  const [publishing, setPublishing] = useState(false);
  const [step, setStep] = useState(0); // 0..3
  const [banner, setBanner] = useState("");

  // si le parent ne passe pas user, on le récupère
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (authedUser?.id) return;
      const { data, error } = await supabase.auth.getUser();
      if (cancelled) return;
      if (error) {
        console.warn("auth.getUser error:", error);
        return;
      }
      setAuthedUser(data?.user ?? null);
    })();
    return () => {
      cancelled = true
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canPublish = useMemo(() => {
    return !!files.length && !!(authedUser?.id) && !publishing;
  }, [files.length, authedUser?.id, publishing]);

  function onPickFiles(e) {
    const picked = Array.from(e.target.files || []);
    setFiles(picked);
    setBanner("");
  }

  async function uploadAndCreate() {
    setBanner("");
    if (publishing) return;

    const u = authedUser;
    if (!u?.id) {
      setBanner("Connecte-toi pour publier.");
      // si tu as une page settings/login, tu peux rediriger ici
      navigate("/settings", { replace: false });
      return;
    }
    if (!files.length) {
      setBanner("Ajoute une vidéo ou une image.");
      return;
    }

    setPublishing(true);
    setStep(1);

    try {
      // 1) Upload du fichier principal (le 1er)
      const file = files[0];
      const ext = (file.name.split(".").pop() || "bin").toLowerCase();
      const isVideo = file.type?.startsWith("video/");
      const mediaType = isVideo ? "video" : "image";

      const objectPath = `progress/${u.id}/${Date.now()}-${Math.random()
        .toString(16)
        .slice(2)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("progress-media")
        .upload(objectPath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || undefined,
        });

      if (uploadError) {
        console.error("progress media upload error:", uploadError);
        setBanner("Upload impossible (bucket/RLS).");
        return;
      }

      // 2) URL publique
      setStep(2);
      const { data: pub } = supabase.storage
        .from("progress-media")
        .getPublicUrl(objectPath);

      const media_url = pub?.publicUrl;
      if (!media_url) {
        setBanner("Impossible de générer l’URL du média.");
        return;
      }

      // 3) Insert en base
      setStep(3);

      // ⚠️ Adapte ici UNIQUEMENT si ton nom de table/colonnes est différent
      const payload = {
        user_id: u.id,
        caption: caption || "",
        media_url,
        media_type: mediaType,
        visibility, // "public" | "private"
        created_at: new Date().toISOString(),
      };

      const { error: insertError } = await supabase
        .from("progress_posts")
        .insert(payload);

      if (insertError) {
        console.error("progress post insert error:", insertError);
        setBanner("Impossible de publier (table/RLS).");
        return;
      }

      // ✅ Succès: reset + redirection sûre vers le FEED
      setFiles([]);
      setCaption("");
      setVisibility("public");
      setBanner("Publié ✅");

      // redirection immédiate
      navigate("/feed", { replace: true });

      // fallback robuste au cas où le router ne bouge pas (rare)
      setTimeout(() => {
        if (window.location?.pathname?.includes("create")) {
          navigate("/feed", { replace: true });
        }
      }, 250);
    } finally {
      // important : sinon tu restes bloqué sur "..."
      setPublishing(false);
      setStep(0);
    }
  }

  return (
    <div className="page">
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "space-between" }}>
          <h2 style={{ margin: 0 }}>Publier</h2>
          <button className="btn-ghost" onClick={() => navigate(-1)} disabled={publishing}>
            Retour
          </button>
        </div>

        {banner ? (
          <div style={{ marginTop: 10, padding: 10, borderRadius: 12, background: "rgba(0,0,0,0.06)" }}>
            {banner}
          </div>
        ) : null}

        <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, opacity: 0.8 }}>Média</div>
            <input type="file" accept="image/*,video/*" onChange={onPickFiles} disabled={publishing} />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, opacity: 0.8 }}>Texte</div>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={3}
              placeholder="Écris quelque chose…"
              disabled={publishing}
              style={{ width: "100%" }}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, opacity: 0.8 }}>Visibilité</div>
            <select value={visibility} onChange={(e) => setVisibility(e.target.value)} disabled={publishing}>
              <option value="public">Public</option>
              <option value="private">Privé</option>
            </select>
          </label>

          <button
            className="btn-primary"
            onClick={uploadAndCreate}
            disabled={!canPublish}
            style={{ width: "100%", marginTop: 4 }}
          >
            {publishing ? (step ? `Upload ${step}/3…` : "…") : "Publier"}
          </button>
        </div>
      </div>
    </div>
  );
}
