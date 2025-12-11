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

  const handleSkip = () => {
    next();
  };

  const handleReset = () => {
    setIndex(0);
  };

  return (
    <div className="swipe-container">
      {currentProfile ? (
        <>
          <SwipeCard profile={currentProfile} />
          <div className="swipe-actions">
            <button
              type="button"
              className="btn-swipe btn-swipe-nope"
              onClick={handleSkip}
            >
              ✕
            </button>
            <button
              type="button"
              className="btn-swipe btn-swipe-like"
              onClick={handleLike}
            >
              ❤️
            </button>
          </div>
          <div className="swipe-meta">
            <span>{remaining > 0 ? `${remaining} profil(s) à venir` : "Dernier profil"}</span>
          </div>
        </>
      ) : (
        <div className="swipe-empty">
          <p>Aucun autre profil dans cette sélection.</p>
          <button type="button" className="btn-secondary" onClick={handleReset}>
            Revoir depuis le début
          </button>
        </div>
      )}
    </div>
  );
}
