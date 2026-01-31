// sportmeet-complet/src/pages/Settings.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export function Settings({ user, onClearHiddenProfiles, hiddenCount = 0 }) {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [isError, setIsError] = useState(false);

  // ✅ Préférences audio feed (localStorage)
  const LS_VIDEO_VOL = "mf_feed_video_vol";
  const LS_MUSIC_VOL = "mf_feed_music_vol";

  const readVol = (key, fallback) => {
    try {
      const raw = localStorage.getItem(key);
      const n = Number(raw);
      if (Number.isFinite(n)) return Math.min(1, Math.max(0, n));
    } catch {}
    return fallback;
  };

  const [feedVideoVol, setFeedVideoVol] = useState(() => readVol(LS_VIDEO_VOL, 1));
  const [feedMusicVol, setFeedMusicVol] = useState(() => readVol(LS_MUSIC_VOL, 0.6));

  useEffect(() => {
    try { localStorage.setItem(LS_VIDEO_VOL, String(feedVideoVol)); } catch {}
  }, [feedVideoVol]);

  useEffect(() => {
    try { localStorage.setItem(LS_MUSIC_VOL, String(feedMusicVol)); } catch {}
  }, [feedMusicVol]);


  // ✅ Mot de passe dépliable
  const [openPassword, setOpenPassword] = useState(false);

  // ✅ Mes infos (lecture seule, toujours visible)
  const [email, setEmail] = useState(user?.email || "");
  const [newEmail, setNewEmail] = useState("");
  const [openEmailEdit, setOpenEmailEdit] = useState(false);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");

  // ✅ Mot de passe
  const [newPass, setNewPass] = useState("");
  const [newPass2, setNewPass2] = useState("");

  useEffect(() => {
    setEmail(user?.email || "");
  }, [user?.email]);

  const setBanner = (text, err = false) => {
    setMsg(text);
    setIsError(err);
    window.clearTimeout(setBanner.__t);
    setBanner.__t = window.setTimeout(() => setMsg(""), 3500);
  };

  // ✅ Partager MatchFit (Web Share API + fallback copie)
  const handleShare = async () => {
    const url = window.location.origin;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "MatchFit",
          text: "Rejoins-moi sur MatchFit 💪",
          url
        });
        return;
      }
    } catch {
      // l'utilisateur peut annuler -> on ignore
    }

    try {
      await navigator.clipboard.writeText(url);
      setBanner("Lien copié ✅");
    } catch {
      window.prompt("Copie ce lien :", url);
    }
  };

  const goFeed = () => navigate("/feed");
  const goPost = () => navigate("/post");


  // ✅ Charger profil pour afficher nom/âge (read-only)
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!user) return;

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("name, age")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (cancelled) return;

        if (error) {
          console.error("Settings fetch profile error:", error);
          setName("");
          setAge("");
          return;
        }

        setName(typeof data?.name === "string" ? data.name : "");
        setAge(data?.age ?? "");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);


