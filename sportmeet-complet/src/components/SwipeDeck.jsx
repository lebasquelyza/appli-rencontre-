// sportmeet-complet/src/components/SwipeDeck.jsx
import React, { useEffect, useMemo, useState } from "react";
import { SwipeCard } from "./SwipeCard";

export function SwipeDeck({ profiles, onLikeProfile, isAuthenticated, onRequireAuth }) {
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setIndex(0);
  }, [profiles]);

  const hasProfile = index < profiles.length;
  const currentProfile = hasProfile ? profiles[index] : null;

  const next = () => setIndex((i) => i + 1);

  // ✅ Partage MatchFit (sans "gymcrush")
  const shareText = useMemo(
    () => "Je suis sur MatchFit 💪 Viens tester ! Partage à tes potes, ça peut aider 😉",
    []
  );

  const shareUrl =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "https://matchfit.app";

  const handleShare = async () => {
    const payload = { title: "MatchFit", text: shareText, url: shareUrl };

    try {
      if (navigator.share) {
        await navigator.share(payload);
        return;
      }
    } catch {
      // user cancelled -> ignore
    }

    try {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      alert("Message copié ✅");
    } catch {
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

  const isShareCard = !!currentProfile && currentProfile.__type === "share";

  // ✅ Faux profil pour réutiliser SwipeCard (même taille / même style) (sans "gymcrush")
  const shareProfileForCard = useMemo(
    () => ({
      id: currentProfile?.id || "__share",
      name: "Partage MatchFit 💪",
      age: null,
      gender: null,
      city: "Invite tes potes",
      sport: "MatchFit",
      level: "🔥",
      availability: "",
      bio:
        "Si tu veux rencontrer plus de partenaires d’entraînement, partage à tes potes… en espérant qu’ils en entendent parler 😉",
      photo_urls: [],
      isCustom: false
    }),
    [currentProfile?.id]
  );

  const handleLike = async () => {
    if (isShareCard) return; // ✅ pas de like sur la carte share

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
    if (isShareCard) {
      if (busy) return;
      next();
      return;
    }

    if (!isAuthenticated) {
      onRequireAuth?.();
      return;
    }
    if (busy) return;
    next();
  };

  // ✅ “relancer” la sélection (repart au début)
  const handleReset = () => setIndex(0);

  const hasAny = Array.isArray(profiles) && profiles.length > 0;

  return (
    <div className="swipe-container" data-swipe-deck>
      {currentProfile ? (
        <>
          {/* ✅ Carte normale OU carte "share" (même composant => même taille) */}
          {isShareCard ? (
            <SwipeCard key={shareProfileForCard.id} profile={shareProfileForCard} />
          ) : (
            <SwipeCard key={currentProfile.id} profile={currentProfile} />
          )}

          {/* ✅ Actions */}
          {!isAuthenticated && !isShareCard ? (
            <div className="actions" style={{ flexDirection: "column", gap: 10 }}>
              <p className="form-message" style={{ margin: 0 }}>
                Connecte-toi pour liker ou passer des profils.
              </p>
              <button
                type="button"
                className="btn-primary btn-sm"
                onClick={() => onRequireAuth?.()}
              >
                Se connecter
              </button>
            </div>
          ) : isShareCard ? (
            <div className="actions" style={{ justifyContent: "center", gap: 10 }}>
              <button type="button" className="btn-primary" onClick={handleShare}>
                Partager
              </button>
              <button type="button" className="btn-ghost" onClick={handleCopy}>
                Copier le lien
              </button>
              <button type="button" className="btn-ghost" onClick={next} title="Continuer">
                Continuer
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
        </>
      ) : (
        // ✅ Fin de sélection : on remet le texte d'avant + partage
        <div className="swipe-empty" style={{ textAlign: "center" }}>
          {hasAny ? (
            <>
              <p style={{ marginBottom: 6, fontWeight: 700 }}>Plus personne à te présenter 😊</p>
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
