import React from "react";
import { useNavigate } from "react-router-dom";

export function AccountReview({ onLogout }) {
  const navigate = useNavigate();

  return (
    <main className="page">
      <div className="shell" style={{ maxWidth: 720, margin: "0 auto" }}>
        <section className="card" style={{ padding: 16 }}>
          <h2 style={{ marginTop: 0 }}>Compte en cours de vérification</h2>

          <p style={{ lineHeight: 1.5 }}>
            Tu ne peux plus créer ou modifier ton profil pour le moment.
            <br />
            Notre équipe examine les signalements reçus te concernant.
          </p>

          <p style={{ lineHeight: 1.5, opacity: 0.9 }}>
            Tu recevras un email une fois la vérification terminée.
          </p>

          <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
            <button className="btn-primary" onClick={() => navigate("/")}>
              Retour à l’accueil
            </button>

            <button className="btn-ghost" onClick={onLogout}>
              Se déconnecter
            </button>
          </div>

          <p style={{ marginTop: 14, fontSize: 13, opacity: 0.75 }}>
            Si tu penses qu’il s’agit d’une erreur, contacte le support.
          </p>
        </section>
      </div>
    </main>
  );
}
