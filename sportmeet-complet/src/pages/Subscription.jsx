// sportmeet-complet/src/pages/Subscription.jsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

export function Subscription({ user, premiumLikes = [] }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);

  const items = useMemo(() => (Array.isArray(premiumLikes) ? premiumLikes : []), [premiumLikes]);

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

          {/* ✅ Accordéon: même design que Premium */}
          <div className="card" style={{ padding: 14, marginTop: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <h3 style={{ marginTop: 0, marginBottom: 0 }}>Mes likes (sans match)</h3>

              <button
                type="button"
                className="btn-ghost btn-sm"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                title={open ? "Réduire" : "Ouvrir"}
              >
                {open ? "Masquer" : "Afficher"} ({items.length})
              </button>
            </div>

            {open ? (
              <div style={{ marginTop: 12 }}>
                {items.length === 0 ? (
                  <p className="form-message" style={{ margin: 0 }}>
                    Aucun like en attente.
                  </p>
                ) : (
                  <div style={{ display: "grid", gap: 10 }}>
                    {items.map((p) => {
                      const url = Array.isArray(p.photo_urls) ? p.photo_urls[0] : "";
                      return (
                        <div
                          key={p.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            padding: 10,
                            borderRadius: 14,
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.08)"
                          }}
                        >
                          {url ? (
                            <img
                              src={url}
                              alt={p.name || "Profil"}
                              style={{
                                width: 44,
                                height: 44,
                                borderRadius: 999,
                                objectFit: "cover",
                                flex: "0 0 auto"
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: 44,
                                height: 44,
                                borderRadius: 999,
                                display: "grid",
                                placeItems: "center",
                                background: "rgba(255,255,255,0.08)",
                                border: "1px solid rgba(255,255,255,0.10)",
                                fontWeight: 700
                              }}
                            >
                              {(p.name || "?").slice(0, 1).toUpperCase()}
                            </div>
                          )}

                          <div
                            style={{
                              minWidth: 0,
                              fontWeight: 700,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis"
                            }}
                          >
                            {p.name || "Profil"}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : null}
          </div>

          <div className="card" style={{ padding: 14, marginTop: 14 }}>
            <h3 style={{ marginTop: 0 }}>Premium ⭐</h3>
            <p style={{ opacity: 0.85, marginTop: 6, lineHeight: 1.45 }}>
              Bientôt disponible 🙂
              <br />• Voir qui t’a superlike
              <br />• Plus de superlikes
              <br />• Options Premium
            </p>

            <button type="button" className="btn-primary" disabled>
              Activer Premium
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
