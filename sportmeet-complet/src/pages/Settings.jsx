// sportmeet-complet/src/pages/Settings.jsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export function Settings({ user, onOpenProfile }) {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [isError, setIsError] = useState(false);

  // ✅ Accordéons
  const [openInfos, setOpenInfos] = useState(false);
  const [openPassword, setOpenPassword] = useState(false);

  // ✅ Mes infos
  const [profileId, setProfileId] = useState(null);
  const [email, setEmail] = useState(user?.email || "");
  const [name, setName] = useState("");
  const [age, setAge] = useState("");

  // ✅ Changer mot de passe
  const [newPass, setNewPass] = useState("");
  const [newPass2, setNewPass2] = useState("");

  // ✅ debounce autosave
  const saveTimerRef = useRef(null);
  const savingRef = useRef(false);

  useEffect(() => {
    setEmail(user?.email || "");
  }, [user?.email]);

  const setBanner = (text, err = false) => {
    setMsg(text);
    setIsError(err);
    window.clearTimeout(setBanner.__t);
    setBanner.__t = window.setTimeout(() => setMsg(""), 3500);
  };

  // ✅ Charger le dernier profil (pour pré-remplir nom/âge)
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!user) return;

      setLoading(true);
      setMsg("");
      setIsError(false);

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, name, age")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (cancelled) return;

        if (error) {
          console.error("Settings fetch profile error:", error);
          setProfileId(null);
          setName("");
          setAge("");
          return;
        }

        setProfileId(data?.id ?? null);
        setName(data?.name || "");
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

  // ✅ Autosave (email + nom + âge) sans bouton
  const scheduleAutoSave = () => {
    if (!user) return;

    window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(async () => {
      if (!user) return;
      if (savingRef.current) return;

      const nextEmail = (email || "").trim().toLowerCase();
      const nextName = (name || "").trim();
      const ageNum = age === "" ? null : Number(age);

      // validations minimales
      if (ageNum !== null && !Number.isFinite(ageNum)) {
        setBanner("Âge invalide.", true);
        return;
      }

      savingRef.current = true;
      setLoading(true);
      try {
        // 1) email (supabase auth)
        if (nextEmail && nextEmail !== (user?.email || "").toLowerCase()) {
          const { error: emailErr } = await supabase.auth.updateUser({ email: nextEmail });
          if (emailErr) {
            console.error("update email error:", emailErr);
            setBanner("Impossible de modifier l’email.", true);
            return;
          }
        }

        // 2) nom/âge (table profiles) -> seulement si profil existe
        if (profileId) {
          const { error: profErr } = await supabase
            .from("profiles")
            .update({
              name: nextName || null,
              age: ageNum
            })
            .eq("id", profileId);

          if (profErr) {
            console.error("update profiles error:", profErr);
            setBanner("Impossible d’enregistrer tes infos.", true);
            return;
          }
        } else {
          // pas de profil => on ne crée rien automatiquement
          if (nextName || ageNum != null) {
            setBanner(
              "Crée ton profil (Mon profil sportif) pour enregistrer ton nom/âge.",
              true
            );
            return;
          }
        }

        setBanner("Enregistré ✅");
      } finally {
        savingRef.current = false;
        setLoading(false);
      }
    }, 650);
  };

  useEffect(() => {
    return () => window.clearTimeout(saveTimerRef.current);
  }, []);

  const changePassword = async () => {
    if (!user) return;

    if (!newPass || newPass.length < 6) return setBanner("Mot de passe : 6 caractères minimum.", true);
    if (newPass !== newPass2) return setBanner("Les mots de passe ne correspondent pas.", true);

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

          {msg ? (
            <p className={`form-message ${isError ? "error" : ""}`} style={{ marginTop: 12 }}>
              {msg}
            </p>
          ) : null}

          <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
            {/* ✅ Bloc Mes infos (cliquable) */}
            <div className="card" style={{ padding: 14 }}>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setOpenInfos((v) => !v)}
                disabled={!user}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: 0
                }}
                title={!user ? "Connecte-toi" : ""}
              >
                <h3 style={{ margin: 0 }}>Mes infos</h3>
                <span style={{ opacity: 0.7 }}>{openInfos ? "▲" : "▼"}</span>
              </button>

              <p style={{ opacity: 0.85, marginTop: 6 }}>
                Email, nom et âge. Enregistrement automatique.
              </p>

              {openInfos && (
                <div className="form" style={{ marginTop: 10 }}>
                  <div className="form-group">
                    <label>Email de connexion</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        scheduleAutoSave();
                      }}
                      onBlur={scheduleAutoSave}
                      autoComplete="email"
                      disabled={!user}
                    />
                  </div>

                  <div className="form-group">
                    <label>Nom</label>
                    <input
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        scheduleAutoSave();
                      }}
                      onBlur={scheduleAutoSave}
                      disabled={!user}
                    />
                  </div>

                  <div className="form-group">
                    <label>Âge</label>
                    <input
                      type="number"
                      min="0"
                      inputMode="numeric"
                      value={age}
                      onChange={(e) => {
                        setAge(e.target.value);
                        scheduleAutoSave();
                      }}
                      onBlur={scheduleAutoSave}
                      disabled={!user}
                    />
                  </div>

                  {loading ? (
                    <small style={{ display: "block", marginTop: 6, opacity: 0.75 }}>...</small>
                  ) : null}
                </div>
              )}
            </div>

            {/* ✅ Bloc Mot de passe (dépliable) */}
            <div className="card" style={{ padding: 14 }}>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setOpenPassword((v) => !v)}
                disabled={!user}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: 0
                }}
                title={!user ? "Connecte-toi" : ""}
              >
                <h3 style={{ margin: 0 }}>Mot de passe</h3>
                <span style={{ opacity: 0.7 }}>{openPassword ? "▲" : "▼"}</span>
              </button>

              <p style={{ opacity: 0.85, marginTop: 6 }}>
                Change ton mot de passe (on n’affiche jamais l’ancien).
              </p>

              {openPassword && (
                <div className="form" style={{ marginTop: 10 }}>
                  <div className="form-group">
                    <label>Nouveau mot de passe</label>
                    <input
                      type="password"
                      value={newPass}
                      onChange={(e) => setNewPass(e.target.value)}
                      autoComplete="new-password"
                      disabled={!user}
                      placeholder="6 caractères minimum"
                    />
                  </div>

                  <div className="form-group">
                    <label>Confirmer</label>
                    <input
                      type="password"
                      value={newPass2}
                      onChange={(e) => setNewPass2(e.target.value)}
                      autoComplete="new-password"
                      disabled={!user}
                      placeholder="Répète le mot de passe"
                    />
                  </div>

                  <button
                    type="button"
                    className="btn-primary"
                    onClick={changePassword}
                    disabled={!user || loading}
                  >
                    Changer le mot de passe
                  </button>
                </div>
              )}
            </div>

            {/* Bloc Configuration (inchangé) */}
            <div className="card" style={{ padding: 14 }}>
              <h3 style={{ marginTop: 0 }}>Configuration</h3>
              <p style={{ opacity: 0.85, marginTop: 6 }}>
                Modifier ton profil, tes infos et tes préférences.
              </p>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                <button
                  className="btn-primary"
                  onClick={() => navigate("/account")}
                  disabled={!user}
                  title={!user ? "Connecte-toi pour configurer ton compte" : ""}
                >
                  Configurer
                </button>

                {/* on garde la prop, mais on ne l’affiche plus (tu voulais enlever le bouton) */}
                {/* <button className="btn-ghost" type="button" onClick={() => onOpenProfile?.()}>
                  Mon profil sportif
                </button> */}
              </div>
            </div>

            {/* Bloc Conditions d'utilisation (inchangé) */}
            <div className="card" style={{ padding: 14 }}>
              <h3 style={{ marginTop: 0 }}>Conditions d’utilisation</h3>
              <p style={{ opacity: 0.85, marginTop: 6 }}>
                Règles, âge minimum (16+), contenu, suspension/bloquage.
              </p>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                <button className="btn-primary" onClick={() => navigate("/conditions")}>
                  Ouvrir
                </button>
              </div>
            </div>

            {/* Bloc Cookies (inchangé) */}
            <div className="card" style={{ padding: 14 }}>
              <h3 style={{ marginTop: 0 }}>Cookies</h3>
              <p style={{ opacity: 0.85, marginTop: 6 }}>
                Informations sur les cookies et le fonctionnement des sessions.
              </p>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                <button className="btn-primary" onClick={() => navigate("/cookies")}>
                  Ouvrir
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

