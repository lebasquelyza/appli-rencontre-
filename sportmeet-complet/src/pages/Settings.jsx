// sportmeet-complet/src/pages/Settings.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export function Settings({ user }) {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [isError, setIsError] = useState(false);

  // ✅ Mot de passe dépliable
  const [openPassword, setOpenPassword] = useState(false);

  // ✅ Mes infos (lecture seule, toujours visible)
  const [email, setEmail] = useState(user?.email || "");
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

  return (
    <main className="page">
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
            {/* ✅ Mes infos (toujours visible, non modifiable) */}
            <div className="card" style={{ padding: 14 }}>
              <h3 style={{ marginTop: 0 }}>Mes infos</h3>
              <p style={{ opacity: 0.85, marginTop: 6 }}>
                Informations de ton compte (lecture seule).
              </p>

              <div className="form" style={{ marginTop: 12 }}>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={email || "Non renseigné"}
                    disabled
                    readOnly
                    style={whiteDisabledInputStyle}
                  />
                </div>

                <div className="form-group">
                  <label>Nom</label>
                  <input value={displayName} disabled readOnly style={whiteDisabledInputStyle} />
                </div>

                <div className="form-group">
                  <label>Âge</label>
                  <input
                    type="text"
                    value={displayAge}
                    disabled
                    readOnly
                    style={whiteDisabledInputStyle}
                  />
                </div>

                {loading ? (
                  <small style={{ display: "block", marginTop: 6, opacity: 0.75 }}>...</small>
                ) : null}
              </div>
            </div>

            {/* ✅ Mot de passe (dépliable) */}
            <div className="card" style={{ padding: 14 }}>
              <h3 style={{ marginTop: 0 }}>Mot de passe</h3>
              <p style={{ opacity: 0.85, marginTop: 6 }}>
                Change ton mot de passe (on n’affiche jamais l’ancien).
              </p>

              <button
                className="btn-primary"
                onClick={() => setOpenPassword((v) => !v)}
                disabled={!user}
              >
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

                  <button
                    className="btn-primary"
                    onClick={changePassword}
                    disabled={!user || loading}
                  >
                    Changer le mot de passe
                  </button>
                </div>
              )}
            </div>

            {/* ✅ Configuration */}
            <div className="card" style={{ padding: 14 }}>
              <h3 style={{ marginTop: 0 }}>Configuration</h3>
              <p style={{ opacity: 0.85, marginTop: 6 }}>
                Modifier ton profil, tes infos et tes préférences.
              </p>
              <button className="btn-primary" onClick={() => navigate("/account")} disabled={!user}>
                Configurer
              </button>
            </div>

            {/* ✅ Conditions */}
            <div className="card" style={{ padding: 14 }}>
              <h3 style={{ marginTop: 0 }}>Conditions d’utilisation</h3>
              <p style={{ opacity: 0.85, marginTop: 6 }}>
                Règles, âge minimum (16+), contenu, suspension/bloquage.
              </p>
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
                <a href="mailto:sportifandpro@gmail.com">sportifandpro@gmail.com</a>.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
