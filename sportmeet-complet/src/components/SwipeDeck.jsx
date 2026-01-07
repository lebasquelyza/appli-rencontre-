import React, { useEffect, useState } from "react";

export function SwipeDeck({
  profiles = [],
  onLikeProfile,
  isAuthenticated,
  onRequireAuth,
  previewMode = false
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [profiles]);

  const current = profiles[index] || null;

  if (!profiles.length) {
    return <p className="form-message">Aucun profil à afficher.</p>;
  }

  // ❌ message "connecte-toi" supprimé en preview
  if (!previewMode && !isAuthenticated) {
    return (
      <p className="form-message">
        Connecte-toi pour swiper et interagir avec les profils.
      </p>
    );
  }

  const handleLike = () => {
    if (!current) return;
    onLikeProfile?.(current);
    setIndex((i) => i + 1);
  };

  const handleSkip = () => {
    setIndex((i) => i + 1);
  };

  return (
    <div className={`swipeDeck ${previewMode ? "preview" : ""}`}>
      {!current ? (
        <p className="form-message">Plus de profils disponibles.</p>
      ) : (
        <div className="swipe-card">
          {/* Photo principale */}
          <div
            className="swipe-photo"
            style={{
              width: "100%",
              aspectRatio: "4 / 5",
              borderRadius: 18,
              overflow: "hidden",
              background: "rgba(255,255,255,0.06)"
            }}
          >
            {current.photo_urls?.[0] ? (
              <img
                src={current.photo_urls[0]}
                alt={current.name}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <div style={{ padding: 16, opacity: 0.8 }}>Pas de photo</div>
            )}
          </div>

          {/* Infos */}
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 22, fontWeight: 700 }}>
              {current.name}
              {current.age ? `, ${current.age}` : ""}
            </div>

            <div style={{ opacity: 0.85, marginTop: 4 }}>{current.city}</div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
              {current.sport && <span className="chip chip-soft">{current.sport}</span>}
              {current.level && <span className="chip chip-soft">{current.level}</span>}
            </div>

            {current.bio && (
              <p style={{ marginTop: 12, opacity: 0.9 }}>{current.bio}</p>
            )}
          </div>

          {/* ✅ ACTIONS : supprimées en preview */}
          {!previewMode && (
            <div
              className="swipe-actions"
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 16
              }}
            >
              <button
                type="button"
                className="btn-ghost"
                onClick={handleSkip}
                aria-label="Passer"
              >
                ❌
              </button>

              <button
                type="button"
                className="btn-primary"
                onClick={handleLike}
                aria-label="Aimer"
              >
                ❤️
              </button>

              <button
                type="button"
                className="btn-ghost"
                onClick={handleLike}
                aria-label="Super like"
              >
                ⭐
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
