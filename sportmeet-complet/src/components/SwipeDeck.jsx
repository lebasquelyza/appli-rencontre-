import React, { useEffect, useState } from "react";
import { SwipeCard } from "./SwipeCard";

export function SwipeDeck({ profiles, onLikeProfile }) {
  const [index, setIndex] = useState(0);

  // Si la liste change (filtres, nouveau profil…), on repart du début
  useEffect(() => {
    setIndex(0);
  }, [profiles]);

  const hasProfile = index < profiles.length;
  const currentProfile = hasProfile ? profiles[index] : null;
  const remaining = hasProfile ? profiles.length - index - 1 : 0;

  const next = () => setIndex((i) => i + 1);

  const handleLike = () => {
    if (!currentProfile) return;
    onLikeProfile(currentProfile);
    next();
  };

  const handleSkip = () => next();
  const handleReset = () => setIndex(0);

  return (
    <div className="swipe-container" data-swipe-deck>
      {currentProfile ? (
        <>
          <SwipeCard profile={currentProfile} />

          <div className="actions">
            <button
              type="button"
              className="swBtn swBtnBad"
              onClick={handleSkip}
              aria-label="Passer"
              title="Passer"
            >
              ✕
            </button>

            <button
              type="button"
              className="swBtn swBtnPrimary"
              onClick={handleLike}
              aria-label="Liker"
              title="Liker"
            >
              ❤
            </button>

            <button
              type="button"
              className="swBtn swBtnGood"
              onClick={handleLike}
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
