// sportmeet-complet/src/pages/Subscription.jsx
import React from "react";
import { useNavigate } from "react-router-dom";

export function Subscription({ user }) {
  const navigate = useNavigate();

  return (
    <main className="page">
      <div className="shell">
        <section className="card" style={{ padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button className="btn-ghost" onClick={() => navigate(-1)}>
              ← Retour
            </button>
            <h1 style={{ margin: 0 }}>Abonnement</h1>
          </div>

          {!user ? (
            <p className="form-message" style={{ marginTop: 12 }}>
              Connecte-toi pour gérer ton abonnement.
            </p>
          ) : null}

          <div className="card" style={{ padding: 14, marginTop: 14 }}>
            <h3 style={{ marginTop: 0 }}>Premium ⭐</h3>
            <p style={{ opacity: 0.85, marginTop: 6, lineHeight: 1.45 }}>
              Bientôt disponible 🙂
              <br />
              Ici tu pourras :
              <br />• Voir qui t’a superlike
              <br />• Obtenir plus de superlikes
              <br />• Accéder à des options Premium
            </p>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
              <button
                type="button"
                className="btn-primary"
                disabled
                title="Bientôt disponible"
              >
                Activer Premium
              </button>

              <button type="button" className="btn-ghost" onClick={() => navigate("/crushes")}>
                Voir mes messages
              </button>
            </div>

            <small style={{ display: "block", marginTop: 10, opacity: 0.75 }}>
              (Tu pourras remplacer cette page par Stripe / paiement plus tard.)
            </small>
          </div>
        </section>
      </div>
    </main>
  );
}
