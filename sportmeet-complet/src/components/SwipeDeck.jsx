// sportmeet-complet/src/components/SwipeDeck.jsx
import React, { useEffect, useMemo, useState } from "react";
import { SwipeCard } from "./SwipeCard";

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function SwipeDeck({ profiles, onLikeProfile, isAuthenticated, onRequireAuth }) {
  // ✅ On garde un "ordre" interne qu'on peut reshuffle pour faire tourner en boucle
  const baseProfiles = useMemo(() => (Array.isArray(profiles) ? profiles : []), [profiles]);

  const [deck, setDeck] = useState([]);
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);

  // ✅ quand la liste change: on re-shuffle et on repart au début
  useEffect(() => {
    setDeck(shuffleArray(baseProfiles));
    setIndex(0);
  }, [baseProfiles]);

  const hasProfile = index < deck.length;
  const currentProfile = hasProfile ? deck[index] : null;
  const remaining = hasProfile ? deck.length - index - 1 : 0;

  const next = () => setIndex((i) => i + 1);

  const handleLike = async () => {
    if (!isAuthenticated) {
      onRequireAuth?.();
      return;
    }
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
    if (!isAuthenticated) {
      onRequireAuth?.();
      return;
    }
    if (busy) return;
    next();
  };

  const handleReset = () => {
    // ✅ “infini”: on re-mélange et on recommence
    setDeck(shuffleArray(baseProfiles));
    setIndex(0);
  };

  // ✅ Partage MatchFit
  const shareText =
    "Je suis sur MatchFit 💪 Viens tester ! On sait jamais, ton/ta gymcrush en entendra parler 😉";
  const shareUrl =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "https://matchfit.app"; // fallback (si jamais)

  const handleShare = async () => {
    const payload = { title: "MatchFit", text: shareText, url: shareUrl };

    try {
      if (navigator.share) {
        await navigator.share(payload);
        return;
      }
    } catch (e) {
      // si l'utilisateur annule, on ne fait rien
      return;
    }

    // fallback: copie dans le presse-papier
    try {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      alert("Lien copié ✅");
    } catch {
      // fallback ultime
      window.prompt("Copie ce message :", `${shareText}\n${shareUrl}`);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      alert("Lien copié ✅");
    } catch {
      window.prompt("Copie ce lien :", shareUrl);
    }
  };

  // ✅ Cas: aucune sélection (0 profil)
  const hasAny = deck.length > 0;

  return (
    <div className="swipe-container" data-swipe-deck>
      {currentProfile ? (
        <>
          <SwipeCard key={currentProfile.id} profile={currentProfile} />

          {!isAuthenticated ? (
            <div className="actions" style={{ flexDirection: "column", gap: 10 }}>
              <p className="form-message" style={{ margin: 0 }}>
                Connecte-toi pour liker ou passer des profils.
              </p>
              <button type="button" className="btn-primary btn-sm" onClick={() => onRequireAuth?.()}>
                Se connecter
              </button>
            </div>
          ) : (
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
          )}

          <div className="hint">{remaining > 0 ? `${remaining} profil(s) à venir` : "Dernier profil"}</div>
        </>
      ) : (
        // ✅ Fin de deck: on propose le partage + relance (infini)
        <div className="swipe-empty" style={{ textAlign: "center" }}>
          {hasAny ? (
            <>
              <p style={{ marginBottom: 6, fontWeight: 700 }}>Plus personne à te montrer 😅</p>
              <p style={{ marginTop: 0, opacity: 0.9, lineHeight: 1.35 }}>
                Partage <strong>MatchFit</strong> à tes potes… en espérant que ton/ta{" "}
                <strong>gymcrush</strong> en entende parler 👀
              </p>

              <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                <button type="button" className="btn-primary" onClick={handleShare}>
                  Partager
                </button>
                <button type="button" className="btn-ghost" onClick={handleCopy}>
                  Copier le lien
                </button>
              </div>

              <div style={{ marginTop: 12 }}>
                <button type="button" className="btn-ghost" onClick={handleReset}>
                  Revoir des profils
                </button>
              </div>
            </>
          ) : (
            <>
              <p style={{ marginBottom: 6, fontWeight: 700 }}>
                Aucun profil dans cette sélection.
              </p>
              <p style={{ marginTop: 0, opacity: 0.9 }}>
                Essaie d’élargir tes filtres, ou partage MatchFit pour attirer du monde 👇
              </p>

              <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                <button type="button" className="btn-primary" onClick={handleShare}>
                  Partager
                </button>
                <button type="button" className="btn-ghost" onClick={handleCopy}>
                  Copier le lien
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
