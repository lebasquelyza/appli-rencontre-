// sportmeet-complet/src/pages/Settings.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export function Settings({ user, onOpenProfile }) {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [isError, setIsError] = useState(false);

  // ✅ Mes infos
  const [profileId, setProfileId] = useState(null);
  const [email, setEmail] = useState(user?.email || "");
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [phone, setPhone] = useState("");

  // ✅ Changer mot de passe (on ne lit JAMAIS le mot de passe actuel)
  const [newPass, setNewPass] = useState("");
  const [newPass2, setNewPass2] = useState("");

  useEffect(() => {
    setEmail(user?.email || "");
  }, [user?.email]);

  // ✅ Charger le dernier profil (pour pré-remplir nom/âge/téléphone)
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
          .select("id, name, age, phone")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (cancelled) return;

        if (error) {
          console.error("Settings fetch profile error:", error);
          // pas bloquant
          setProfileId(null);
          setName("");
          setAge("");
          setPhone("");
          return;
        }

        setProfileId(data?.id ?? null);
        setName(data?.name || "");
        setAge(data?.age ?? "");
        setPhone(data?.phone || "");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const setBanner = (text, err = false) => {
    setMsg(text);
    setIsError(err);
    // auto-clear léger
    window.clearTimeout(setBanner.__t);
    setBanner.__t = window.setTimeout(() => setMsg(""), 4000);
  };

  const saveEmail = async () => {
    if (!user) return;

    const next = (email || "").trim().toLowerCase();
    if (!next) return setBanner("Email invalide.", true);

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: next });
      if (error) {
        console.error("update email error:", error);
        return setBanner("Impossible de modifier l’email.", true);
      }
      // Selon la config Supabase, une validation par email peut être requise
      setBanner("Email mis à jour ✅");
    } finally {
      setLoading(false);
    }
  };

  const saveProfileInfos = async () => {
    if (!user) return;

    // On met à jour la table profiles (nom/âge/téléphone)
    // Si pas de profil encore créé => on n'invente pas un insert ici (on garde minimal)
    if (!profileId) {
      return setBanner("Crée ton profil d’abord (Mon profil sportif) pour enregistrer tes infos.", true);
    }

    const ageNum = age === "" ? null : Number(age);
    if (ageNum !== null && !Number.isFinite(ageNum)) {
      return setBanner("Âge invalide.", true);
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          name: (name || "").trim() || null,
          age: ageNum,
          phone: (phone || "").trim() || null
        })
        .eq("id", profileId);

      if (error) {
        console.error("update profile infos error:", error);
        return setBanner("Impossible d’enregistrer tes infos.", true);
      }

      setBanner("Infos enregistrées ✅");
    } finally {
      setLoading(false);
    }
  };

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
            {/* ✅ Bloc Mes infos */}
            <div className="card" style={{ padding: 14 }}>
              <h3 style={{ marginTop: 0 }}>Mes infos</h3>
              <p style={{ opacity: 0.85, marginTop: 6 }}>
                Email de connexion, nom, âge, téléphone, et changement de mot de passe.
              </p>

              <div className="form" style={{ marginTop: 10 }}>
                <div className="form-group">
                  <label>Email de connexion</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    disabled={!user}
                  />
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={saveEmail}
                    disabled={!user || loading}
                    style={{ marginTop: 8 }}
                  >
                    Mettre à jour l’email
                  </button>
                </div>

                <div className="form-group">
                  <label>Nom</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} disabled={!user} />
                </div>

                <div className="form-group">
                  <label>Âge</label>
                  <input
                    type="number"
                    min="0"
                    inputMode="numeric"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    disabled={!user}
                  />
                </div>

                <div className="form-group">
                  <label>Téléphone</label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="ex: 06 12 34 56 78"
                    disabled={!user}
                    autoComplete="tel"
                  />
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={saveProfileInfos}
                    disabled={!user || loading}
                    title={!profileId ? "Crée ton profil d’abord (Mon profil sportif)" : ""}
                  >
                    Enregistrer mes infos
                  </button>

                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => onOpenProfile?.()}
                    disabled={!user}
                    title={!user ? "Connecte-toi pour modifier ton profil" : ""}
                  >
                    Ouvrir Mon profil sportif
                  </button>
                </div>

                <div style={{ marginTop: 14 }}>
                  <h4 style={{ margin: "8px 0" }}>Changer le mot de passe</h4>

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
                    className="btn-ghost"
                    onClick={changePassword}
                    disabled={!user || loading}
                  >
                    Changer le mot de passe
                  </button>
                </div>
              </div>
            </div>

            {/* Bloc Configuration */}
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
              </div>
            </div>

            {/* Bloc Conditions d'utilisation */}
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

            {/* Bloc Cookies */}
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

