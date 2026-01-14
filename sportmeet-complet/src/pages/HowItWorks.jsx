// sportmeet-complet/src/pages/HowItWorks.jsx
import React from "react";

export default function HowItWorks() {
  const steps = [
    {
      title: "1) Crée ton profil",
      text: "Ajoute ta photo, ton sport, ton niveau et tes dispos. Plus c’est précis, plus tes matchs seront pertinents.",
      icon: "🧍‍♂️"
    },
    {
      title: "2) Swipe pour matcher",
      text: "Swipe à droite pour dire OUI ❤️, à gauche pour passer ✕. Swipe vers le haut pour SUPERLIKE ★.",
      icon: "🃏"
    },
    {
      title: "3) Superlike (limité)",
      text: "Tu as jusqu’à 5 superlikes par jour ⭐. Utilise-les pour les profils qui te motivent vraiment !",
      icon: "⭐"
    },
    {
      title: "4) Discute et organise une séance",
      text: "Une fois matchés, discutez, fixez un créneau et entraînez-vous ensemble (salle, extérieur, etc.).",
      icon: "💬"
    },
    {
      title: "5) Signale si besoin",
      text: "Un comportement inadapté ? Tu peux signaler un profil en un clic.",
      icon: "🛡️"
    },
    {
      title: "6) Plus de matchs ? Invite tes potes",
      text: "Plus la communauté grandit, plus tu trouves de partenaires près de toi. Partage MatchFit 💪",
      icon: "📣"
    }
  ];

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

  return (
    <div style={{ maxWidth: 920, margin: "0 auto", padding: "26px 14px 60px" }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 18 }}>
        <div style={{ display: "inline-flex", gap: 10, justifyContent: "center", marginBottom: 10 }}>
          <span style={pillStyle}>💪 MatchFit</span>
          <span style={pillStyle}>🃏 Swipe & Match</span>
          <span style={pillStyle}>⭐ 5 superlikes/jour</span>
        </div>

        <h1 style={{ margin: "10px 0 8px", fontSize: 34, letterSpacing: -0.5 }}>
          Comment fonctionne MatchFit ?
        </h1>
        <p style={{ margin: 0, opacity: 0.9, lineHeight: 1.5, fontSize: 16 }}>
          Trouve un partenaire d’entraînement près de toi, match en quelques swipes, et organise une séance facilement.
        </p>
      </div>

      {/* Mini guide swipe */}
      <div style={{ ...cardStyle, marginBottom: 14 }}>
        <h2 style={{ margin: "0 0 10px", fontSize: 18 }}>Le swipe en 10 secondes</h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 12 }}>
          <div style={cardStyle}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>❤️</div>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Swipe à droite = OUI</div>
            <div style={{ opacity: 0.9, lineHeight: 1.45 }}>
              Tu aimes le profil et tu veux potentiellement t’entraîner avec cette personne.
            </div>
          </div>

          <div style={cardStyle}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>✕</div>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Swipe à gauche = NON</div>
            <div style={{ opacity: 0.9, lineHeight: 1.45 }}>
              Tu passes au profil suivant. Aucun souci, ça ne notifie pas l’autre personne.
            </div>
          </div>

          <div style={cardStyle}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>★</div>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Swipe en haut = SUPERLIKE</div>
            <div style={{ opacity: 0.9, lineHeight: 1.45 }}>
              Tu montres un intérêt fort. <strong>Limite : 5/jour</strong> ⭐
            </div>
          </div>
        </div>
      </div>

      {/* Steps */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
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
              <div style={{ fontWeight: 900 }}>{s.title}</div>
            </div>

            <p style={{ margin: "10px 0 0", opacity: 0.92, lineHeight: 1.55 }}>{s.text}</p>
          </div>
        ))}
      </div>

      {/* FAQ */}
      <div style={{ ...cardStyle, marginTop: 14 }}>
        <h2 style={{ margin: "0 0 10px", fontSize: 18 }}>FAQ rapide</h2>

        <div style={{ display: "grid", gap: 10 }}>
          <div>
            <div style={{ fontWeight: 900, marginBottom: 4 }}>Pourquoi je vois un message “Crée ton profil” ?</div>
            <div style={{ opacity: 0.9, lineHeight: 1.5 }}>
              Pour liker et matcher, MatchFit te demande d’avoir un profil complet. C’est ce qui rend les matchs utiles.
            </div>
          </div>

          <div>
            <div style={{ fontWeight: 900, marginBottom: 4 }}>Que se passe-t-il si je n’ai plus de profils ?</div>
            <div style={{ opacity: 0.9, lineHeight: 1.5 }}>
              Ça arrive quand il n’y a plus de profils dans ta sélection (filtres, zone, etc.). Partager MatchFit aide
              beaucoup à élargir la communauté 💪
            </div>
          </div>

          <div>
            <div style={{ fontWeight: 900, marginBottom: 4 }}>Les superlikes se réinitialisent quand ?</div>
            <div style={{ opacity: 0.9, lineHeight: 1.5 }}>
              Tous les jours (limite : 5/jour). Si tu atteins la limite, tu peux toujours liker normalement ❤️
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