const changeEmail = async () => {
  if (!user) return;

  const next = (newEmail || "").trim().toLowerCase();
  if (!next || !next.includes("@")) {
    return setBanner("Adresse email invalide.", true);
  }
  if ((email || "").trim().toLowerCase() === next) {
    return setBanner("C’est déjà ton email actuel.", true);
  }

  setLoading(true);
  try {
    const { error } = await supabase.auth.updateUser(
      { email: next },
      { emailRedirectTo: `${window.location.origin}/auth/callback` }
    );

    if (error) {
      console.error("update email error:", error);
      return setBanner("Impossible de modifier l’email.", true);
    }

    setNewEmail("");
    setBanner(
      "Un email de confirmation vient d’être envoyé. Le changement sera effectif après validation ✅"
    );
  } finally {
    setLoading(false);
  }
};

  const changePassword = async () => {
    if (!user) return;

    if (!newPass || newPass.length < 6) {
      return setBanner("Mot de passe : 6 caractères minimum.", true);
    }
    if (newPass !== newPass2) {
      return setBanner("Les mots de passe ne correspondent pas.", true);
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPass });
      if (error) {
        console.error("update password error:", error);
        return setBanner("Impossible de changer le mot de passe.", true);
      }

      setNewPass("");
      setNewPass2("");
      setBanner("Mot de passe changé ✅");
    } finally {
      setLoading(false);
    }
  };

  const displayName = (name || "").trim() || "Non renseigné";
  const displayAge = age === "" || age == null ? "Non renseigné" : String(age);

  const whiteDisabledInputStyle = {
    color: "#fff",
    WebkitTextFillColor: "#fff",
    opacity: 1
  };

  // ✅ style lien "primary" (même couleur que les boutons primary)
  const primaryLinkStyle = {
    color: "var(--primary)",
    fontWeight: 600,
    textDecoration: "none"
  };

  return (
    <main className="page page--settings" style={{ minHeight: "calc(var(--appH, 100vh))" }}>
      <div className="shell">
        <section className="card" style={{ padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button className="btn-ghost" onClick={() => navigate("/")}>
              ← Retour
            </button>
            <h1 style={{ margin: 0 }}>Réglages</h1>
          </div>

          {!user && (
            <p className="form-message" style={{ marginTop: 12 }}>
              Connecte-toi pour accéder à la configuration du compte.
            </p>
          )}

          {msg && (
            <p className={`form-message ${isError ? "error" : ""}`} style={{ marginTop: 12 }}>
              {msg}
            </p>
          )}

          <div style={{ display: "grid", gap: 12, marginTop: 16 }}>

            {/* ✅ Volumes du feed (préférences locales) */}
            <div className="card" style={{ padding: 14 }}>
              <h3 style={{ marginTop: 0 }}>Volumes du feed</h3>
              <p style={{ opacity: 0.85, marginTop: 6 }}>
                Réglages enregistrés sur ce téléphone (vidéo + musique).
              </p>

              <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                <label style={{ display: "grid", gap: 4 }}>
                  <span style={{ fontSize: 12, opacity: 0.85 }}>
                    Volume vidéo : {Math.round(feedVideoVol * 100)}%
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={feedVideoVol}
                    onChange={(e) => setFeedVideoVol(Number(e.target.value))}
                  />
                </label>

                <label style={{ display: "grid", gap: 4 }}>
                  <span style={{ fontSize: 12, opacity: 0.85 }}>
                    Volume musique : {Math.round(feedMusicVol * 100)}%
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={feedMusicVol}
                    onChange={(e) => setFeedMusicVol(Number(e.target.value))}
                  />
                </label>

                <button
                  type="button"
                  className="btn-ghost btn-sm"
                  onClick={() => {
                    setFeedVideoVol(1);
                    setFeedMusicVol(0.6);
                  }}
                >
                  Réinitialiser
                </button>
              </div>
            </div>


            {/* ✅ Mes infos (toujours visible, non modifiable) */}
            <div className="card" style={{ padding: 14 }}>
              <h3 style={{ marginTop: 0 }}>Mes infos</h3>
              <p style={{ opacity: 0.85, marginTop: 6 }}>Informations de ton compte.</p>

              <div className="form" style={{ marginTop: 12 }}>
                <div className="form-group">
  <label>Email</label>
  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
    <input
      type="email"
      value={email || "Non renseigné"}
      disabled
      readOnly
      style={{ ...whiteDisabledInputStyle, flex: "1 1 260px", minWidth: 240 }}
    />

    <button
      type="button"
      className="btn-ghost btn-sm"
      onClick={() => {
        setOpenEmailEdit((v) => !v);
        setNewEmail("");
      }}
      disabled={!user || loading}
      style={{ padding: "8px 10px" }}
    >
      {openEmailEdit ? "Annuler" : "Modifier"}
    </button>
  </div>
</div>

{openEmailEdit && (
  <>
    <div className="form-group">
      <label>Nouvelle adresse email</label>
      <input
        type="email"
        value={newEmail}
        onChange={(e) => setNewEmail(e.target.value)}
        disabled={!user || loading}
        placeholder="nouvel@email.com"
        autoComplete="email"
      />
      <small style={{ display: "block", marginTop: 6, opacity: 0.75, lineHeight: 1.3 }}>
        Tu devras confirmer via un email (comme à l’inscription). Ton compte et ton ID ne changent pas.
      </small>
    </div>

    <button
      type="button"
      className="btn-primary btn-sm"
      onClick={changeEmail}
      disabled={!user || loading || !newEmail}
      style={{ padding: "10px 12px", width: "fit-content" }}
    >
      Confirmer l’email
    </button>
  </>
)}

                <div className="form-group">
                  <label>Nom</label>
                  <input value={displayName} disabled readOnly style={whiteDisabledInputStyle} />
                </div>

                <div className="form-group">
                  <label>Âge</label>
                  <input type="text" value={displayAge} disabled readOnly style={whiteDisabledInputStyle} />
                </div>

                {loading ? <small style={{ display: "block", marginTop: 6, opacity: 0.75 }}>...</small> : null}
              </div>
            </div>

            {/* ✅ Comment ça marche */}
            <div className="card" style={{ padding: 14 }}>
              <h3 style={{ marginTop: 0 }}>Comment ça marche</h3>
              <p style={{ opacity: 0.85, marginTop: 6 }}>
                Comprendre le swipe, les superlikes (5/semaine), les matchs et la sécurité.
              </p>

              <button className="btn-primary" onClick={() => navigate("/comment-ca-marche")}>
                Ouvrir
              </button>
            </div>

            {/* ✅ Mot de passe (dépliable) */}
            <div className="card" style={{ padding: 14 }}>
              <h3 style={{ marginTop: 0 }}>Mot de passe</h3>
              <p style={{ opacity: 0.85, marginTop: 6 }}>
                Change ton mot de passe (on n’affiche jamais l’ancien).
              </p>

              <button className="btn-primary" onClick={() => setOpenPassword((v) => !v)} disabled={!user}>
                {openPassword ? "Fermer" : "Ouvrir"}
              </button>

              {openPassword && (
                <div className="form" style={{ marginTop: 12 }}>
                  <div className="form-group">
                    <label>Nouveau mot de passe</label>
                    <input
                      type="password"
                      value={newPass}
                      onChange={(e) => setNewPass(e.target.value)}
                      disabled={!user || loading}
                      autoComplete="new-password"
                      placeholder="6 caractères minimum"
                    />
                  </div>

                  <div className="form-group">
                    <label>Confirmer</label>
                    <input
                      type="password"
                      value={newPass2}
                      onChange={(e) => setNewPass2(e.target.value)}
                      disabled={!user || loading}
                      autoComplete="new-password"
                      placeholder="Répète le mot de passe"
                    />
                  </div>

                  <button className="btn-primary" onClick={changePassword} disabled={!user || loading}>
                    Changer le mot de passe
                  </button>
                </div>
              )}
            </div>
{/* ✅ Configuration */}
            <div className="card" style={{ padding: 14 }}>
              <h3 style={{ marginTop: 0 }}>Configuration</h3>
              <p style={{ opacity: 0.85, marginTop: 6 }}>Modifier ton profil, tes infos et tes préférences.</p>
              <button className="btn-primary" onClick={() => navigate("/account")} disabled={!user}>
                Configurer
              </button>
            </div>

            {/* ✅ Abonnement */}
            <div className="card" style={{ padding: 14 }}>
              <h3 style={{ marginTop: 0 }}>Abonnement</h3>
              <p style={{ opacity: 0.85, marginTop: 6 }}>Gère ton abonnement (activation bientôt).</p>
              <button className="btn-primary" onClick={() => navigate("/subscription")} disabled={!user}>
                Ouvrir
              </button>
            </div>

            {/* ✅ Conditions */}
            <div className="card" style={{ padding: 14 }}>
              <h3 style={{ marginTop: 0 }}>Conditions d’utilisation</h3>
              <p style={{ opacity: 0.85, marginTop: 6 }}>Règles, âge minimum (16+), contenu, suspension/bloquage.</p>
              <button className="btn-primary" onClick={() => navigate("/conditions")}>
                Ouvrir
              </button>
            </div>

            {/* ✅ Cookies */}
            <div className="card" style={{ padding: 14 }}>
              <h3 style={{ marginTop: 0 }}>Cookies</h3>
              <p style={{ opacity: 0.85, marginTop: 6 }}>
                Informations sur les cookies et le fonctionnement des sessions.
              </p>
              <button className="btn-primary" onClick={() => navigate("/cookies")}>
                Ouvrir
              </button>
            </div>

            {/* ✅ Nous contacter */}
            <div className="card" style={{ padding: 14 }}>
              <h3 style={{ marginTop: 0 }}>Nous contacter</h3>
              <p style={{ opacity: 0.85, marginTop: 6 }}>
                Une question ou besoin d’aide ? Écris-nous à{" "}
                <a href="mailto:sportifandpro@gmail.com" style={primaryLinkStyle}>
                  sportifandpro@gmail.com
                </a>
                .
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
