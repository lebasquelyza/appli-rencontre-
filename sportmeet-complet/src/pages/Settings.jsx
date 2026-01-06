// sportmeet-complet/src/pages/Settings.jsx
import React from "react";
import { useNavigate } from "react-router-dom";

export function Settings({ user, onOpenProfile }) {
  const navigate = useNavigate();

  return (
    <main className="page">
      <div className="shell">
        <section className="card" style={{ padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button className="btn-ghost" onClick={() => navigate(-1)}>
              ← Retour
            </button>
            <h1 style={{ margin: 0 }}>Réglages</h1>
          </div>

          {!user && (
            <p className="form-message" style={{ marginTop: 12 }}>
              Connecte-toi pour accéder à la configuration du compte.
            </p>
          )}

          <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
            {/* Bloc Configuration */}
            <div className="card" style={{ padding: 14 }}>
              <h3 style={{ marginTop: 0 }}>Configuration</h3>
              <p style={{ opacity: 0.85, marginTop: 6 }}>
                Modifier ton profil, tes infos et tes préférences.
              </p>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                <button
                  className="btn-primary"
                  onClick={() => onOpenProfile?.()}
                  disabled={!user}
                  title={!user ? "Connecte-toi pour modifier ton profil" : ""}
                >
                  Modifier mon profil
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
