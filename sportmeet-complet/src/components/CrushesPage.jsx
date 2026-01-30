// sportmeet-complet/src/components/CrushesPage.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export function CrushesPage({
  crushes = [],
  superlikers = [],
  myPhotoUrl = "",
  onBack,
  onHideMatch
}) {
  const navigate = useNavigate();

  // ✅ aperçu profil (au clic sur la photo)
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewCrush, setPreviewCrush] = useState(null);

  const openPreview = (c) => {
    setPreviewCrush(c || null);
    setPreviewOpen(true);
  };

  const closePreview = () => {
    setPreviewOpen(false);
    setPreviewCrush(null);
  };

  // ✅ Démo Paul si aucun crush (preview UI)
  const demoCrush = {
    id: "__demo_paul",
    name: "Paul",
    photo_urls: [],
    message: "Salut 👋 Ça te dit une séance cette semaine ? 💪",
    match_id: "demo"
  };

  const list = crushes.length === 0 ? [demoCrush] : crushes;

  // ✅ avatar du crush = photo du crush, jamais myPhotoUrl
  const getAvatar = (c) => c?.photo_urls?.[0] || c?.photo || "/logo.png";

  const openChat = (c) => {
    const matchId = c?.id === "__demo_paul" ? "demo" : c?.match_id;

    if (!matchId) {
      alert("Chat indisponible : match_id manquant.");
      return;
    }

    navigate(`/chat/${matchId}`, {
      state: {
        crush: {
          id: c.id,
          name: c.name,
          city: c.city,
          sport: c.sport,
          photo_urls: c.photo_urls || [],
          message: c.message || c.last_message_body || "Salut 👋",
          match_id: matchId
        },
        myPhotoUrl
      }
    });
  };

  const hide = (c) => {
    if (!onHideMatch) return;

    const ok = window.confirm(
      "Masquer ce match ?\n\n- Il disparaîtra de ta liste.\n- Tu pourras le ré-afficher plus tard."
    );
    if (!ok) return;

    onHideMatch(c);
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

      

      {/* ✅ Messages */}
      <div style={{ marginTop: 14 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Messages</div>

        {crushes.length === 0 ? (
          <div style={{ opacity: 0.75, fontSize: 13, marginBottom: 8 }}>Aperçu (message de démo)</div>
        ) : null}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {list.map((c) => {
            const preview =
              c.last_message_body?.trim?.() ||
              c.lastMessage?.trim?.() ||
              c.message?.trim?.() ||
              "Engage la conversation 👋";

            const isDemo = c.id === "__demo_paul";

            return (
              <div
                key={c.match_id || c.id}
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
                  onClick={() => openPreview(c)}
                  title="Voir le profil"
                  style={{
                    width: 54,
                    height: 54,
                    borderRadius: 12,
                    objectFit: "cover",
                    cursor: "pointer"
                  }}
                />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700 }}>{c.name}</div>
                  <div
                    style={{
                      opacity: 0.8,
                      marginTop: 2,
                      fontSize: 14,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis"
                    }}
                  >
                    {preview}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button type="button" className="btn-ghost btn-sm" onClick={() => openChat(c)}>
                    Ouvrir
                  </button>

                  {!isDemo ? (
                    <button
                      type="button"
                      className="btn-ghost btn-sm"
                      title="Masquer ce match"
                      onClick={() => hide(c)}
                      aria-label="Masquer ce match"
                    >
                      ✕
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {/* ✅ Aperçu profil (modal) */}
      {previewOpen && previewCrush ? (
        <div
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closePreview();
          }}
          onTouchStart={(e) => {
            if (e.target === e.currentTarget) closePreview();
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,.55)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            display: "grid",
            placeItems: "center",
            padding: 14
          }}
        >
          <div
            className="card"
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            style={{
              width: "min(520px, 92vw)",
              maxHeight: "calc(var(--appH, 100vh) - 40px)",
              overflow: "auto",
              borderRadius: 18,
              padding: 14
            }}
          >
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <img
                src={getAvatar(previewCrush)}
                alt={previewCrush?.name || "Profil"}
                style={{ width: 72, height: 72, borderRadius: 16, objectFit: "cover" }}
              />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 18, lineHeight: 1.1 }}>
                  {previewCrush?.name || "Profil"}
                </div>
                <div style={{ opacity: 0.85, marginTop: 4, fontSize: 14 }}>
                  {[previewCrush?.city, previewCrush?.sport].filter(Boolean).join(" • ")}
                </div>
              </div>

              <button type="button" className="btn-ghost btn-sm" style={{ marginLeft: "auto" }} onClick={closePreview}>
                Fermer
              </button>
            </div>

            {/* ✅ Photos si dispo */}
            {Array.isArray(previewCrush?.photo_urls) && previewCrush.photo_urls.length > 1 ? (
              <div style={{ display: "flex", gap: 10, overflowX: "auto", marginTop: 12, paddingBottom: 4 }}>
                {previewCrush.photo_urls.slice(0, 8).map((u, i) => (
                  <img
                    key={u || i}
                    src={u}
                    alt=""
                    style={{ width: 110, height: 140, borderRadius: 14, objectFit: "cover", flex: "0 0 auto" }}
                  />
                ))}
              </div>
            ) : null}

            <div style={{ display: "flex", gap: 10, marginTop: 14, justifyContent: "flex-end" }}>
              <button type="button" className="btn-ghost" onClick={() => openChat(previewCrush)}>
                Ouvrir le chat
              </button>
            </div>
          </div>
        </div>
      ) : null}

    </div>
  );
}
