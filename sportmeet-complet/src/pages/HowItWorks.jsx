// sportmeet-complet/src/pages/HowItWorks.jsx
import React from "react";
import { useNavigate } from "react-router-dom";

export function HowItWorks() {
  const navigate = useNavigate();

  const cardStyle = {
    background: "rgba(255,255,255,.06)",
    border: "1px solid rgba(255,255,255,.10)",
    borderRadius: 18,
    padding: 16,
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    boxShadow: "0 14px 30px rgba(0,0,0,.18)"
  };

  const pillStyle = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 12px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,.12)",
    background: "rgba(0,0,0,.28)"
  };

  const steps = [
    {
      icon: "🧍‍♂️",
      title: "Crée ton profil",
      text: "Ajoute ton sport, ton niveau, ta ville et tes dispos. Plus c’est clair, plus les matchs sont pertinents."
    },
    {
      icon: "🃏",
      title: "Swipe pour choisir",
      text: "Droite = OUI ❤️, gauche = NON ✕. Tu peux aussi utiliser les boutons en bas."
    },
    {
      icon: "⭐",
      title: "Superlike (5/semaine)",
      text: "Swipe vers le haut pour SUPERLIKE ★. Limite : 5 superlikes par semaine. Garde-les pour les profils qui te motivent vraiment."
    },
    {
      icon: "💬",
      title: "Match & discussion",
      text: "Si c’est réciproque : match 🎉. Vous pouvez ensuite discuter et organiser une séance."
    },
    {
      icon: "🛡️",
      title: "Signalement",
      text: "Si un profil dépasse les limites, tu peux le signaler. La sécurité avant tout."
    },
    {
      icon: "📣",
      title: "Partage MatchFit",
      text: "Plus il y a de monde, plus tu trouves facilement un partenaire proche de toi. Invite tes potes 💪"
    }
  ];

  return (
    <main className="page">
      <div className="shell" style={{ maxWidth: 920 }}>
        <section className="card" style={{ padding: 12, maxWidth: 920, margin: "8px auto 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <button type="button" className="btn-ghost btn-sm" onClick={() => navigate(-1)}>
              ← Retour
            </button>
            <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={pillStyle}>💪 MatchFit</span>
              <span style={pillStyle}>🃏 Swipe & Match</span>
              <span style={pillStyle}>⭐ 5 superlikes/semaine</span>
            </div>
          </div>

          <h1 style={{ margin: "6px 0 8px", fontSize: 32, letterSpacing: -0.4 }}>
            Comment fonctionne MatchFit ?
          </h1>
          <p style={{ margin: "0 0 12px", opacity: 0.9, lineHeight: 1.5 }}>
            MatchFit t’aide à trouver un partenaire d’entraînement près de toi : tu swipes, tu matches, et vous
            organisez une séance simplement.
          </p>

          {/* Mini guide swipe */}
          <div style={{ ...cardStyle, marginBottom: 12 }}>
            <div style={{ fontWeight: 900, marginBottom: 10 }}>Le swipe en 10 secondes</div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 10 }}>
              <div style={cardStyle}>
                <div style={{ fontSize: 24, marginBottom: 6 }}>❤️</div>
                <div style={{ fontWeight: 900, marginBottom: 6 }}>Droite = OUI</div>
                <div style={{ opacity: 0.9, lineHeight: 1.45 }}>
                  Tu aimes le profil et tu veux potentiellement t’entraîner avec cette personne.
                </div>
              </div>

              <div style={cardStyle}>
                <div style={{ fontSize: 24, marginBottom: 6 }}>✕</div>
                <div style={{ fontWeight: 900, marginBottom: 6 }}>Gauche = NON</div>
                <div style={{ opacity: 0.9, lineHeight: 1.45 }}>
                  Tu passes au profil suivant. Personne n’est notifié.
                </div>
              </div>

              <div style={cardStyle}>
                <div style={{ fontSize: 24, marginBottom: 6 }}>★</div>
                <div style={{ fontWeight: 900, marginBottom: 6 }}>Haut = SUPERLIKE</div>
                <div style={{ opacity: 0.9, lineHeight: 1.45 }}>
                  Tu montres un intérêt fort. <strong>Limite : 5/semaine</strong>.
                </div>
              </div>
            </div>
          </div>

          {/* Étapes */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>
            {steps.map((s) => (
              <div key={s.title} style={cardStyle}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      display: "grid",
                      placeItems: "center",
                      background: "rgba(0,0,0,.25)",
                      border: "1px solid rgba(255,255,255,.10)",
                      fontSize: 22
                    }}
                  >
                    {s.icon}
                  </div>
                  <div style={{ fontWeight: 1000 }}>{s.title}</div>
                </div>
                <p style={{ margin: "10px 0 0", opacity: 0.92, lineHeight: 1.55 }}>{s.text}</p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div style={{ ...cardStyle, marginTop: 12, display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ lineHeight: 1.4 }}>
              <div style={{ fontWeight: 1000, marginBottom: 4 }}>Prêt à matcher ?</div>
              <div style={{ opacity: 0.9 }}>Retourne swiper et trouve ton/ta partenaire 💪</div>
            </div>
            <button
              type="button"
              className="btn-primary"
              onClick={() => navigate("/")}
              style={{ marginLeft: "auto" }}
            >
              Commencer
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
