import React, { useEffect, useState } from "react";
import { SwipeCard } from "./SwipeCard";

export function SwipeDeck({ profiles, onLikeProfile }) {
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setIndex(0);
  }, [profiles]);

  const hasProfile = index < profiles.length;
  const currentProfile = hasProfile ? profiles[index] : null;
  const remaining = hasProfile ? profiles.length - index - 1 : 0;

  const next = () => setIndex((i) => i + 1);

  const handleLike = async () => {
    if (!currentProfile || busy) return;
    setBusy(true);
    try {
      await onLikeProfile?.(currentProfile);
      next();
    } finally {
      setBusy(false);
    }
  };

  const handleSkip = () => {
    if (busy) return;
    next();
  };

  const handleReset = () => setIndex(0);

  return (
    <div className="swipe-container" data-swipe-deck>
      {currentProfile ? (
        <>
          <SwipeCard key={currentProfile.id} profile={currentProfile} />

          <div className="actions">
            <button
              type="button"
              className="swBtn swBtnBad"
              onClick={handleSkip}
              disabled={busy}
              aria-label="Passer"
              title="Passer"
            >
              ✕
            </button>

            <button
              type="button"
              className="swBtn swBtnPrimary"
              onClick={handleLike}
              disabled={busy}
              aria-label="Liker"
              title="Liker"
            >
              ❤
            </button>

            <button
              type="button"
              className="swBtn swBtnGood"
              onClick={handleLike}
              disabled={busy}
              aria-label="Super like (like)"
              title="Super like (like)"
            >
              ★
            </button>
          </div>

          <div className="hint">
            {remaining > 0 ? `${remaining} profil(s) à venir` : "Dernier profil"}
          </div>
        </>
      ) : (
        <div className="swipe-empty">
          <p>Aucun autre profil dans cette sélection.</p>
          <button type="button" className="btn-ghost" onClick={handleReset}>
            Revoir depuis le début
          </button>
        </div>
      )}
    </div>
  );
}
