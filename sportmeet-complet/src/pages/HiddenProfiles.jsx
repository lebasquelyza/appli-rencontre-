// sportmeet-complet/src/pages/HiddenProfiles.jsx
import React from "react";
import { useNavigate } from "react-router-dom";

export function HiddenProfiles({ user, hiddenProfiles = [], onUnhideOne, onClearAll }) {
  const navigate = useNavigate();

  return (
    <main className="page">
      <div className="shell" style={{ maxWidth: 920 }}>
        <section className="card" style={{ padding: 12, maxWidth: 920, margin: "8px auto 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <button type="button" className="btn-ghost btn-sm" onClick={() => navigate(-1)}>
              ← Retour
            </button>
            <div style={{ fontWeight: 900 }}>Profils masqués</div>

            <button
              type="button"
              className="btn-ghost btn-sm"
              style={{ marginLeft: "auto" }}
              onClick={() => {
                const ok = window.confirm("Réafficher tous les profils masqués ?");
                if (!ok) return;
                onClearAll?.();
              }}
              disabled={!onClearAll || hiddenProfiles.length === 0}
            >
              Réinitialiser
            </button>
          </div>

          {!user ? (
            <p style={{ opacity: 0.9, margin: 0 }}>Connecte-toi pour voir tes profils masqués.</p>
          ) : hiddenProfiles.length === 0 ? (
            <p style={{ opacity: 0.9, margin: 0 }}>Tu n’as aucun profil masqué pour le moment.</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>
              {hiddenProfiles.map((p) => (
                <div
                  key={p?.id}
                  className="card"
                  style={{
                    padding: 12,
                    borderRadius: 16,
                    border: "1px solid rgba(255,255,255,.10)",
                    background: "rgba(255,255,255,.06)"
                  }}
                >
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <div
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 14,
                        overflow: "hidden",
                        background: "rgba(0,0,0,.25)",
                        border: "1px solid rgba(255,255,255,.10)",
                        display: "grid",
                        placeItems: "center",
                        flex: "0 0 auto"
                      }}
                    >
                      {p?.photo_url ? (
                        <img
                          src={p.photo_url}
                          alt=""
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <span style={{ fontWeight: 900, fontSize: 18 }}>{(p?.name || "M")[0]}</span>
                      )}
                    </div>

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 1000, lineHeight: 1.1 }}>
                        {p?.name || "Profil"}
                        {p?.age ? `, ${p.age}` : ""}
                      </div>
                      <div
                        style={{
                          opacity: 0.9,
                          fontSize: 13,
                          marginTop: 4,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis"
                        }}
                      >
                        {[p?.sport, p?.level, p?.city].filter(Boolean).join(" • ")}
                      </div>
                      {p?.reason ? (
                        <div style={{ opacity: 0.85, fontSize: 12, marginTop: 6 }}>
                          Raison : <strong>{p.reason}</strong>
                        </div>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      className="btn-primary btn-sm"
                      onClick={() => onUnhideOne?.(p.id)}
                      disabled={!onUnhideOne}
                      style={{ flex: "0 0 auto" }}
                    >
                      Réafficher
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
