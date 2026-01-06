import React from "react";

export function CrushesPage({ crushes = [], onBack }) {
  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0 }}>Mes crush</h2>
          <div style={{ opacity: 0.8, marginTop: 4 }}>Retrouve tes matchs et tes messages.</div>
        </div>

        <button type="button" className="btn-ghost btn-sm" onClick={onBack}>
          Retour
        </button>
      </div>

      {/* ✅ Première carte Premium */}
      <div
        className="card"
        style={{
          marginTop: 14,
          padding: 14,
          borderRadius: 14
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 700 }}>Passe à Premium ⭐</div>
            <div style={{ opacity: 0.85, marginTop: 4 }}>
              pour voir qui t’a like et débloquer plus de matchs.
            </div>
          </div>

          <button type="button" className="btn-primary btn-sm" onClick={() => alert("Premium bientôt 🙂")}>
            Passer Premium
          </button>
        </div>
      </div>

      {/* ✅ Ensuite : tous les messages */}
      <div style={{ marginTop: 14 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Messages</div>

        {crushes.length === 0 ? (
          <div className="card" style={{ padding: 14, borderRadius: 14, opacity: 0.85 }}>
            Aucun message pour le moment. Like des profils pour les retrouver ici.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {crushes.map((c) => (
              <div
                key={c.id}
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
                  src={c.photo || "/logo.png"}
                  alt={c.name}
                  style={{
                    width: 54,
                    height: 54,
                    borderRadius: 12,
                    objectFit: "cover"
                  }}
                />

                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>{c.name}</div>
                  <div style={{ opacity: 0.8, marginTop: 2, fontSize: 14 }}>
                    Aucun message pour le moment.
                  </div>
                </div>

                <button
                  type="button"
                  className="btn-ghost btn-sm"
                  onClick={() => alert("Messagerie bientôt 🙂")}
                >
                  Ouvrir
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
