// sportmeet-complet/src/components/CrushesPage.jsx
import React from "react";
import { useNavigate } from "react-router-dom";

export function CrushesPage({ crushes = [], superlikers = [], myPhotoUrl = "", onBack }) {
  const navigate = useNavigate();

  // ✅ Démo Paul si aucun crush (preview UI)
  const demoCrush = {
    id: "__demo_paul",
    name: "Paul",
    photo: "", // on force fallback sur photo client
    message: "Salut 👋 Ça te dit une séance cette semaine ? 💪",
    match_id: "demo" // ✅ chat démo
  };

  const list = crushes.length === 0 ? [demoCrush] : crushes;

  const getAvatar = (c) => c?.photo || myPhotoUrl || "/logo.png";

  const openChat = (c) => {
    const matchId = c?.match_id || (c?.id === "__demo_paul" ? "demo" : "demo");

    navigate(`/chat/${matchId}`, {
      state: {
        crush: {
          id: c.id,
          name: c.name,
          photo: getAvatar(c),
          message: c.message || "Salut 👋",
          match_id: c.match_id || null
        },
        myPhotoUrl
      }
    });
  };

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

      {/* ✅ Premium superlikes */}
      <div className="card" style={{ marginTop: 14, padding: 14, borderRadius: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700 }}>Passe à Premium ⭐</div>
            <div style={{ opacity: 0.85, marginTop: 4 }}>
              pour voir qui t’a <strong>superlike</strong> et débloquer plus de superlikes.
            </div>

            <div style={{ marginTop: 10 }}>
              {superlikers.length === 0 ? (
                <div style={{ opacity: 0.8, fontSize: 14 }}>Aucun superlike pour le moment.</div>
              ) : (
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {superlikers.slice(0, 8).map((p) => (
                    <div
                      key={p.user_id || p.id}
                      style={{ display: "flex", gap: 8, alignItems: "center" }}
                      title={`${p.name} t’a superlike ⭐`}
                    >
                      <img
                        src={p.photo || myPhotoUrl || "/logo.png"}
                        alt={p.name}
                        style={{ width: 34, height: 34, borderRadius: 10, objectFit: "cover" }}
                      />
                      <div style={{ fontSize: 14, fontWeight: 700, display: "flex", gap: 6, alignItems: "center" }}>
                        <span>{p.name}</span>
                        <span style={{ opacity: 0.85 }}>⭐</span>
                      </div>
                    </div>
                  ))}
                  {superlikers.length > 8 ? (
                    <div style={{ fontSize: 14, opacity: 0.85, alignSelf: "center" }}>
                      +{superlikers.length - 8}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>

          <button type="button" className="btn-primary btn-sm" onClick={() => alert("Premium bientôt 🙂")}>
            Passer Premium
          </button>
        </div>
      </div>

      {/* ✅ Messages */}
      <div style={{ marginTop: 14 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Messages</div>

        {crushes.length === 0 ? (
          <div style={{ opacity: 0.75, fontSize: 13, marginBottom: 8 }}>Aperçu (message de démo)</div>
        ) : null}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {list.map((c) => {
            const preview = c.lastMessage?.trim?.() || c.message?.trim?.() || "Engage la conversation ;)";
            return (
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
                  src={getAvatar(c)}
                  alt={c.name}
                  style={{ width: 54, height: 54, borderRadius: 12, objectFit: "cover" }}
                />

                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>{c.name}</div>
                  <div style={{ opacity: 0.8, marginTop: 2, fontSize: 14 }}>{preview}</div>
                </div>

                <button type="button" className="btn-ghost btn-sm" onClick={() => openChat(c)}>
                  Ouvrir
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
