// sportmeet-complet/src/pages/Settings.jsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export function Settings({ user }) {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [isError, setIsError] = useState(false);

  // Accordéons
  const [openInfos, setOpenInfos] = useState(false);
  const [openPassword, setOpenPassword] = useState(false);

  // Mes infos
  const [profileId, setProfileId] = useState(null);
  const [email, setEmail] = useState(user?.email || "");
  const [name, setName] = useState("");
  const [age, setAge] = useState("");

  // Mot de passe
  const [newPass, setNewPass] = useState("");
  const [newPass2, setNewPass2] = useState("");

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

  // Charger profil
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!user) return;

      setLoading(true);
      try {
        const { data } = await supabase
          .from("profiles")
          .select("id, name, age")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (cancelled) return;

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

  // Autosave
  const scheduleAutoSave = () => {
    if (!user) return;

    window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(async () => {
      if (savingRef.current) return;

      const nextEmail = (email || "").trim().toLowerCase();
      const nextName = (name || "").trim();
      const ageNum = age === "" ? null : Number(age);

      if (ageNum !== null && !Number.isFinite(ageNum)) {
        setBanner("Âge invalide.", true);
        return;
      }

      savingRef.current = true;
      setLoading(true);
      try {
        if (nextEmail && nextEmail !== (user?.email || "").toLowerCase()) {
          const { error } = await supabase.auth.updateUser({ email: nextEmail });
          if (error) return setBanner("Impossible de modifier l’email.", true);
        }

        if (profileId) {
          const { error } = await supabase
            .from("profiles")
            .update({ name: nextName || null, age: ageNum })
            .eq("id", profileId);

          if (error) return setBanner("Impossible d’enregistrer tes infos.", true);
        }

        setBanner("Enregistré ✅");
      } finally {
        savingRef.current = false;
        setLoading(false);
      }
    }, 600);
  };

  const changePassword = async () => {
    if (!newPass || newPass.length < 6)
      return setBanner("Mot de passe : 6 caractères minimum.", true);
    if (newPass !== newPass2)
      return setBanner("Les mots de passe ne correspondent pas.", true);

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPass });
      if (error) return setBanner("Impossible de changer le mot de passe.", true);

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

          {msg && (
            <p className={`form-message ${isError ? "error" : ""}`} style={{ marginTop: 12 }}>
              {msg}
            </p>
          )}

          <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
            {/* Mes infos */}
            <div className="card" style={{ padding: 14 }}>
              <h3 style={{ marginTop: 0 }}>Mes infos</h3>
              <p style={{ opacity: 0.85, marginTop: 6 }}>
                Email, nom et âge. Enregistrement automatique.
              </p>

              <button
                className="btn-primary"
                onClick={() => setOpenInfos((v) => !v)}
                disabled={!user}
              >
                {openInfos ? "Fermer" : "Ouvrir"}
              </button>

              {openInfos && (
                <div className="form" style={{ marginTop: 12 }}>
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        scheduleAutoSave();
                      }}
                      onBlur={scheduleAutoSave}
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
                    />
                  </div>

                  <div className="form-group">
                    <label>Âge</label>
                    <input
                      type="number"
                      value={age}
                      onChange={(e) => {
                        setAge(e.target.value);
                        scheduleAutoSave();
                      }}
                      onBlur={scheduleAutoSave}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Mot de passe */}
            <div className="card" style={{ padding: 14 }}>
              <h3 style={{ marginTop: 0 }}>Mot de passe</h3>
              <p style={{ opacity: 0.85, marginTop: 6 }}>
                Changer ton mot de passe.
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
                    />
                  </div>

                  <div className="form-group">
                    <label>Confirmer</label>
                    <input
                      type="password"
                      value={newPass2}
                      onChange={(e) => setNewPass2(e.target.value)}
                    />
                  </div>

                  <button className="btn-primary" onClick={changePassword}>
                    Changer le mot de passe
                  </button>
                </div>
              )}
            </div>

            {/* Configuration */}
            <div className="card" style={{ padding: 14 }}>
              <h3 style={{ marginTop: 0 }}>Configuration</h3>
              <p style={{ opacity: 0.85, marginTop: 6 }}>
                Modifier ton profil, tes infos et tes préférences.
              </p>
              <button
                className="btn-primary"
                onClick={() => navigate("/account")}
                disabled={!user}
              >
                Configurer
              </button>
            </div>

            {/* Conditions */}
            <div className="card" style={{ padding: 14 }}>
              <h3 style={{ marginTop: 0 }}>Conditions d’utilisation</h3>
              <p style={{ opacity: 0.85, marginTop: 6 }}>
                Règles, âge minimum (16+), contenu, suspension/bloquage.
              </p>
              <button className="btn-primary" onClick={() => navigate("/conditions")}>
                Ouvrir
              </button>
            </div>

            {/* Cookies */}
            <div className="card" style={{ padding: 14 }}>
              <h3 style={{ marginTop: 0 }}>Cookies</h3>
              <p style={{ opacity: 0.85, marginTop: 6 }}>
                Informations sur les cookies et le fonctionnement des sessions.
              </p>
              <button className="btn-primary" onClick={() => navigate("/cookies")}>
                Ouvrir
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
