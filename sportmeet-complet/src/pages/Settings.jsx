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

  // ✅ Matchs masqués dépliable
  const [openHiddenMatches, setOpenHiddenMatches] = useState(false);

  // ✅ Mes infos (lecture seule, toujours visible)
  const [email, setEmail] = useState(user?.email || "");
  const [name, setName] = useState("");
  const [age, setAge] = useState("");

  // ✅ Mot de passe
  const [newPass, setNewPass] = useState("");
  const [newPass2, setNewPass2] = useState("");

  // ✅ Matchs masqués
  const [hiddenMatches, setHiddenMatches] = useState([]);
  const [loadingHiddenMatches, setLoadingHiddenMatches] = useState(false);
  const [hiddenMatchesLoaded, setHiddenMatchesLoaded] = useState(false);

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

  // ✅ Fetch "matchs masqués" (hidden_matches -> matches -> profiles)
  const fetchHiddenMatches = async () => {
    if (!user) {
      setHiddenMatches([]);
      setHiddenMatchesLoaded(false);
      return;
    }

    setLoadingHiddenMatches(true);
    try {
      // 1) hidden_matches
      const { data: hiddenRows, error: hErr } = await supabase
        .from("hidden_matches")
        .select("match_id, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(200);

      if (hErr) {
        console.error("Settings hidden_matches error:", hErr);
        setHiddenMatches([]);
        return;
      }

      const ids = (hiddenRows || [])
        .map((r) => Number(r.match_id))
        .filter((n) => Number.isFinite(n));

      if (ids.length === 0) {
        setHiddenMatches([]);
        return;
      }

      // 2) matches
      const { data: matchesRows, error: mErr } = await supabase
        .from("matches")
        .select("id, user1_id, user2_id, created_at")
        .in("id", ids);

      if (mErr) {
        console.error("Settings matches fetch error:", mErr);
        setHiddenMatches([]);
        return;
      }

      const matchById = new Map((matchesRows || []).map((m) => [Number(m.id), m]));

      const otherUserIds = (matchesRows || [])
        .map((m) => (m.user1_id === user.id ? m.user2_id : m.user1_id))
        .filter(Boolean);

      const uniqOther = Array.from(new Set(otherUserIds));

      // 3) profiles des autres users (dernier profil)
      const byUser = new Map();
      if (uniqOther.length > 0) {
        const { data: profs, error: pErr } = await supabase
          .from("profiles")
          .select("user_id, name, city, sport, photo_urls, created_at")
          .in("user_id", uniqOther)
          .order("created_at", { ascending: false });

        if (pErr) {
          console.error("Settings profiles fetch error:", pErr);
        } else {
          for (const p of profs || []) {
            if (!byUser.has(p.user_id)) byUser.set(p.user_id, p); // trié desc => le plus récent
          }
        }
      }

      // 4) construire liste affichable (dans l’ordre de hidden_matches)
      const finalList = ids
        .map((mid) => {
          const m = matchById.get(mid);
          if (!m) return null;

          const otherId = m.user1_id === user.id ? m.user2_id : m.user1_id;
          const prof = otherId ? byUser.get(otherId) : null;

          return {
            match_id: mid,
            other_user_id: otherId || null,
            name: prof?.name || "Utilisateur",
            city: prof?.city || "",
            sport: prof?.sport || "",
            photo: prof?.photo_urls?.[0] || "/logo.png"
          };
        })
        .filter(Boolean);

      setHiddenMatches(finalList);
    } finally {
      setLoadingHiddenMatches(false);
      setHiddenMatchesLoaded(true);
    }
  };

  // ✅ Ouvrir/Fermer la section (lazy load au 1er "Voir")
  const toggleHiddenMatches = async () => {
    if (!user) return;

    setOpenHiddenMatches((v) => !v);

    // si on ouvre ET pas encore chargé => fetch
    if (!openHiddenMatches && !hiddenMatchesLoaded) {
      await fetchHiddenMatches();
    }
  };

  // reset si user change / logout
  useEffect(() => {
    setHiddenMatches([]);
    setHiddenMatchesLoaded(false);
    setOpenHiddenMatches(false);
  }, [user?.id]);

  // ✅ Ré-afficher un match = delete dans hidden_matches
  const unhideMatch = async (matchId) => {
    if (!user) return;

    const { error } = await supabase
      .from("hidden_matches")
      .delete()
      .eq("user_id", user.id)
      .eq("match_id", Number(matchId));

    if (error) {
      console.error("unhideMatch error:", error);
      return setBanner("Impossible de ré-afficher ce match (RLS ?).", true);
    }

    setBanner("Match ré-affiché ✅");
    fetchHiddenMatches();
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

            {/* ✅ Matchs masqués (repliable) */}
            <div className="card" style={{ padding: 14 }}>
              <h3 style={{ marginTop: 0 }}>Matchs masqués</h3>
              <p style={{ opacity: 0.85, marginTop: 6 }}>
                Les matchs que tu as masqués via la croix ✕ dans “Mes crush”.
              </p>

              <button
                className="btn-primary"
                onClick={toggleHiddenMatches}
                disabled={!user || loadingHiddenMatches}
              >
                {openHiddenMatches ? "Fermer" : "Voir"}
              </button>

              {openHiddenMatches && (
                <div style={{ marginTop: 12 }}>
                  {loadingHiddenMatches ? (
                    <small style={{ display: "block", opacity: 0.75 }}>Chargement…</small>
                  ) : hiddenMatches.length === 0 ? (
                    <div style={{ opacity: 0.8, fontSize: 14 }}>Aucun match masqué.</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {hiddenMatches.map((m) => (
                        <div
                          key={m.match_id}
                          className="card"
                          style={{
                            padding: 12,
                            borderRadius: 14,
                            display: "flex",
                            gap: 12,
                            alignItems: "center"
                          }}
                        >
                          <img
                            src={m.photo}
                            alt={m.name}
                            style={{ width: 46, height: 46, borderRadius: 12, objectFit: "cover" }}
                          />

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700 }}>{m.name}</div>
                            <div style={{ opacity: 0.8, fontSize: 14 }}>
                              {[m.city, m.sport].filter(Boolean).join(" • ")}
                            </div>
                          </div>

                          <button
                            className="btn-ghost btn-sm"
                            onClick={() => unhideMatch(m.match_id)}
                            disabled={loadingHiddenMatches}
                          >
                            Ré-afficher
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {user ? (
                    <div style={{ marginTop: 10, opacity: 0.75, fontSize: 13 }}>
                      Astuce : si tu masques un match, il disparaît de la liste “Mes crush”.
                    </div>
                  ) : null}
                </div>
              )}
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
